import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Eye, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface JoinedVehicle {
  id: string;
  brand: string;
  model: string;
  license_number: string | null;
  price_local: number | null;
  vvp_50: number | null;
  stock_days: number | null;
  stock_days_average: number | null;
  rank_current: number | null;
  window_size: number | null;
  apr: number | null;
  etr: number | null;
  stat_sold_count: number | null;
  price_warning: number | null;
  price_history_amount_1: number | null;
  price_history_date_1: string | null;
  fuel: string | null;
  synced_at: string | null;
  category: 'red' | 'yellow' | 'green';
  price_vs_market: number | null;
}

function categorize(rank: number | null, windowSize: number | null, stockDays: number | null, stockAvg: number | null, priceWarning: number | null): 'red' | 'yellow' | 'green' {
  // Rang 1 = goedkoopst (goed), hoge rang = duurste positie (slecht)
  // Gebruik rang als percentage van window_size
  const rankPct = (rank !== null && windowSize !== null && windowSize > 0) ? rank / windowSize : null;

  // Rood: duurste segment, hoge price_warning, of lang op voorraad
  if (rankPct !== null && rankPct > 0.8) return 'red';
  if (priceWarning !== null && priceWarning > 2000) return 'red';
  if (stockDays !== null && stockAvg !== null && stockAvg > 0 && stockDays > stockAvg * 1.3) return 'red';

  // Geel: onderste helft maar niet kritiek
  if (rankPct !== null && rankPct > 0.5) return 'yellow';
  if (priceWarning !== null && priceWarning > 500) return 'yellow';
  if (stockDays !== null && stockAvg !== null && stockAvg > 0 && stockDays > stockAvg) return 'yellow';

  // Groen: goed gepositioneerd of price_warning negatief (kan omhoog)
  return 'green';
}

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

  // Deduplicate JP Cars data
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

  // Build vehicle list directly from JP Cars data
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

  const redCount = joined.filter(v => v.category === 'red').length;
  const yellowCount = joined.filter(v => v.category === 'yellow').length;
  const greenCount = joined.filter(v => v.category === 'green').length;
  const lastSync = jpData?.[0]?.synced_at;

  const rankedVehicles = joined.filter(v => v.rank_current != null);
  const avgRank = rankedVehicles.length > 0
    ? (rankedVehicles.reduce((sum, v) => sum + v.rank_current!, 0) / rankedVehicles.length).toFixed(1)
    : null;

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
    const headers = ['Merk', 'Model', 'Kenteken', 'Stagedagen', 'Markt Gem.', 'Online Prijs', 'VVP50', 'Verschil', 'Rang', 'Concurrenten', 'APR', 'ETR', 'Prijsadvies', 'Verkocht', 'Brandstof', 'Categorie'];
    const rows = joined.map(v => [
      v.brand, v.model, v.license_number ?? '',
      v.stock_days ?? '', v.stock_days_average ?? '',
      v.price_local ?? '', v.vvp_50 ?? '', v.price_vs_market ?? '',
      v.rank_current ?? '', v.window_size ?? '',
      v.apr ?? '', v.etr ?? '', v.price_warning ?? '',
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

  const categoryBadge = (cat: 'red' | 'yellow' | 'green') => {
    if (cat === 'red') return <Badge className="bg-red-500 text-white">Actie</Badge>;
    if (cat === 'yellow') return <Badge className="bg-yellow-500 text-white">Let op</Badge>;
    return <Badge className="bg-green-500 text-white">Goed</Badge>;
  };

  const formatPrice = (n: number | null) => n != null ? `€${n.toLocaleString('nl-NL')}` : '-';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" /> Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{joined.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" /> Gem. Rang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRank ?? '-'}</div>
            <p className="text-xs text-muted-foreground">{rankedVehicles.length} met data</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Actie vereist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{redCount}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" /> Let op
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{yellowCount}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Goed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{greenCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Laatste sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastSync ? format(new Date(lastSync), 'dd MMM HH:mm', { locale: nl }) : 'Nooit'}
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button size="sm" variant="outline" onClick={handleCSVExport}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* JP Cars Monitor Table */}
      <Card>
        <CardHeader>
          <CardTitle>Online Voorraad — JP Cars Monitor</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Voertuig</TableHead>
                <TableHead className="text-right">Stagedagen</TableHead>
                <TableHead className="text-right">Markt gem.</TableHead>
                <TableHead className="text-right">Online prijs</TableHead>
                <TableHead className="text-right">VVP50 (mediaan)</TableHead>
                <TableHead className="text-right">Rang</TableHead>
                <TableHead className="text-right">APR</TableHead>
                <TableHead className="text-right">ETR</TableHead>
                <TableHead className="text-right">Vgl. verkocht</TableHead>
                <TableHead>Brandstof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {joined.map(v => {
                const dagenVsMarkt = v.stock_days != null && v.stock_days_average != null
                  ? v.stock_days - v.stock_days_average : null;
                return (
                  <TableRow key={v.id} className={
                    v.category === 'red' ? 'bg-red-50/50 dark:bg-red-950/10' :
                    v.category === 'yellow' ? 'bg-yellow-50/30 dark:bg-yellow-950/10' : ''
                  }>
                    <TableCell>{categoryBadge(v.category)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{v.brand} {v.model}</div>
                      <div className="text-xs text-muted-foreground">{v.license_number ?? '-'}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={dagenVsMarkt != null && dagenVsMarkt > 0 ? 'text-red-600 font-medium' : ''}>
                        {v.stock_days ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{v.stock_days_average ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(v.price_local)}
                      {v.price_warning != null && v.price_warning > 0 && (
                        <div className="text-xs text-orange-600">
                          Zak {formatPrice(v.price_warning)}
                        </div>
                      )}
                      {v.price_history_amount_1 != null && v.price_history_date_1 && (
                        <div className="text-xs text-muted-foreground">
                          was {formatPrice(v.price_history_amount_1)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(v.vvp_50)}
                      {v.price_vs_market != null && (
                        <div className={`text-xs flex items-center justify-end gap-0.5 ${v.price_vs_market > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {v.price_vs_market > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {v.price_vs_market > 0 ? '+' : ''}{formatPrice(v.price_vs_market)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.rank_current != null ? (
                        <span className={v.rank_current < 20 ? 'text-red-600 font-medium' : v.rank_current <= 50 ? 'text-yellow-600' : 'text-green-600'}>
                          {v.rank_current}
                        </span>
                      ) : '-'}
                      {v.window_size != null && <span className="text-xs text-muted-foreground">/{v.window_size}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.apr != null ? (
                        <span className={v.apr < 50 ? 'text-red-600 font-medium' : v.apr >= 70 ? 'text-green-600' : 'text-yellow-600'}>
                          {v.apr}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.etr != null ? (
                        <span className={v.etr < 50 ? 'text-red-600 font-medium' : v.etr >= 70 ? 'text-green-600' : 'text-yellow-600'}>
                          {v.etr}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{v.stat_sold_count ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{v.fuel ?? '-'}</TableCell>
                  </TableRow>
                );
              })}
              {joined.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Geen data beschikbaar. Klik op "Sync" om JP Cars data op te halen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
