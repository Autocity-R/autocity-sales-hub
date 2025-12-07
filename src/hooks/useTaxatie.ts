import { useState, useCallback } from 'react';
import type {
  TaxatieVehicleData,
  PortalAnalysis,
  JPCarsData,
  InternalComparison,
  AITaxatieAdvice,
  TaxatieLoadingState,
  TaxatieFeedback,
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
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleData, setVehicleData] = useState<TaxatieVehicleData | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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
        setVehicleData(data);
        toast.success('Voertuiggegevens opgehaald');
      } else {
        toast.error('Kenteken niet gevonden');
      }
    } catch (error) {
      toast.error('Fout bij ophalen voertuiggegevens');
    } finally {
      setLoading(prev => ({ ...prev, rdw: false }));
    }
  }, [licensePlate]);

  // Toggle optie
  const toggleOption = useCallback((option: string) => {
    setSelectedOptions(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  }, []);

  // Start volledige taxatie
  const startTaxatie = useCallback(async () => {
    if (!vehicleData) {
      toast.error('Eerst voertuiggegevens ophalen');
      return;
    }

    const vehicleWithOptions: TaxatieVehicleData = {
      ...vehicleData,
      options: selectedOptions,
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
        fetchJPCarsData(licensePlate),
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
      toast.success('Taxatie voltooid');
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
  }, [vehicleData, selectedOptions, licensePlate]);

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
    setLicensePlate('');
    setVehicleData(null);
    setSelectedOptions([]);
    setPortalAnalysis(null);
    setJpCarsData(null);
    setInternalComparison(null);
    setAiAdvice(null);
    setTaxatieStarted(false);
    setTaxatieComplete(false);
  }, []);

  return {
    // State
    licensePlate,
    setLicensePlate,
    vehicleData,
    setVehicleData,
    selectedOptions,
    portalAnalysis,
    jpCarsData,
    internalComparison,
    aiAdvice,
    loading,
    taxatieStarted,
    taxatieComplete,

    // Actions
    handleLicensePlateSearch,
    toggleOption,
    startTaxatie,
    submitFeedback,
    resetTaxatie,
  };
};
