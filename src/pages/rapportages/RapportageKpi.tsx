import React from "react";
import { Wrench, PaintBucket, Hammer, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RapportagesShell, useRapportageFilters, Block, Stat, eur, num } from "@/components/rapportages/RapportagesShell";
import { useRapportageData } from "@/hooks/useRapportageData";
import { kpiDashboard, delta, downloadCsv, MIN_N, type Kpi } from "@/services/rapportageService";

const fmt = (k: Kpi) => {
  switch (k.unit) {
    case "eur": return eur(k.value);
    case "h": return `${num(k.value, 1)} u`;
    case "min": return `${num(k.value, 0)} min`;
    case "pct": return `${num(k.value, 0)}%`;
    case "d": return `${num(k.value, 1)} dg`;
    default: return num(k.value, k.value % 1 === 0 ? 0 : 1);
  }
};

const KpiGroup: React.FC<{ title: string; icon: React.ReactNode; kpis: Kpi[]; period: string; sub?: string }> = ({ title, icon, kpis, period, sub }) => {
  const pcts = kpis.map(k => (k.n >= MIN_N ? delta(k.value, k.prev) : 0));
  const best = kpis.reduce<{ i: number; score: number } | null>((acc, k, i) => {
    if (k.n < MIN_N) return acc;
    const score = (k.higherIsBetter ? 1 : -1) * pcts[i];
    return !acc || score > acc.score ? { i, score } : acc;
  }, null);
  const worst = kpis.reduce<{ i: number; score: number } | null>((acc, k, i) => {
    if (k.n < MIN_N) return acc;
    const score = (k.higherIsBetter ? 1 : -1) * pcts[i];
    return !acc || score < acc.score ? { i, score } : acc;
  }, null);

  return (
    <Block
      title={title} icon={icon} sub={sub}
      onExport={() => downloadCsv(`kpi-${title.toLowerCase().replace(/\s+/g, "-")}-${period}.csv`,
        kpis.map(k => ({ kpi: k.label, waarde: k.n >= MIN_N ? num(k.value, 2) : "onvoldoende data", vorige_periode: num(k.prev, 2), observaties: k.n })))}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((k, i) => (
          <Stat
            key={k.key}
            label={k.label}
            value={fmt(k)}
            pct={k.prev > 0 || k.value > 0 ? delta(k.value, k.prev) : undefined}
            higherIsBetter={k.higherIsBetter}
            n={k.n}
            flag={best && best.i === i && best.score > 10 ? "best" : worst && worst.i === i && worst.score < -10 ? "warn" : null}
            sub={`${k.n} obs.`}
          />
        ))}
      </div>
    </Block>
  );
};

const RapportageKpi: React.FC = () => {
  const { period, branch } = useRapportageFilters();
  const { data: raw, isLoading } = useRapportageData(period, branch);
  const kpis = raw ? kpiDashboard(raw) : null;

  return (
    <RapportagesShell title="KPI-dashboard" subtitle="Per groep, met verschil ten opzichte van de vorige periode.">
      {isLoading || !kpis ? (
        <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : (
        <div className="space-y-4">
          <KpiGroup title="Monteurs" icon={<Wrench className="h-4 w-4 text-blue-600" />} kpis={kpis.monteurs} period={period}
            sub="oppaksnelheid = aanmaak → start van de klus (pot-taken)" />
          <KpiGroup title="Schadeherstel" icon={<PaintBucket className="h-4 w-4 text-pink-600" />} kpis={kpis.schade} period={period} />
          <div className="grid gap-4 lg:grid-cols-2">
            <KpiGroup title="Uitdeuker" icon={<Hammer className="h-4 w-4 text-amber-600" />} kpis={kpis.uitdeuk} period={period} />
            <KpiGroup title="Poetsen" icon={<Sparkles className="h-4 w-4 text-emerald-600" />} kpis={kpis.poets} period={period}
              sub="alleen aantallen — poetsen is extern, geen persoons-KPI's" />
          </div>
          <p className="text-[11px] text-slate-500">
            KPI's met minder dan {MIN_N} observaties in de periode tonen "nog onvoldoende data".
          </p>
        </div>
      )}
    </RapportagesShell>
  );
};

export default RapportageKpi;
