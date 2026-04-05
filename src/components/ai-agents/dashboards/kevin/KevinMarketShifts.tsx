import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { JoinedVehicle } from "./types";

interface KevinMarketShiftsProps {
  currentVehicles: JoinedVehicle[];
}

interface ShiftItem {
  licensePlate: string;
  brand: string;
  model: string;
  rankNow: number | null;
  rankBefore: number | null;
  priceNow: number | null;
  priceBefore: number | null;
  rankChange: number | null;
  priceChange: number | null;
}

export const KevinMarketShifts: React.FC<KevinMarketShiftsProps> = ({ currentVehicles }) => {
  const { data: history } = useQuery({
    queryKey: ['kevin-market-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jpcars_market_history')
        .select('license_plate, rank_current, price_local, recorded_at')
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });

  const shifts: ShiftItem[] = React.useMemo(() => {
    if (!history || !currentVehicles.length) return [];

    // Group history by license plate, get earliest record
    const earliest = new Map<string, { rank: number | null; price: number | null }>();
    for (const h of history) {
      if (!earliest.has(h.license_plate)) {
        earliest.set(h.license_plate, { rank: h.rank_current, price: h.price_local });
      }
    }

    const items: ShiftItem[] = [];
    for (const v of currentVehicles) {
      const plate = v.license_number;
      if (!plate || plate === '-') continue;
      const old = earliest.get(plate);
      if (!old) continue;

      const rankChange = (v.rank_current != null && old.rank != null) ? v.rank_current - old.rank : null;
      const priceChange = (v.price_local != null && old.price != null) ? v.price_local - old.price : null;

      // Only show if something changed
      if ((rankChange != null && rankChange !== 0) || (priceChange != null && priceChange !== 0)) {
        items.push({
          licensePlate: plate,
          brand: v.brand,
          model: v.model,
          rankNow: v.rank_current,
          rankBefore: old.rank,
          priceNow: v.price_local,
          priceBefore: old.price,
          rankChange,
          priceChange,
        });
      }
    }

    // Sort by rank worsening (positive = worse)
    return items.sort((a, b) => (b.rankChange ?? 0) - (a.rankChange ?? 0)).slice(0, 10);
  }, [history, currentVehicles]);

  if (!shifts.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">📊 Marktshifts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Geen marktveranderingen gedetecteerd. Meer data nodig voor trendanalyse.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">📊 Marktshifts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {shifts.map(s => (
          <div key={s.licensePlate} className="flex items-center gap-3 p-2 rounded border bg-card text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium">{s.brand} {s.model}</span>
              <span className="text-muted-foreground ml-2 text-xs">{s.licensePlate}</span>
            </div>
            {s.rankChange != null && s.rankChange !== 0 && (
              <div className={`flex items-center gap-1 ${s.rankChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {s.rankChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-xs font-medium">
                  rang {s.rankBefore}→{s.rankNow}
                </span>
              </div>
            )}
            {s.priceChange != null && s.priceChange !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${s.priceChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {s.priceChange > 0 ? '+' : ''}€{s.priceChange.toLocaleString('nl-NL')}
              </div>
            )}
            {s.rankChange === 0 && s.priceChange === 0 && (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
