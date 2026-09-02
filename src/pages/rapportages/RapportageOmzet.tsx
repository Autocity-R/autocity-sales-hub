import React from "react";
import { PaintBucket, Wrench, BarChart3, Sparkles, Euro } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { RapportagesShell, useRapportageFilters, Block, Stat, eur, num, NoData } from "@/components/rapportages/RapportagesShell";
import { useRapportageData } from "@/hooks/useRapportageData";
import { omzetStats, omzetGroups, poetsOmzetGroup, delta, downloadCsv, MIN_N, POETS_PRICE_INCL, type OmzetGroup } from "@/services/rapportageService";


const GroupBlock: React.FC<{
  title: string; icon: React.ReactNode; cur: OmzetGroup; prev: OmzetGroup; showParts: boolean; onExport: () => void;
}> = ({ title, icon, cur, prev, showParts, onExport }) => (
  <Block title={title} icon={icon} onExport={onExport} sub="omzet excl. btw, alleen verstuurde facturen">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Totale omzet" value={eur(cur.total)} pct={delta(cur.total, prev.total)} n={cur.invoices} />
      <Stat label="Intern" value={eur(cur.intern)} pct={delta(cur.intern, prev.intern)} n={cur.invoices} />
      <Stat label="Extern" value={eur(cur.extern)} pct={delta(cur.extern, prev.extern)} n={cur.invoices} />
      <Stat label="Aantal orders" value={num(cur.invoices, 0)} pct={delta(cur.invoices, prev.invoices)} n={cur.invoices} />
      <Stat label="Gem. omzet per order" value={eur(cur.avgPerInvoice)} pct={delta(cur.avgPerInvoice, prev.avgPerInvoice)} n={cur.invoices} />
      {showParts && (
        <>
          <Stat label="Aantal delen" value={num(cur.parts, 0)} pct={delta(cur.parts, prev.parts)} n={cur.parts} />
          <Stat label="Gem. omzet per deel" value={eur(cur.avgPerPart)} pct={delta(cur.avgPerPart, prev.avgPerPart)} n={cur.parts} />
        </>
      )}
    </div>
  </Block>
);

const RapportageOmzet: React.FC = () => {
  const { period, branch, selection, rangeSlug, rangeLabel } = useRapportageFilters();
  const { data: raw, isLoading } = useRapportageData(selection, branch);

  const stats = raw ? omzetStats(raw) : null;
  const prev = raw ? omzetGroups(raw.invoicesPrev) : null;
  const prevPoets = raw ? poetsOmzetGroup(raw, raw.prevFrom, raw.prevTo) : null;

  return (
    <RapportagesShell title="Omzet" subtitle="Schadeherstel, werkplaats en poetsen apart — intern en extern.">
      {isLoading || !stats || !prev || !prevPoets ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <Block title="Totale omzet" icon={<Euro className="h-4 w-4 text-emerald-600" />} sub="som van schadeherstel + werkplaats + poetsen (ex btw)">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Totaal" value={eur(stats.totaal)} />
              <Stat label="Schadeherstel" value={eur(stats.schade.total)} />
              <Stat label="Werkplaats" value={eur(stats.werkplaats.total)} />
              <Stat label="Poetsen" value={eur(stats.poets.total)} />
            </div>
          </Block>
          <GroupBlock
            title="🎨 Schadeherstel"
            icon={<PaintBucket className="h-4 w-4 text-pink-600" />}
            cur={stats.schade} prev={prev.schade} showParts
            onExport={() => downloadCsv(`omzet-schadeherstel-${rangeSlug}.csv`, [{
              periode: rangeSlug, vestiging: branch, intern: stats.schade.intern, extern: stats.schade.extern,
              totaal: stats.schade.total, orders: stats.schade.invoices, delen: stats.schade.parts,
              gem_per_order: Math.round(stats.schade.avgPerInvoice), gem_per_deel: Math.round(stats.schade.avgPerPart),
            }])}
          />
          <GroupBlock
            title="🔧 Werkplaats"
            icon={<Wrench className="h-4 w-4 text-blue-600" />}
            cur={stats.werkplaats} prev={prev.werkplaats} showParts={false}
            onExport={() => downloadCsv(`omzet-werkplaats-${rangeSlug}.csv`, [{
              periode: rangeSlug, vestiging: branch, intern: stats.werkplaats.intern, extern: stats.werkplaats.extern,
              totaal: stats.werkplaats.total, orders: stats.werkplaats.invoices,
              gem_per_order: Math.round(stats.werkplaats.avgPerInvoice),
            }])}
          />
          <Block
            title="✨ Poetsen"
            icon={<Sparkles className="h-4 w-4 text-cyan-600" />}
            sub={`interne poetsbeurten × ${eur(POETS_PRICE_INCL)} incl. btw — externe beurten leveren geen omzet op`}
            onExport={() => downloadCsv(`omzet-poetsen-${rangeSlug}.csv`, [{
              periode: rangeSlug, vestiging: branch, beurten_intern: stats.poets.invoices,
              omzet_ex_btw: stats.poets.total, omzet_incl_btw: stats.poets.invoices * POETS_PRICE_INCL,
            }])}
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Omzet (ex btw)" value={eur(stats.poets.total)} pct={delta(stats.poets.total, prevPoets.total)} n={stats.poets.invoices} />
              <Stat label="Omzet (incl. btw)" value={eur(stats.poets.invoices * POETS_PRICE_INCL)} n={stats.poets.invoices} />
              <Stat label="Interne poetsbeurten" value={num(stats.poets.invoices, 0)} pct={delta(stats.poets.invoices, prevPoets.invoices)} n={stats.poets.invoices} />
              <Stat label="Omzet per beurt" value={eur(stats.poets.avgPerInvoice)} n={stats.poets.invoices} />
            </div>
          </Block>
          <Block
            title={`Maandtrend — ${rangeLabel}`}
            sub="volle balken vallen binnen het gekozen bereik, lichte balken erbuiten"
            icon={<BarChart3 className="h-4 w-4 text-slate-600" />}
            onExport={() => downloadCsv(`omzet-trend-${rangeSlug}.csv`, stats.trend)}
          >
            {stats.trend.every(t => t.schade + t.werkplaats + t.poets === 0) ? (
              <NoData />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip formatter={(v: any) => eur(Number(v))} />
                    <Legend />
                    <Bar dataKey="schade" name="Schadeherstel" fill="#db2777" radius={[4, 4, 0, 0]}>
                      {stats.trend.map((t, i) => <Cell key={i} fill="#db2777" fillOpacity={t.selected ? 1 : 0.35} />)}
                    </Bar>
                    <Bar dataKey="werkplaats" name="Werkplaats" fill="#2563eb" radius={[4, 4, 0, 0]}>
                      {stats.trend.map((t, i) => <Cell key={i} fill="#2563eb" fillOpacity={t.selected ? 1 : 0.35} />)}
                    </Bar>
                    <Bar dataKey="poets" name="Poetsen" fill="#0891b2" radius={[4, 4, 0, 0]}>
                      {stats.trend.map((t, i) => <Cell key={i} fill="#0891b2" fillOpacity={t.selected ? 1 : 0.35} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Block>

          <p className="text-[11px] text-slate-500">
            Perioden met minder dan {MIN_N} observaties tonen "nog onvoldoende data" in plaats van een gemiddelde.
          </p>
        </div>
      )}
    </RapportagesShell>
  );
};

export default RapportageOmzet;
