import React, { useMemo, useState } from "react";
import { Sparkles, Users, ClipboardList, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { RapportagesShell, useRapportageFilters, Block, Stat, eur, num, NoData } from "@/components/rapportages/RapportagesShell";
import { useRapportageData } from "@/hooks/useRapportageData";
import { poetsStats, poetsTracking, downloadCsv, POETS_PRICE_INCL, POETS_PRICE_EXCL } from "@/services/rapportageService";

const dt = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "2-digit" });

const RapportagePoetsen: React.FC = () => {
  const { period, branch } = useRapportageFilters();
  const { data: raw, isLoading } = useRapportageData(period, branch);
  const [monthKey, setMonthKey] = useState<string>("all");
  const [poetserId, setPoetserId] = useState<string>("all");

  const stats = raw ? poetsStats(raw) : null;
  const tracking = raw ? poetsTracking(raw) : [];

  const trackRows = useMemo(
    () =>
      tracking.filter(
        (r) => (monthKey === "all" || r.monthKey === monthKey) && (poetserId === "all" || r.poetserId === poetserId),
      ),
    [tracking, monthKey, poetserId],
  );

  const poetserOptions = useMemo(() => {
    const m = new Map<string, string>();
    tracking.forEach((r) => { if (r.poetserId) m.set(r.poetserId, `${r.poetser} (${r.type})`); });
    return Array.from(m.entries());
  }, [tracking]);

  const monthOptions = useMemo(
    () => Array.from(new Set(tracking.map((r) => r.monthKey))).sort().reverse(),
    [tracking],
  );

  return (
    <RapportagesShell title="Poetsen" subtitle="Interne poetsomzet (€ 100 incl. per auto) en tracking van externe poetsers — los van werkplaats en schadeherstel.">
      {isLoading || !stats ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <Block
            title="🧽 Poetsomzet intern"
            icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
            sub={`€ ${POETS_PRICE_EXCL.toFixed(2).replace(".", ",")} ex btw / € ${POETS_PRICE_INCL},00 incl. btw per gepoetste auto`}
            onExport={() =>
              downloadCsv(`poets-omzet-${period}.csv`, [{
                periode: period, vestiging: branch,
                intern_autos: stats.internCars, omzet_ex_btw: stats.revenueExcl, omzet_incl_btw: stats.revenueIncl,
                extern_autos: stats.externCars, zonder_poetser: stats.unknownCars,
              }])
            }
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Intern gepoetst" value={num(stats.internCars, 0)} sub="auto's" />
              <Stat label="Omzet ex btw" value={eur(stats.revenueExcl)} />
              <Stat label="Omzet incl. btw" value={eur(stats.revenueIncl)} />
              <Stat label="Extern gepoetst" value={num(stats.externCars, 0)} sub="alleen aantallen — extern factureert zelf" />
            </div>
            {stats.unknownCars > 0 && (
              <p className="mt-3 text-[11.5px] text-amber-700">
                {stats.unknownCars} poetsbeurt(en) zonder gekoppelde poetser — deze tellen niet mee in de omzet.
              </p>
            )}
          </Block>

          <Block
            title="Maandtrend poetsbeurten"
            icon={<BarChart3 className="h-4 w-4 text-slate-600" />}
            onExport={() => downloadCsv(`poets-maandtrend.csv`, stats.months)}
          >
            {stats.months.every((m) => m.intern + m.extern === 0) ? (
              <NoData />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="intern" name="Intern" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="extern" name="Extern" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Block>

          <Block
            title="Per poetser"
            icon={<Users className="h-4 w-4 text-blue-600" />}
            onExport={() => downloadCsv(`poets-per-poetser-${period}.csv`, stats.persons)}
          >
            {stats.persons.length === 0 ? (
              <NoData label="geen poetsbeurten in deze periode" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Poetser</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3 text-right">Auto's</th>
                      <th className="py-2 pr-3 text-right">Totale tijd</th>
                      <th className="py-2 pr-3 text-right">Gem. per auto</th>
                      <th className="py-2 text-right">Omzet incl.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.persons.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-2 pr-3">
                          <span className={p.type === "intern" ? "rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700" : "rounded-md bg-slate-100 px-2 py-0.5 text-slate-600"}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{p.cars}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(p.seconds / 3600, 1)} u</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(p.avgMinutes, 0)} min</td>
                        <td className="py-2 text-right tabular-nums">{p.type === "intern" ? eur(p.revenueIncl) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Block>

          <Block
            title="Tracking — welke auto, wanneer, hoe lang"
            icon={<ClipboardList className="h-4 w-4 text-violet-600" />}
            sub="Voor controle van de factuur van het externe poetsbedrijf"
            onExport={() => downloadCsv(`poets-tracking-${monthKey}.csv`, trackRows)}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-semibold text-slate-700"
                aria-label="Maand"
              >
                <option value="all">Alle maanden</option>
                {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                value={poetserId}
                onChange={(e) => setPoetserId(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-semibold text-slate-700"
                aria-label="Poetser"
              >
                <option value="all">Alle poetsers</option>
                {poetserOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
            {trackRows.length === 0 ? (
              <NoData label="geen poetsbeurten voor dit filter" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Datum</th>
                      <th className="py-2 pr-3">Kenteken</th>
                      <th className="py-2 pr-3">Auto</th>
                      <th className="py-2 pr-3">Poetser</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Soort</th>
                      <th className="py-2 text-right">Duur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackRows.slice(0, 300).map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 whitespace-nowrap">{dt(r.date)}</td>
                        <td className="py-2 pr-3 font-mono font-semibold">{r.plate}</td>
                        <td className="py-2 pr-3">{r.vehicle}</td>
                        <td className="py-2 pr-3">{r.poetser}</td>
                        <td className="py-2 pr-3">{r.type}</td>
                        <td className="py-2 pr-3">{r.poetsType}</td>
                        <td className="py-2 text-right tabular-nums">{r.minutes ? `${r.minutes} min` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Block>
        </div>
      )}
    </RapportagesShell>
  );
};

export default RapportagePoetsen;
