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

      // Voertuigen voorraad (binnen gemeld of op voorraad)
      const { count: voorraadCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .neq("location", "onderweg")
        .in("status", ["voorraad", "verkocht_b2b", "verkocht_b2c"]);

      // Voertuigen onderweg (transport)
      const { count: transportCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .in("import_status", ["in_transit", "onderweg"]);

      // Openstaande garantieclaims
      const { count: garantieCount } = await supabase
        .from("warranty_claims")
        .select("*", { count: "exact", head: true })
        .neq("claim_status", "opgelost");

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
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
