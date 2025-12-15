import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchCompetitorDealers,
  createCompetitorDealer,
  updateCompetitorDealer,
  deleteCompetitorDealer,
  fetchCompetitorVehicles,
  fetchCompetitorStats,
  fetchScrapeLogs,
  triggerDealerScrape,
} from '@/services/competitorService';
import type { CompetitorDealer, CompetitorVehicleFilters } from '@/types/competitor';

export function useCompetitorDealers() {
  const queryClient = useQueryClient();

  const { data: dealers = [], isLoading, error } = useQuery({
    queryKey: ['competitor-dealers'],
    queryFn: fetchCompetitorDealers,
  });

  const addDealerMutation = useMutation({
    mutationFn: createCompetitorDealer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-dealers'] });
      toast.success('Dealer toegevoegd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij toevoegen: ${error.message}`);
    },
  });

  const updateDealerMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CompetitorDealer> }) =>
      updateCompetitorDealer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-dealers'] });
      toast.success('Dealer bijgewerkt');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij bijwerken: ${error.message}`);
    },
  });

  const deleteDealerMutation = useMutation({
    mutationFn: deleteCompetitorDealer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-dealers'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-vehicles'] });
      toast.success('Dealer verwijderd');
    },
    onError: (error: Error) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
    },
  });

  const scrapeDealerMutation = useMutation({
    mutationFn: triggerDealerScrape,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['competitor-dealers'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-scrape-logs'] });
      if (result.success) {
        toast.success(result.message || 'Scrape voltooid');
      } else {
        toast.error(result.message || 'Scrape mislukt');
      }
    },
    onError: (error: Error) => {
      toast.error(`Scrape fout: ${error.message}`);
    },
  });

  return {
    dealers,
    isLoading,
    error,
    addDealer: addDealerMutation.mutate,
    updateDealer: updateDealerMutation.mutate,
    deleteDealer: deleteDealerMutation.mutate,
    scrapeDealer: scrapeDealerMutation.mutate,
    isAddingDealer: addDealerMutation.isPending,
    isScraping: scrapeDealerMutation.isPending,
  };
}

export function useCompetitorVehicles(filters: CompetitorVehicleFilters = {}) {
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ['competitor-vehicles', filters],
    queryFn: () => fetchCompetitorVehicles(filters),
  });

  return { vehicles, isLoading, error };
}

export function useCompetitorStats(dealerId?: string) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['competitor-stats', dealerId],
    queryFn: () => fetchCompetitorStats(dealerId),
  });

  return { stats, isLoading, error };
}

export function useCompetitorScrapeLogs(dealerId?: string) {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['competitor-scrape-logs', dealerId],
    queryFn: () => fetchScrapeLogs(dealerId),
  });

  return { logs, isLoading, error };
}
