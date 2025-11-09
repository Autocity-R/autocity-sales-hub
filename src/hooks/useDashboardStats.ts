import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Voertuigen binnen (alle binnengemelde voertuigen, niet onderweg, niet afgeleverd)
      const { count: voorraadCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .not("details", "cs", JSON.stringify({ transportStatus: "onderweg" }))
        .neq("status", "afgeleverd");

      // Voertuigen onderweg (in transport menu, nog niet binnengemeld)
      const { count: transportCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .contains("details", { transportStatus: "onderweg" })
        .neq("status", "afgeleverd");

      // Openstaande garantieclaims
      const { count: garantieCount } = await supabase
        .from("warranty_claims")
        .select("*", { count: "exact", head: true })
        .neq("claim_status", "resolved");

      // Verkocht deze maand
      const { count: verkochtCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .in("status", ["verkocht_b2b", "verkocht_b2c", "afgeleverd"])
        .gte("sold_date", monthStart)
        .lte("sold_date", monthEnd);

      return {
        voorraad: voorraadCount || 0,
        transport: transportCount || 0,
        garantie: garantieCount || 0,
        verkocht: verkochtCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // No auto-refetch
    refetchOnWindowFocus: false,
  });
};
