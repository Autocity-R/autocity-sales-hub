import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { categorize } from "./kevin/types";
import type { JoinedVehicle } from "./kevin/types";
import { KevinKPIStrip } from "./kevin/KevinKPIStrip";
import { KevinActionList } from "./kevin/KevinActionList";
import { KevinMarketShifts } from "./kevin/KevinMarketShifts";
import { KevinTopModels } from "./kevin/KevinTopModels";
import { KevinFullTable } from "./kevin/KevinFullTable";

export const KevinDashboard: React.FC = () => {
  const [syncing, setSyncing] = useState(false);

  const { data: jpData, refetch: refetchJp } = useQuery({
    queryKey: ['kevin-jpcars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jpcars_voorraad_monitor')
        .select('*');
      if (error) throw error;
      return data ?? [];
    }
  });

  // Deduplicate
  const uniqueJpData = useMemo(() => {
    if (!jpData) return [];
    const seen = new Map<string, typeof jpData[0]>();
    for (const j of jpData) {
      const key = j.reference_code
        ? String(j.reference_code)
        : `${j.license_plate}|${j.make}|${j.model}`;
      const existing = seen.get(key);
      if (!existing || (j.synced_at && (!existing.synced_at || j.synced_at > existing.synced_at))) {
        seen.set(key, j);
      }
    }
    return Array.from(seen.values());
  }, [jpData]);

  // Build vehicle list
  const joined: JoinedVehicle[] = useMemo(() => {
    if (!uniqueJpData.length) return [];
    return uniqueJpData.map(jp => {
      const displayPlate = jp.license_plate === 'NB' || !jp.license_plate
        ? jp.reference_code ?? '-'
        : jp.license_plate;
      const cat = categorize(jp.rank_current, jp.window_size, jp.stock_days, jp.stock_days_average, jp.price_warning);
      const priceVsMarket = (jp.price_local != null && jp.vvp_50 != null) ? jp.price_local - jp.vvp_50 : null;
      return {
        id: jp.id,
        brand: jp.make ?? '',
        model: jp.model ?? '',
        license_number: displayPlate,
        price_local: jp.price_local,
        vvp_50: jp.vvp_50,
        stock_days: jp.stock_days,
        stock_days_average: jp.stock_days_average,
        rank_current: jp.rank_current,
        window_size: jp.window_size,
        apr: jp.apr,
        etr: (jp.raw_data as any)?.apr_breakdown?.etr?.bound ?? null,
        stat_sold_count: jp.stat_sold_count,
        price_warning: jp.price_warning,
        price_history_amount_1: jp.price_history_amount_1,
        price_history_date_1: jp.price_history_date_1,
        fuel: jp.fuel,
        synced_at: jp.synced_at,
        category: cat,
        price_vs_market: priceVsMarket,
      };
    }).sort((a, b) => (b.stock_days ?? 0) - (a.stock_days ?? 0));
  }, [uniqueJpData]);

  const redVehicles = useMemo(() => joined.filter(v => v.category === 'red'), [joined]);
  const yellowVehicles = useMemo(() => joined.filter(v => v.category === 'yellow'), [joined]);
  const greenVehicles = useMemo(() => joined.filter(v => v.category === 'green'), [joined]);

  const avgStockDays = joined.length > 0
    ? Math.round(joined.filter(v => v.stock_days != null).reduce((s, v) => s + v.stock_days!, 0) / Math.max(joined.filter(v => v.stock_days != null).length, 1))
    : 0;

  const lastSync = jpData?.[0]?.synced_at ?? null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke('jpcars-sync');
      if (res.error) throw res.error;
      const body = res.data;
      if (body?.success) {
        toast.success(`${body.synced} voertuigen gesynchroniseerd`);
        refetchJp();
      } else {
        toast.error(`Sync fout: ${body?.error ?? 'Onbekend'}`);
      }
    } catch (err: any) {
      toast.error(`Sync mislukt: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCSVExport = () => {
    if (!joined.length) return;
    const headers = ['Merk', 'Model', 'Kenteken', 'Stagedagen', 'Markt Gem.', 'Online Prijs', 'VVP50', 'Verschil', 'Rang', 'Concurrenten', 'APR', 'Prijsadvies', 'Verkocht', 'Brandstof', 'Categorie'];
    const rows = joined.map(v => [
      v.brand, v.model, v.license_number ?? '',
      v.stock_days ?? '', v.stock_days_average ?? '',
      v.price_local ?? '', v.vvp_50 ?? '', v.price_vs_market ?? '',
      v.rank_current ?? '', v.window_size ?? '',
      v.apr ?? '', v.price_warning ?? '',
      v.stat_sold_count ?? '', v.fuel ?? '', v.category
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kevin-voorraad-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <KevinKPIStrip
        totalCount={joined.length}
        avgStockDays={avgStockDays}
        redCount={redVehicles.length}
        yellowCount={yellowVehicles.length}
        greenCount={greenVehicles.length}
        lastSync={lastSync}
        syncing={syncing}
        onSync={handleSync}
        onCSVExport={handleCSVExport}
      />

      <KevinActionList
        redVehicles={redVehicles}
        yellowVehicles={yellowVehicles}
        greenVehicles={greenVehicles}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KevinMarketShifts currentVehicles={joined} />
        <KevinTopModels />
      </div>

      <KevinFullTable vehicles={joined} />
    </div>
  );
};
