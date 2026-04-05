import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, TrendingUp, Filter } from "lucide-react";

interface FastMoverModel {
  make: string;
  model: string;
  avgDays: number;
  etr: number;
  apr: number;
  count: number;
  avgPrice: number;
  priceMin: number;
  priceMax: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  avgMileage: number;
  avgBuildYear: number;
  soldCount: number;
  inStockCount: number;
}

export const KevinFastMovers: React.FC = () => {
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [bodyFilter, setBodyFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('etr');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['kevin-fast-movers-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxatie_valuations')
        .select('jpcars_data, vehicle_data')
        .not('jpcars_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    }
  });

  const models: FastMoverModel[] = useMemo(() => {
    if (!rawData) return [];

    const modelMap = new Map<string, {
      totalDays: number; totalEtr: number; totalApr: number; count: number;
      totalPrice: number; minPrice: number; maxPrice: number;
      totalMileage: number; totalBuildYear: number;
      soldCount: number; inStockCount: number;
      make: string; model: string; fuel: string; transmission: string; bodyType: string;
    }>();

    for (const row of rawData) {
      const jp = row.jpcars_data as any;
      const vd = row.vehicle_data as any;
      if (!jp || !jp.etr || jp.etr < 2) continue;

      const make = vd?.brand ?? jp.window?.[0]?.make ?? 'Onbekend';
      const model = vd?.model ?? jp.window?.[0]?.model ?? 'Onbekend';
      const key = `${make.toUpperCase()}|${model.toUpperCase()}`;

      const fuel = vd?.fuelType ?? '-';
      const transmission = vd?.transmission ?? '-';
      const bodyType = vd?.bodyType ?? '-';
      const buildYear = vd?.buildYear ?? jp.window?.[0]?.build ?? 0;
      const mileage = vd?.mileage ?? jp.window?.[0]?.mileage ?? 0;

      // Calculate avg days from window
      const windowEntries = jp.window ?? [];
      const daysEntries = windowEntries.filter((w: any) => w.days_in_stock != null);
      const avgDays = daysEntries.length > 0
        ? daysEntries.reduce((s: number, w: any) => s + w.days_in_stock, 0) / daysEntries.length
        : 0;

      // Count sold vs in stock
      const sold = windowEntries.filter((w: any) => w.sold_since > 0).length;
      const inStock = windowEntries.filter((w: any) => w.sold_since === 0).length;

      // Price range
      const prices = windowEntries.map((w: any) => w.price_local).filter(Boolean);
      const minP = prices.length > 0 ? Math.min(...prices) : 0;
      const maxP = prices.length > 0 ? Math.max(...prices) : 0;
      const avgP = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;

      const existing = modelMap.get(key);
      if (existing) {
        existing.totalDays += avgDays;
        existing.totalEtr += jp.etr;
        existing.totalApr += jp.apr ?? 0;
        existing.count += 1;
        existing.totalPrice += avgP;
        existing.minPrice = Math.min(existing.minPrice, minP || existing.minPrice);
        existing.maxPrice = Math.max(existing.maxPrice, maxP);
        existing.totalMileage += mileage;
        existing.totalBuildYear += buildYear;
        existing.soldCount += sold;
        existing.inStockCount += inStock;
      } else {
        modelMap.set(key, {
          totalDays: avgDays, totalEtr: jp.etr, totalApr: jp.apr ?? 0, count: 1,
          totalPrice: avgP, minPrice: minP || 999999, maxPrice: maxP,
          totalMileage: mileage, totalBuildYear: buildYear,
          soldCount: sold, inStockCount: inStock,
          make, model, fuel, transmission, bodyType,
        });
      }
    }

    return Array.from(modelMap.values())
      .map(m => ({
        make: m.make,
        model: m.model,
        avgDays: Math.round(m.totalDays / m.count),
        etr: Math.round((m.totalEtr / m.count) * 10) / 10,
        apr: Math.round(m.totalApr / m.count),
        count: m.count,
        avgPrice: Math.round(m.totalPrice / m.count),
        priceMin: m.minPrice === 999999 ? 0 : m.minPrice,
        priceMax: m.maxPrice,
        fuel: m.fuel,
        transmission: m.transmission,
        bodyType: m.bodyType,
        avgMileage: Math.round(m.totalMileage / m.count),
        avgBuildYear: Math.round(m.totalBuildYear / m.count),
        soldCount: m.soldCount,
        inStockCount: m.inStockCount,
      }))
      .filter(m => m.etr >= 2 && m.avgDays > 0);
  }, [rawData]);

  // Extract unique filter options
  const fuels = useMemo(() => [...new Set(models.map(m => m.fuel).filter(f => f && f !== '-' && f.trim() !== ''))].sort(), [models]);
  const bodyTypes = useMemo(() => [...new Set(models.map(m => m.bodyType).filter(b => b && b !== '-' && b.trim() !== ''))].sort(), [models]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...models];
    if (fuelFilter !== 'all') list = list.filter(m => m.fuel === fuelFilter);
    if (bodyFilter !== 'all') list = list.filter(m => m.bodyType === bodyFilter);
    if (priceFilter !== 'all') {
      const [min, max] = priceFilter.split('-').map(Number);
      list = list.filter(m => m.avgPrice >= min && (max ? m.avgPrice <= max : true));
    }

    list.sort((a, b) => {
      if (sortBy === 'etr') return b.etr - a.etr;
      if (sortBy === 'days') return a.avgDays - b.avgDays;
      if (sortBy === 'price') return a.avgPrice - b.avgPrice;
      if (sortBy === 'count') return b.count - a.count;
      return 0;
    });
    return list;
  }, [models, fuelFilter, bodyFilter, priceFilter, sortBy]);

  const formatPrice = (n: number) => n > 0 ? `€${n.toLocaleString('nl-NL')}` : '-';

  const etrBadge = (etr: number) => {
    if (etr >= 6) return <Badge className="bg-green-600 text-white">⚡ {etr}</Badge>;
    if (etr >= 4) return <Badge className="bg-green-500 text-white">{etr}</Badge>;
    if (etr >= 3) return <Badge className="bg-yellow-500 text-white">{etr}</Badge>;
    return <Badge variant="secondary">{etr}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Fast Movers — Snelst Verkopende Modellen
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Modellen met hoge ETR (omloopsnelheid) uit JP Cars marktdata. Hogere ETR = sneller verkocht.
        </p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal modellen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <p className="text-xs text-muted-foreground">met ETR ≥ 2</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filtered.filter(m => m.etr >= 4).length}
            </div>
            <p className="text-xs text-muted-foreground">ETR ≥ 4</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gem. stagedagen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filtered.length > 0 ? Math.round(filtered.reduce((s, m) => s + m.avgDays, 0) / filtered.length) : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Gem. ETR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filtered.length > 0 ? (filtered.reduce((s, m) => s + m.etr, 0) / filtered.length).toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={fuelFilter} onValueChange={setFuelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Brandstof" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle brandstof</SelectItem>
                {fuels.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bodyFilter} onValueChange={setBodyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Carrosserie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                {bodyTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prijsklasse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle prijzen</SelectItem>
                <SelectItem value="0-10000">Tot €10.000</SelectItem>
                <SelectItem value="10000-20000">€10.000 - €20.000</SelectItem>
                <SelectItem value="20000-30000">€20.000 - €30.000</SelectItem>
                <SelectItem value="30000-50000">€30.000 - €50.000</SelectItem>
                <SelectItem value="50000-0">€50.000+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sorteren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="etr">Hoogste ETR</SelectItem>
                <SelectItem value="days">Snelste verkoop</SelectItem>
                <SelectItem value="price">Laagste prijs</SelectItem>
                <SelectItem value="count">Meeste data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6 overflow-auto">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Data laden...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Carrosserie</TableHead>
                  <TableHead>Brandstof</TableHead>
                  <TableHead>Transmissie</TableHead>
                  <TableHead className="text-right">ETR</TableHead>
                  <TableHead className="text-right">Gem. dagen</TableHead>
                  <TableHead className="text-right">Prijsrange</TableHead>
                  <TableHead className="text-right">Gem. prijs</TableHead>
                  <TableHead className="text-right">Gem. km</TableHead>
                  <TableHead className="text-right">Bouwjaar</TableHead>
                  <TableHead className="text-right">Verkocht / Online</TableHead>
                  <TableHead className="text-right">Data pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-semibold">{m.make}</div>
                      <div className="text-xs text-muted-foreground">{m.model}</div>
                    </TableCell>
                    <TableCell className="text-sm">{m.bodyType}</TableCell>
                    <TableCell className="text-sm">{m.fuel}</TableCell>
                    <TableCell className="text-sm">{m.transmission}</TableCell>
                    <TableCell className="text-right">{etrBadge(m.etr)}</TableCell>
                    <TableCell className="text-right">
                      <span className={m.avgDays <= 30 ? 'text-green-600 font-medium' : m.avgDays <= 60 ? 'text-yellow-600' : 'text-red-600'}>
                        {m.avgDays}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {m.priceMin > 0 && m.priceMax > 0 ? (
                        <span>{formatPrice(m.priceMin)} – {formatPrice(m.priceMax)}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(m.avgPrice)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {m.avgMileage > 0 ? `${(m.avgMileage / 1000).toFixed(0)}k` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {m.avgBuildYear > 2000 ? m.avgBuildYear : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600">{m.soldCount}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span>{m.inStockCount}</span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{m.count}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Geen modellen gevonden met deze filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
