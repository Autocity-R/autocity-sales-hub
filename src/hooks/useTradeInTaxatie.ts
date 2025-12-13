import { useState, useCallback } from 'react';
import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
  TaxatieLoadingState,
  TaxatieInputMode,
} from '@/types/taxatie';
import {
  lookupRDW,
  fetchPortalAnalysis,
  fetchJPCarsData,
  fetchInternalComparison,
  saveTaxatieValuation,
} from '@/services/taxatieService';
import { generateTradeInAdvice, TradeInAdvice } from '@/services/tradeInTaxatieService';
import { toast } from 'sonner';

export const useTradeInTaxatie = () => {
  // Input mode
  const [inputMode, setInputMode] = useState<TaxatieInputMode>('kenteken');
  
  // Vehicle data
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleData, setVehicleData] = useState<TaxatieVehicleData | null>(null);
  const [enteredMileage, setEnteredMileage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Data bronnen
  const [portalAnalysis, setPortalAnalysis] = useState<PortalAnalysis | null>(null);
  const [jpCarsData, setJpCarsData] = useState<JPCarsData | null>(null);
  const [internalComparison, setInternalComparison] = useState<InternalComparison | null>(null);
  const [tradeInAdvice, setTradeInAdvice] = useState<TradeInAdvice | null>(null);

  // Loading states
  const [loading, setLoading] = useState<TaxatieLoadingState>({
    rdw: false,
    portals: false,
    jpCars: false,
    internalHistory: false,
    aiAnalysis: false,
  });

  // Taxatie status
  const [taxatieStarted, setTaxatieStarted] = useState(false);
  const [taxatieComplete, setTaxatieComplete] = useState(false);
  
  // Track saved valuation ID
  const [currentValuationId, setCurrentValuationId] = useState<string | null>(null);

  // RDW lookup
  const handleLicensePlateSearch = useCallback(async () => {
    if (!licensePlate.trim()) {
      toast.error('Vul een kenteken in');
      return;
    }

    setLoading(prev => ({ ...prev, rdw: true }));
    try {
      const data = await lookupRDW(licensePlate);
      if (data) {
        setVehicleData({ ...data, mileage: enteredMileage || data.mileage });
        toast.success('Voertuiggegevens opgehaald');
      } else {
        toast.error('Kenteken niet gevonden');
      }
    } catch (error) {
      toast.error('Fout bij ophalen voertuiggegevens');
    } finally {
      setLoading(prev => ({ ...prev, rdw: false }));
    }
  }, [licensePlate, enteredMileage]);

  // Handmatige invoer
  const handleManualVehicleSubmit = useCallback((data: TaxatieVehicleData) => {
    setVehicleData(data);
    setEnteredMileage(data.mileage);
    toast.success('Voertuiggegevens toegevoegd');
  }, []);

  // JP Cars catalogus
  const handleJPCarsVehicleSubmit = useCallback((data: TaxatieVehicleData) => {
    setVehicleData({ ...data });
    setEnteredMileage(data.mileage);
    setInputMode('jpcars');
    toast.success('Voertuig geladen via JP Cars catalogus');
  }, []);

  // Toggle optie
  const toggleOption = useCallback((optionId: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionId) ? prev.filter(o => o !== optionId) : [...prev, optionId]
    );
  }, []);

  // Update vehicle mileage
  const updateVehicleMileage = useCallback((mileage: number) => {
    setEnteredMileage(mileage);
    if (vehicleData) {
      setVehicleData({ ...vehicleData, mileage });
    }
  }, [vehicleData]);

  // Update full vehicle data
  const updateVehicleData = useCallback((updatedData: TaxatieVehicleData) => {
    setVehicleData(updatedData);
    if (updatedData.mileage !== enteredMileage) {
      setEnteredMileage(updatedData.mileage);
    }
  }, [enteredMileage]);

  // Start inruil taxatie
  const startTaxatie = useCallback(async () => {
    if (!vehicleData) {
      toast.error('Eerst voertuiggegevens invoeren');
      return;
    }

    if (vehicleData.mileage <= 0) {
      toast.error('Vul eerst de kilometerstand in');
      return;
    }

    if (!vehicleData.transmission || vehicleData.transmission === 'Onbekend') {
      toast.error('Selecteer eerst de transmissie (Automaat of Handgeschakeld)');
      return;
    }

    const vehicleWithOptions: TaxatieVehicleData = {
      ...vehicleData,
      options: selectedOptions,
      keywords: keywords,
    };

    setTaxatieStarted(true);
    setTaxatieComplete(false);
    setCurrentValuationId(null);

    // Reset previous data
    setPortalAnalysis(null);
    setJpCarsData(null);
    setInternalComparison(null);
    setTradeInAdvice(null);

    try {
      // STAP 1: JP Cars + Internal ophalen
      setLoading(prev => ({
        ...prev,
        jpCars: true,
        internalHistory: true,
      }));

      const [jpResult, internalResult] = await Promise.allSettled([
        fetchJPCarsData(licensePlate || '', vehicleWithOptions),
        fetchInternalComparison(vehicleWithOptions),
      ]);

      const jpData = jpResult.status === 'fulfilled'
        ? jpResult.value
        : {
            baseValue: 0,
            optionValue: 0,
            totalValue: 0,
            range: { min: 0, max: 0 },
            confidence: 0,
            apr: 0,
            etr: 30,
            courantheid: 'gemiddeld' as const,
          };
      
      if (jpResult.status === 'rejected') {
        console.error('❌ JP Cars lookup failed:', jpResult.reason);
        toast.warning('JP Cars data niet beschikbaar');
      }

      setJpCarsData(jpData);
      setLoading(prev => ({ ...prev, jpCars: false, portals: true }));

      // STAP 2: Portal analyse
      const [portalResult] = await Promise.allSettled([
        fetchPortalAnalysis(vehicleWithOptions, jpData.portalUrls, jpData.window),
      ]);

      const portalData = portalResult.status === 'fulfilled' 
        ? portalResult.value 
        : {
            lowestPrice: 0,
            medianPrice: 0,
            highestPrice: 0,
            listingCount: 0,
            primaryComparableCount: 0,
            appliedFilters: {} as any,
            listings: [],
            logicalDeviations: ['Portaalanalyse mislukt'],
          };
      
      if (portalResult.status === 'rejected') {
        console.error('❌ Portal analysis failed:', portalResult.reason);
      }

      const internalData = internalResult.status === 'fulfilled'
        ? internalResult.value
        : {
            averageMargin: 0,
            averageDaysToSell: 0,
            soldLastYear: 0,
            soldB2C: 0,
            soldB2B: 0,
            averageDaysToSell_B2C: null,
            note: 'Interne data niet beschikbaar',
            similarVehicles: [],
          };

      setPortalAnalysis(portalData);
      setInternalComparison(internalData);

      setLoading(prev => ({
        ...prev,
        portals: false,
        jpCars: false,
        internalHistory: false,
        aiAnalysis: true,
      }));

      // STAP 3: Inruil AI advies genereren via aparte edge function
      const advice = await generateTradeInAdvice(vehicleWithOptions, portalData, jpData, internalData);
      setTradeInAdvice(advice);

      setLoading(prev => ({ ...prev, aiAnalysis: false }));
      setTaxatieComplete(true);
      
      // AUTO-SAVE met taxatie_type 'inruil'
      console.log('💾 Auto-saving inruil valuation...');
      const savedValuation = await saveTaxatieValuation({
        licensePlate: licensePlate || undefined,
        vehicleData: vehicleWithOptions,
        portalAnalysis: portalData,
        jpCarsData: jpData,
        internalComparison: internalData,
        aiAdvice: advice as any, // Store trade-in advice in ai_advice field
        status: 'voltooid',
      });
      
      if (savedValuation?.id) {
        setCurrentValuationId(savedValuation.id);
        console.log('✅ Inruil valuation saved with ID:', savedValuation.id);
      }
      
      toast.success('Inruil taxatie voltooid');
    } catch (error) {
      console.error('❌ Inruil taxatie error:', error);
      toast.error('Fout bij inruil taxatie - probeer opnieuw');
      setLoading({
        rdw: false,
        portals: false,
        jpCars: false,
        internalHistory: false,
        aiAnalysis: false,
      });
    }
  }, [vehicleData, selectedOptions, keywords, licensePlate]);

  // Reset alles
  const resetTaxatie = useCallback(() => {
    setInputMode('kenteken');
    setLicensePlate('');
    setVehicleData(null);
    setEnteredMileage(0);
    setSelectedOptions([]);
    setKeywords([]);
    setPortalAnalysis(null);
    setJpCarsData(null);
    setInternalComparison(null);
    setTradeInAdvice(null);
    setTaxatieStarted(false);
    setTaxatieComplete(false);
    setCurrentValuationId(null);
  }, []);

  return {
    // Input mode
    inputMode,
    setInputMode,
    
    // State
    licensePlate,
    setLicensePlate,
    vehicleData,
    setVehicleData,
    selectedOptions,
    keywords,
    setKeywords,
    portalAnalysis,
    jpCarsData,
    internalComparison,
    tradeInAdvice,
    loading,
    taxatieStarted,
    taxatieComplete,
    enteredMileage,
    currentValuationId,

    // Actions
    handleLicensePlateSearch,
    handleManualVehicleSubmit,
    handleJPCarsVehicleSubmit,
    toggleOption,
    startTaxatie,
    resetTaxatie,
    updateVehicleMileage,
    updateVehicleData,
  };
};
