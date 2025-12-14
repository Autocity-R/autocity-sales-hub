import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DealerVehicle {
  licensePlate: string;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  price: number;
  stockDays: number;
  soldSince: number | null;
  fuel: string;
  body: string;
  url: string;
  clicks: number;
  apr: number;
}

export interface DealerSearchResult {
  dealerName: string;
  searchQuery: string;
  totalVehicles: number;
  inStock: DealerVehicle[];
  sold: DealerVehicle[];
  stats: {
    avgPrice: number;
    avgStockDays: number;
    soldLast30Days: number;
    topBrands: { brand: string; count: number }[];
  };
}

export const useDealerSearch = () => {
  const [results, setResults] = useState<DealerSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDealer = useCallback(async (dealerName: string, includeSold = true) => {
    if (!dealerName || dealerName.trim().length < 2) {
      toast.error('Voer minimaal 2 karakters in');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      console.log(`Searching for dealer: ${dealerName}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('jpcars-dealer-search', {
        body: { dealerName: dealerName.trim(), includeSold }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Fout bij zoeken');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResults(data as DealerSearchResult);

      if (data.totalVehicles === 0) {
        toast.info(`Geen voertuigen gevonden voor "${dealerName}"`);
      } else {
        toast.success(`${data.totalVehicles} voertuigen gevonden voor "${data.dealerName}"`);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout bij zoeken';
      console.error('Dealer search error:', err);
      setError(message);
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { 
    results, 
    isSearching, 
    error, 
    searchDealer, 
    reset 
  };
};
