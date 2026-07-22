import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpenWO {
  vehicle_id: string;
  discipline: string;
  status: string;
}

/** Haalt alle open werkorders 1x op en groepeert per vehicle_id. */
export const useOpenWorkOrdersMap = () => {
  return useQuery({
    queryKey: ["open-work-orders-map"],
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, OpenWO[]>> => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("vehicle_id, discipline, status")
        .not("status", "in", "(goedgekeurd,geannuleerd)");
      if (error) throw error;
      const map: Record<string, OpenWO[]> = {};
      for (const w of (data as any[]) || []) {
        (map[w.vehicle_id] ||= []).push(w as OpenWO);
      }
      return map;
    },
  });
};

export const summariseWOs = (list?: OpenWO[]) => {
  if (!list || list.length === 0) return null;
  const hasBezig = list.some(w => w.status === "bezig");
  const hasIngepland = list.some(w => w.status === "ingepland" || w.status === "aangevraagd");
  const hasAfgerond = list.some(w => w.status === "afgerond");
  if (hasBezig) return { label: "bezig", icon: "🔧", cls: "bg-amber-100 text-amber-800 border-amber-300" };
  if (hasIngepland) return { label: "gepland", icon: "🎨", cls: "bg-blue-100 text-blue-800 border-blue-300" };
  if (hasAfgerond) return { label: "gereed", icon: "✓", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  return null;
};