import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { TrendingUp, TrendingDown, Download, Euro, Users, Gauge, Timer, Trophy, AlertTriangle, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard } from "@/components/aftersales/ui";
import { cn } from "@/lib/utils";
import type { RapPeriod, RapBranch } from "@/services/rapportageService";
import { MIN_N } from "@/services/rapportageService";

export const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
export const num = (n: number, d = 1) => (n || 0).toLocaleString("nl-NL", { maximumFractionDigits: d });

export const PERIODS: { k: RapPeriod; label: string }[] = [
  { k: "week", label: "Week" },
  { k: "month", label: "Maand" },
  { k: "quarter", label: "Kwartaal" },
  { k: "year", label: "Jaar" },
];
export const BRANCHES: { k: RapBranch; label: string }[] = [
  { k: "all", label: "Alle vestigingen" },
  { k: "rotterdam", label: "Rotterdam" },
  { k: "heerhugowaard", label: "Heerhugowaard" },
];

export const TABS = [
  { to: "/rapportages/omzet", label: "Omzet", icon: Euro },
  { to: "/rapportages/performance", label: "Performance", icon: Users },
  { to: "/rapportages/kpi", label: "KPI-dashboard", icon: Gauge },
  { to: "/rapportages/doorlooptijden", label: "Doorlooptijden", icon: Timer },
  { to: "/rapportages/poetsen", label: "Poetsen", icon: Sparkles },
];

/** Periode + vestiging in de URL, zodat het filter meegaat tussen de vier pagina's. */
export function useRapportageFilters() {
  const [params, setParams] = useSearchParams();
  const period = (params.get("period") as RapPeriod) || "month";
  const branch = (params.get("branch") as RapBranch) || "all";
  const set = (key: "period" | "branch", value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };
  return { period, branch, setPeriod: (p: RapPeriod) => set("period", p), setBranch: (b: RapBranch) => set("branch", b) };
}

export const Delta: React.FC<{ pct: number; higherIsBetter?: boolean }> = ({ pct, higherIsBetter = true }) => {
  const up = pct >= 0;
  const good = higherIsBetter ? up : !up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", good ? "text-emerald-600" : "text-red-600")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{num(pct, 0)}%
    </span>
  );
};

export const NoData: React.FC<{ label?: string; className?: string }> = ({ label = "nog onvoldoende data", className }) => (
  <span className={cn("text-[12px] font-medium italic text-slate-400", className)}>{label}</span>
);

export const Stat: React.FC<{
  label: string; value: React.ReactNode; pct?: number; higherIsBetter?: boolean;
  sub?: string; n?: number; flag?: "best" | "warn" | null;
}> = ({ label, value, pct, higherIsBetter, sub, n, flag }) => {
  const enough = n === undefined || n >= MIN_N;
  return (
    <AsCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        {enough && flag === "best" && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
        {enough && flag === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
      </div>
      {enough ? (
        <>
          <div className="mt-1 text-[22px] font-bold tabular-nums text-slate-900">{value}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {typeof pct === "number" && <Delta pct={pct} higherIsBetter={higherIsBetter} />}
            {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
          </div>
        </>
      ) : (
        <div className="mt-2"><NoData /></div>
      )}
    </AsCard>
  );
};

export const Block: React.FC<{
  title: string; icon?: React.ReactNode; onExport?: () => void; children: React.ReactNode; className?: string; sub?: string;
}> = ({ title, icon, onExport, children, className, sub }) => (
  <AsCard className={cn("p-0 overflow-hidden", className)}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold text-slate-900">{title}</div>
          {sub && <div className="truncate text-[11px] text-slate-500">{sub}</div>}
        </div>
      </div>
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      )}
    </div>
    <div className="p-4">{children}</div>
  </AsCard>
);

export const RapportagesShell: React.FC<{
  title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode;
}> = ({ title, subtitle, children, right }) => {
  const { pathname } = useLocation();
  const { period, branch, setPeriod, setBranch } = useRapportageFilters();
  const qs = `?period=${period}&branch=${branch}`;

  return (
    <DashboardLayout>
      <AsPage>
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rapportages · alleen-lezen</div>
              <h1 className="text-[24px] font-bold leading-tight text-slate-900">{title}</h1>
              {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
            </div>
            {right}
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {TABS.map(t => {
              const active = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to + qs}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap",
                    active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPeriod(p.k)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold",
                    period === p.k ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {BRANCHES.map(b => (
                <button
                  key={b.k}
                  type="button"
                  onClick={() => setBranch(b.k)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold",
                    branch === b.k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">vergelijking t.o.v. vorige periode</span>
          </div>
        </div>
        {children}
      </AsPage>
    </DashboardLayout>
  );
};
