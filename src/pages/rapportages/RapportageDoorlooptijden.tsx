import React from "react";
import { Timer, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { AsCard } from "@/components/aftersales/ui";
import { RapportagesShell, useRapportageFilters, Block, Stat, num, NoData } from "@/components/rapportages/RapportagesShell";
import { useRapportageData } from "@/hooks/useRapportageData";
import { flowSteps, downloadCsv, MIN_N } from "@/services/rapportageService";
import { cn } from "@/lib/utils";

const RapportageDoorlooptijden: React.FC = () => {
  const { period, branch, selection, rangeSlug } = useRapportageFilters();
  const { data: raw, isLoading } = useRapportageData(selection, branch);
  const flow = raw ? flowSteps(raw) : null;

  return (
    <RapportagesShell title="Doorlooptijden" subtitle="Gemiddelde per stap met weektrend; de traagste stap is gemarkeerd.">
      {isLoading || !flow ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {flow.steps.map(s => (
              <Stat
                key={s.key}
                label={s.label}
                value={`${num(s.avgDays, 1)} dg`}
                n={s.n}
                sub={`${s.n} auto's`}
                flag={flow.bottleneck === s.key ? "warn" : null}
              />
            ))}
            <Stat
              label="Afleveringen op tijd"
              value={flow.onTimePct === null ? "—" : `${num(flow.onTimePct, 0)}%`}
              n={flow.onTimePct === null ? 0 : flow.onTimeN}
              sub="t.o.v. geplande afleverdatum"
            />
          </div>

          {flow.bottleneck && (
            <AsCard className="flex items-center gap-2 border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-[12.5px] font-semibold text-amber-900">
                Bottleneck: {flow.steps.find(s => s.key === flow.bottleneck)?.label}
              </span>
            </AsCard>
          )}

          {flow.steps.map(s => (
            <Block
              key={s.key}
              title={s.label}
              icon={<Timer className={cn("h-4 w-4", flow.bottleneck === s.key ? "text-amber-600" : "text-slate-600")} />}
              sub={`gemiddeld ${s.n >= MIN_N ? `${num(s.avgDays, 1)} dagen` : "nog onvoldoende data"} in deze periode`}
              onExport={() => downloadCsv(`doorlooptijd-${s.key}-${rangeSlug}.csv`, s.weekly.map(w => ({ week: w.week, gem_dagen: num(w.days, 2), aantal: w.n })))}
            >
              {s.weekly.every(w => w.n === 0) ? (
                <NoData />
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={s.weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}d`} />
                      <Tooltip formatter={(v: any, _n, p: any) => [`${num(Number(v), 1)} dagen (${p?.payload?.n} auto's)`, "Gemiddeld"]} />
                      <Line type="monotone" dataKey="days" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Block>
          ))}
          <p className="text-[11px] text-slate-500">
            Gebaseerd op bestaande tijdstempels (transport, inname, werkorders, verkoop) — geen extra registratie door medewerkers.
            Stappen met minder dan {MIN_N} auto's tonen "nog onvoldoende data". Garantie-doorlooptijden zitten bewust nog niet in dit overzicht.
          </p>
        </div>
      )}
    </RapportagesShell>
  );
};

export default RapportageDoorlooptijden;
