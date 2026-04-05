import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight } from "lucide-react";
import type { JoinedVehicle } from "./types";

interface KevinFullTableProps {
  vehicles: JoinedVehicle[];
}

const formatPrice = (n: number | null) => n != null ? `€${n.toLocaleString('nl-NL')}` : '-';

const categoryBadge = (cat: 'red' | 'yellow' | 'green') => {
  if (cat === 'red') return <Badge className="bg-red-500 text-white">Actie</Badge>;
  if (cat === 'yellow') return <Badge className="bg-yellow-500 text-white">Let op</Badge>;
  return <Badge className="bg-green-500 text-white">Goed</Badge>;
};

type SortKey = 'stock_days' | 'price_local' | 'rank';

export const KevinFullTable: React.FC<KevinFullTableProps> = ({ vehicles }) => {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('stock_days');

  const fuels = useMemo(() => {
    const set = new Set(vehicles.map(v => v.fuel).filter(f => f && f.trim() !== ''));
    return Array.from(set).sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    let list = [...vehicles];
    if (statusFilter !== 'all') list = list.filter(v => v.category === statusFilter);
    if (fuelFilter !== 'all') list = list.filter(v => v.fuel === fuelFilter);

    list.sort((a, b) => {
      if (sortBy === 'stock_days') return (b.stock_days ?? 0) - (a.stock_days ?? 0);
      if (sortBy === 'price_local') return (b.price_local ?? 0) - (a.price_local ?? 0);
      if (sortBy === 'rank') {
        const aPct = (a.rank_current != null && a.window_size) ? a.rank_current / a.window_size : 0;
        const bPct = (b.rank_current != null && b.window_size) ? b.rank_current / b.window_size : 0;
        return bPct - aPct;
      }
      return 0;
    });
    return list;
  }, [vehicles, statusFilter, fuelFilter, sortBy]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              📋 Volledige Tabel — {vehicles.length} voertuigen
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle status</SelectItem>
                  <SelectItem value="red">🔴 Actie</SelectItem>
                  <SelectItem value="yellow">🟡 Let op</SelectItem>
                  <SelectItem value="green">🟢 Goed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fuelFilter} onValueChange={setFuelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Brandstof" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle brandstof</SelectItem>
                  {fuels.map(f => <SelectItem key={f!} value={f!}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sorteren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_days">Stagedagen ↓</SelectItem>
                  <SelectItem value="price_local">Prijs ↓</SelectItem>
                  <SelectItem value="rank">Rang (slechtst) ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Voertuig</TableHead>
                    <TableHead className="text-right">Stagedagen</TableHead>
                    <TableHead className="text-right">Markt gem.</TableHead>
                    <TableHead className="text-right">Online prijs</TableHead>
                    <TableHead className="text-right">VVP50</TableHead>
                    <TableHead className="text-right">Rang</TableHead>
                    <TableHead className="text-right">APR</TableHead>
                    <TableHead className="text-right">Vgl. verkocht</TableHead>
                    <TableHead>Brandstof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(v => (
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
                        <span className={(v.stock_days ?? 0) > 45 ? 'text-red-600 font-medium' : ''}>
                          {v.stock_days ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{v.stock_days_average ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(v.price_local)}
                        {v.price_warning != null && v.price_warning < -50 && (
                          <div className="text-xs text-green-600">Verhoog {formatPrice(Math.abs(v.price_warning))}</div>
                        )}
                        {v.price_warning != null && v.price_warning > 50 && (
                          <div className="text-xs text-orange-600">Zak {formatPrice(v.price_warning)}</div>
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
                        {v.rank_current != null && v.window_size != null && v.window_size > 0 ? (
                          <span className={
                            v.rank_current / v.window_size > 0.8 ? 'text-red-600 font-medium' :
                            v.rank_current / v.window_size > 0.5 ? 'text-yellow-600' : 'text-green-600'
                          }>
                            {v.rank_current}/{v.window_size}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.apr != null ? (
                          <span className={v.apr < 50 ? 'text-red-600 font-medium' : v.apr >= 70 ? 'text-green-600' : 'text-yellow-600'}>
                            {v.apr}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{v.stat_sold_count ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{v.fuel ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Geen voertuigen gevonden met deze filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
