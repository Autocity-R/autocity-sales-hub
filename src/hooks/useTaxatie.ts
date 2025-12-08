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
    toast.success('Voertuiggegevens toegevoegd');
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

  // Start volledige taxatie
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
      // Parallel fetch: Portalen, JP Cars, Interne historie
      setLoading(prev => ({
        ...prev,
        portals: true,
        jpCars: true,
        internalHistory: true,
      }));

      const [portalData, jpData, internalData] = await Promise.all([
        fetchPortalAnalysis(vehicleWithOptions),
        fetchJPCarsData(licensePlate || '', vehicleWithOptions),
        fetchInternalComparison(vehicleWithOptions),
      ]);

      setPortalAnalysis(portalData);
      setJpCarsData(jpData);
      setInternalComparison(internalData);

      setLoading(prev => ({
        ...prev,
        portals: false,
        jpCars: false,
        internalHistory: false,
        aiAnalysis: true,
      }));

      // AI analyse
      const advice = await generateAIAdvice(vehicleWithOptions, portalData, jpData, internalData);
      setAiAdvice(advice);

      setLoading(prev => ({ ...prev, aiAnalysis: false }));
      setTaxatieComplete(true);
      
      // Check if fallback was used
      if (advice.reasoning.includes('⚠️ AI advies niet beschikbaar')) {
        toast.warning('AI advies niet beschikbaar - automatische berekening getoond');
      } else {
        toast.success('Taxatie voltooid');
      }
    } catch (error) {
      toast.error('Fout bij taxatie');
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
    toggleOption,
    startTaxatie,
    submitFeedback,
    resetTaxatie,
    updateVehicleMileage,
    updateVehicleData,
  };
};
