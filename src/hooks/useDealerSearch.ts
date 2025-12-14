import { useState, useCallback, useEffect } from 'react';
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

export interface UniqueDealer {
  name: string;
  count: number;
}

export interface DealerSearchResult {
  dealerName: string;
  searchQuery: string;
  matchedVariant: string | null;
  triedVariants: string[];
  totalVehicles: number;
  inStock: DealerVehicle[];
  sold: DealerVehicle[];
  uniqueDealers: UniqueDealer[];
  stats: {
    avgPrice: number;
    avgStockDays: number;
    soldLast30Days: number;
    topBrands: { brand: string; count: number }[];
  };
}

export interface DealerLookupResult {
  success: boolean;
  dealerName: string;
  lookupLicensePlate: string;
  totalVehicles: number;
  inStock: DealerVehicle[];
  sold: DealerVehicle[];
  stats: {
    avgPrice: number;
    avgStockDays: number;
    soldLast30Days: number;
    topBrands: { brand: string; count: number }[];
  };
  message?: string;
}

export interface RecentSearch {
  query: string;
  dealerName: string;
  matchedVariant: string | null;
  vehicleCount: number;
  timestamp: number;
  method: 'name' | 'plate';
}

const RECENT_SEARCHES_KEY = 'dealer-search-history';
const MAX_RECENT_SEARCHES = 10;

const getRecentSearches = (): RecentSearch[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (search: RecentSearch) => {
  try {
    const existing = getRecentSearches();
    // Remove duplicates by dealerName (exact JP Cars name)
    const filtered = existing.filter(s => s.dealerName !== search.dealerName);
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getRecentSearches();
  }
};

export const useDealerSearch = () => {
  const [results, setResults] = useState<DealerSearchResult | null>(null);
  const [lookupResult, setLookupResult] = useState<DealerLookupResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const searchDealer = useCallback(async (dealerName: string, includeSold = true) => {
    if (!dealerName || dealerName.trim().length < 2) {
      toast.error('Voer minimaal 2 karakters in');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);
    setLookupResult(null);

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

      const result = data as DealerSearchResult;
      setResults(result);

      // Save successful search with results
      if (result.totalVehicles > 0) {
        const newSearch: RecentSearch = {
          query: dealerName.trim(),
          dealerName: result.dealerName,
          matchedVariant: result.matchedVariant,
          vehicleCount: result.totalVehicles,
          timestamp: Date.now(),
          method: 'name',
        };
        saveRecentSearch(newSearch);
        setRecentSearches(getRecentSearches());
        toast.success(`${result.totalVehicles} voertuigen gevonden voor "${result.dealerName}"`);
      } else {
        toast.info(`Geen voertuigen gevonden voor "${dealerName}"`);
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

  const searchByLicensePlate = useCallback(async (licensePlate: string) => {
    if (!licensePlate || licensePlate.trim().length < 4) {
      toast.error('Voer een geldig kenteken in');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults(null);
    setLookupResult(null);

    try {
      console.log(`Looking up dealer via license plate: ${licensePlate}`);
      
      const { data, error: fnError } = await supabase.functions.invoke('jpcars-dealer-lookup', {
        body: { licensePlate: licensePlate.trim() }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Fout bij zoeken');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Geen resultaten gevonden');
      }

      const result = data as DealerLookupResult;
      setLookupResult(result);

      // Save successful search
      if (result.totalVehicles > 0) {
        const newSearch: RecentSearch = {
          query: licensePlate.trim(),
          dealerName: result.dealerName,
          matchedVariant: null,
          vehicleCount: result.totalVehicles,
          timestamp: Date.now(),
          method: 'plate',
        };
        saveRecentSearch(newSearch);
        setRecentSearches(getRecentSearches());
        toast.success(`Dealer "${result.dealerName}" gevonden met ${result.totalVehicles} voertuigen`);
      } else {
        toast.info('Geen dealer informatie gevonden voor dit kenteken');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout bij zoeken';
      console.error('License plate lookup error:', err);
      setError(message);
      toast.error(message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setLookupResult(null);
    setError(null);
  }, []);

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  }, []);

  return { 
    results, 
    lookupResult,
    isSearching, 
    error, 
    recentSearches,
    searchDealer, 
    searchByLicensePlate,
    reset,
    clearRecentSearches
  };
};
