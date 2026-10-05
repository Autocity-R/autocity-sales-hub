import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { formatNL } from "@/services/leenautoService";

interface Info { klant: string | null; sinds: string | null }

/** Eén gedeelde query: voorraadauto's die tijdelijk als leenauto dienen (+ open uitlening). */
export const useTijdelijkeLeenautos = () =>
  useQuery({
    queryKey: ["tijdelijkeLeenautos"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("loan_cars")
        .select("id, vehicle_id, leenauto_uitleningen(klant_naam, uitgeleend_op, ingeleverd_op)")
        .eq("bron", "voorraad").eq("actief", true);
      const map: Record<string, Info> = {};
      for (const r of (data || []) as any[]) {
        const open = (r.leenauto_uitleningen || []).find((u: any) => !u.ingeleverd_op);
        map[r.vehicle_id] = { klant: open?.klant_naam ?? null, sinds: open?.uitgeleend_op ?? null };
      }
      return map;
    },
  });

export const TijdelijkLeenautoBadge: React.FC<{ vehicleId: string; showDetail?: boolean }> = ({ vehicleId, showDetail }) => {
  const { data } = useTijdelijkeLeenautos();
  const info = data?.[vehicleId];
  if (!info) return null;
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 whitespace-nowrap" data-testid="tijdelijk-leenauto">
      Tijdelijk leenauto
      {info.klant && (showDetail ? ` · uitgeleend aan ${info.klant} sinds ${formatNL(info.sinds)}` : " · uitgeleend")}
    </Badge>
  );
};
