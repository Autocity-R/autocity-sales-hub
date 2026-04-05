import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface FastMover {
  make: string;
  model: string;
  avgDays: number;
  etr: number;
  count: number;
}

export const KevinTopModels: React.FC = () => {
  const { data: fastMovers } = useQuery({
    queryKey: ['kevin-top-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxatie_valuations')
        .select('jpcars_data')
        .not('jpcars_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      // Aggregate by make+model, find high ETR models
      const modelMap = new Map<string, { totalDays: number; totalEtr: number; count: number; make: string; model: string }>();

      for (const row of data ?? []) {
        const jp = row.jpcars_data as any;
        if (!jp || !jp.etr || !jp.window) continue;

        // Get make/model from first window entry or top-level
        const make = jp.window?.[0]?.make ?? 'Onbekend';
        const model = jp.window?.[0]?.model ?? 'Onbekend';
        const key = `${make}|${model}`;
        const avgDays = jp.window
          ? jp.window.filter((w: any) => w.days_in_stock != null).reduce((s: number, w: any) => s + w.days_in_stock, 0) / Math.max(jp.window.filter((w: any) => w.days_in_stock != null).length, 1)
          : 0;

        const existing = modelMap.get(key);
        if (existing) {
          existing.totalDays += avgDays;
          existing.totalEtr += jp.etr;
          existing.count += 1;
        } else {
          modelMap.set(key, { totalDays: avgDays, totalEtr: jp.etr, count: 1, make, model });
        }
      }

      const models: FastMover[] = Array.from(modelMap.values())
        .map(m => ({
          make: m.make,
          model: m.model,
          avgDays: Math.round(m.totalDays / m.count),
          etr: Math.round((m.totalEtr / m.count) * 10) / 10,
          count: m.count,
        }))
        .filter(m => m.etr >= 3 && m.avgDays > 0)
        .sort((a, b) => b.etr - a.etr)
        .slice(0, 8);

      return models;
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">📈 Top Inkoopkansen (Fast Movers)</CardTitle>
      </CardHeader>
      <CardContent>
        {(!fastMovers || fastMovers.length === 0) ? (
          <p className="text-sm text-muted-foreground">Geen fast mover data beschikbaar.</p>
        ) : (
          <div className="space-y-2">
            {fastMovers.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded border bg-card text-sm">
                <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{m.make} {m.model}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-green-600">ETR {m.etr}</div>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-xs text-muted-foreground">gem {m.avgDays} dagen</div>
                </div>
                <div className="text-right min-w-[50px]">
                  <div className="text-xs text-muted-foreground">{m.count}x</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
