import { useState, useCallback } from 'react';
import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
  AITaxatieAdvice,
  TaxatieLoadingState,
  TaxatieFeedback,
  TaxatieInputMode,
} from '@/types/taxatie';
import {
  lookupRDW,
  fetchPortalAnalysis,
  fetchJPCarsData,
  fetchInternalComparison,
  generateAIAdvice,
  saveTaxatieFeedback,
} from '@/services/taxatieService';
import { toast } from 'sonner';

export const useTaxatie = () => {
  // Input mode
  const [inputMode, setInputMode] = useState<TaxatieInputMode>('kenteken');
  
  // Vehicle data
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleData, setVehicleData] = useState<TaxatieVehicleData | null>(null);
  const [enteredMileage, setEnteredMileage] = useState(0); // Separate state for mileage input
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Data bronnen
  const [portalAnalysis, setPortalAnalysis] = useState<PortalAnalysis | null>(null);
  const [jpCarsData, setJpCarsData] = useState<JPCarsData | null>(null);
  const [internalComparison, setInternalComparison] = useState<InternalComparison | null>(null);
  const [aiAdvice, setAiAdvice] = useState<AITaxatieAdvice | null>(null);

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

  // RDW lookup (voor Nederlandse kentekens)
  const handleLicensePlateSearch = useCallback(async () => {
    if (!licensePlate.trim()) {
      toast.error('Vul een kenteken in');
      return;
    }

    setLoading(prev => ({ ...prev, rdw: true }));
    try {
      const data = await lookupRDW(licensePlate);
      if (data) {
        // Preserve user-entered mileage after RDW lookup
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

  // Handmatige invoer (voor buitenlandse voertuigen)
  const handleManualVehicleSubmit = useCallback((data: TaxatieVehicleData) => {
    setVehicleData(data);
    setEnteredMileage(data.mileage);
    toast.success('Voertuiggegevens toegevoegd');
  }, []);

  // JP Cars catalogus builder (gegarandeerd werkend)
  const handleJPCarsVehicleSubmit = useCallback((data: TaxatieVehicleData) => {
    setVehicleData({
      ...data,
      // Mark as JP Cars native - no mapping needed
    });
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

  // Update full vehicle data (for inline editing)
  const updateVehicleData = useCallback((updatedData: TaxatieVehicleData) => {
    setVehicleData(updatedData);
    // Sync mileage state
    if (updatedData.mileage !== enteredMileage) {
      setEnteredMileage(updatedData.mileage);
    }
  }, [enteredMileage]);

  // Start volledige taxatie - WATERDICHT met Promise.allSettled
  const startTaxatie = useCallback(async () => {
    if (!vehicleData) {
      toast.error('Eerst voertuiggegevens invoeren');
      return;
    }

    if (vehicleData.mileage <= 0) {
      toast.error('Vul eerst de kilometerstand in');
      return;
    }

    // Transmissie is verplicht
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

    // Reset previous data
    setPortalAnalysis(null);
    setJpCarsData(null);
    setInternalComparison(null);
    setAiAdvice(null);

    try {
      // STAP 1: Eerst JP Cars ophalen (deze geeft portal URLs terug)
      setLoading(prev => ({
        ...prev,
        jpCars: true,
        internalHistory: true,
      }));

      // JP Cars en interne data parallel ophalen
      const [jpResult, internalResult] = await Promise.allSettled([
        fetchJPCarsData(licensePlate || '', vehicleWithOptions),
        fetchInternalComparison(vehicleWithOptions),
      ]);

      // JP Cars data verwerken (we hebben de URLs nodig voor portal search)
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
        toast.warning('JP Cars data niet beschikbaar - taxatie doorgegaan met portaaldata');
      }

      setJpCarsData(jpData);
      setLoading(prev => ({ ...prev, jpCars: false, portals: true }));

      // STAP 2: Portal analyse met JP Cars URLs en Window data
      console.log('🔗 JP Cars portal URLs:', jpData.portalUrls);
      console.log('📊 JP Cars window items:', jpData.window?.length || 0);
      const [portalResult] = await Promise.allSettled([
        fetchPortalAnalysis(vehicleWithOptions, jpData.portalUrls, jpData.window),
      ]);

      // Portal data verwerken
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
            logicalDeviations: ['Portaalanalyse mislukt - controleer verbinding'],
          };
      
      if (portalResult.status === 'rejected') {
        console.error('❌ Portal analysis failed:', portalResult.reason);
        toast.warning('Portaalanalyse niet volledig beschikbaar');
      }

      // Internal data - OPTIONEEL
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

      if (internalResult.status === 'rejected') {
        console.error('❌ Internal comparison failed:', internalResult.reason);
      }

      setPortalAnalysis(portalData);
      setInternalComparison(internalData);

      setLoading(prev => ({
        ...prev,
        portals: false,
        jpCars: false,
        internalHistory: false,
        aiAnalysis: true,
      }));

      // AI analyse - altijd proberen, met fallback in de service
      const advice = await generateAIAdvice(vehicleWithOptions, portalData, jpData, internalData);
      setAiAdvice(advice);

      setLoading(prev => ({ ...prev, aiAnalysis: false }));
      setTaxatieComplete(true);
      
      // Status meldingen
      const warnings: string[] = [];
      if (portalResult.status === 'rejected') warnings.push('portaaldata');
      if (jpResult.status === 'rejected') warnings.push('JP Cars');
      if (internalResult.status === 'rejected') warnings.push('interne historie');
      
      if (warnings.length > 0) {
        toast.warning(`Taxatie voltooid (zonder ${warnings.join(', ')})`);
      } else if (advice.reasoning.includes('⚠️ AI advies niet beschikbaar')) {
        toast.warning('AI advies niet beschikbaar - automatische berekening getoond');
      } else {
        toast.success('Taxatie voltooid');
      }
    } catch (error) {
      console.error('❌ Taxatie error:', error);
      toast.error('Fout bij taxatie - probeer opnieuw');
      setLoading({
        rdw: false,
        portals: false,
        jpCars: false,
        internalHistory: false,
        aiAnalysis: false,
      });
    }
  }, [vehicleData, selectedOptions, keywords, licensePlate]);

  // Feedback geven
  const submitFeedback = useCallback(async (feedback: TaxatieFeedback) => {
    try {
      await saveTaxatieFeedback('current-valuation-id', feedback);
      toast.success('Feedback opgeslagen');
    } catch (error) {
      toast.error('Fout bij opslaan feedback');
    }
  }, []);

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
    setAiAdvice(null);
    setTaxatieStarted(false);
    setTaxatieComplete(false);
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
    aiAdvice,
    loading,
    taxatieStarted,
    taxatieComplete,

    // Actions
    handleLicensePlateSearch,
    handleManualVehicleSubmit,
    handleJPCarsVehicleSubmit,
    toggleOption,
    startTaxatie,
    submitFeedback,
    resetTaxatie,
    updateVehicleMileage,
    updateVehicleData,
  };
};
