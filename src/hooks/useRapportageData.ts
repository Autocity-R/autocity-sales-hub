import { useQuery } from "@tanstack/react-query";
import { fetchRapportageRaw, type RapBranch, type RapPeriod } from "@/services/rapportageService";

export function useRapportageData(period: RapPeriod, branch: RapBranch) {
  return useQuery({
    queryKey: ["rapportage-raw", period, branch],
    queryFn: () => fetchRapportageRaw(period, branch),
    staleTime: 2 * 60 * 1000,
  });
}
