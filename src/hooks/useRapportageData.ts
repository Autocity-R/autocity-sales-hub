import { useQuery } from "@tanstack/react-query";
import { fetchRapportageRaw, type RapBranch, type RapSelection } from "@/services/rapportageService";

export function useRapportageData(sel: RapSelection, branch: RapBranch) {
  return useQuery({
    queryKey: ["rapportage-raw", sel.period, sel.customFrom || "", sel.customTo || "", branch],
    queryFn: () => fetchRapportageRaw(sel, branch),
    staleTime: 2 * 60 * 1000,
  });
}
