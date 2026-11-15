import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { laatsteOrderPerClaim, type ClaimWerkorder } from "@/lib/claimWerkplaatsStatus";

export const CLAIM_WERKORDERS_KEY = ["claimWerkorders"] as const;

/**
 * Eén query voor ALLE claim-werkorders (work_orders met warranty_claim_id, zonder geannuleerd) — geen N+1.
 * live=true (alleen op het garantiemenu): elke 60 s verversen zolang het tabblad zichtbaar is.
 * Andere plekken delen dezelfde cache zonder eigen interval.
 */
export function useClaimWerkorders({ live = false }: { live?: boolean } = {}) {
  const q = useQuery({
    queryKey: CLAIM_WERKORDERS_KEY,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: live ? 60_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ClaimWerkorder[]> => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, warranty_claim_id, status, created_at, planned_at, started_at, paused_at, pause_reason, finished_at, approved_at, assigned_to, description, is_rush, branch, assignee:profiles!work_orders_assigned_to_fkey(first_name, last_name)")
        .not("warranty_claim_id", "is", null)
        .neq("status", "geannuleerd");
      if (error) throw error;
      return ((data as any[]) || []).map((r) => {
        const a = r.assignee;
        const naam = a ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : "";
        const { assignee, ...rest } = r;
        return { ...rest, assigned_name: naam || null } as ClaimWerkorder;
      });
    },
  });
  const perClaim = useMemo(() => laatsteOrderPerClaim(q.data || []), [q.data]);
  return { ...q, perClaim };
}
