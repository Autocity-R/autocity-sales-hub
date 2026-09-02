import React from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { TrendingUp, TrendingDown, Download, Euro, Users, Gauge, Timer, Trophy, AlertTriangle, Sparkles, CalendarIcon } from "lucide-react";
import { nl } from "date-fns/locale";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard } from "@/components/aftersales/ui";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { RapPeriod, RapBranch, RapSelection } from "@/services/rapportageService";
import { MIN_N, resolveRange } from "@/services/rapportageService";

export const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
export const num = (n: number, d = 1) => (n || 0).toLocaleString("nl-NL", { maximumFractionDigits: d });

export const PERIODS: { k: RapPeriod; label: string }[] = [
  { k: "week", label: "Deze week" },
  { k: "month", label: "Deze maand" },
  { k: "prev_month", label: "Vorige maand" },
  { k: "quarter", label: "Dit kwartaal" },
  { k: "prev_quarter", label: "Vorig kwartaal" },
  { k: "year", label: "Dit jaar" },
  { k: "prev_year", label: "Vorig jaar" },
  { k: "custom", label: "Aangepast" },
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

/** Periode (incl. eigen van–tot bereik) + vestiging in de URL, zodat het filter meegaat tussen de rapportagepagina's. */
export function useRapportageFilters() {
  const [params, setParams] = useSearchParams();
  const period = (params.get("period") as RapPeriod) || "month";
  const branch = (params.get("branch") as RapBranch) || "all";
  const customFrom = params.get("from");
  const customTo = params.get("to");

  const patch = (entries: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(entries).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  // Bewaar de keuze, zodat ook navigatie via de sidebar (zonder querystring) het bereik vasthoudt.
  const STORE = "rapportage-filters";
  React.useEffect(() => {
    if (params.get("period")) {
      try { sessionStorage.setItem(STORE, JSON.stringify({ period, branch, from: customFrom, to: customTo })); } catch { /* noop */ }
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const v = JSON.parse(raw) as { period?: string; branch?: string; from?: string | null; to?: string | null };
      if (!v.period) return;
      const next = new URLSearchParams(params);
      next.set("period", v.period);
      if (v.branch) next.set("branch", v.branch);
      if (v.from) next.set("from", v.from);
      if (v.to) next.set("to", v.to);
      setParams(next, { replace: true });
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const selection: RapSelection = { period, customFrom, customTo };
  const resolved = resolveRange(selection);

  return {
    period, branch, customFrom, customTo, selection,
    rangeLabel: resolved.label, rangeSlug: resolved.slug,
    /** querystring om mee te geven aan links tussen rapportagepagina's */
    qs: `?period=${period}&branch=${branch}${customFrom ? `&from=${customFrom}` : ""}${customTo ? `&to=${customTo}` : ""}`,
    setPeriod: (p: RapPeriod) => patch(p === "custom" ? { period: p } : { period: p, from: null, to: null }),
    setBranch: (b: RapBranch) => patch({ branch: b }),
    setCustomRange: (from: string | null, to: string | null) => patch({ period: "custom", from, to }),
  };
}

const d2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${d2(d.getMonth() + 1)}-${d2(d.getDate())}`;
const fromKey = (s?: string | null) => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
};
const nlShort = (d?: Date) => (d ? d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : null);

/** Van–tot kiezer (Nederlandse notatie, max t/m vandaag). */
const RangePicker: React.FC<{
  from?: string | null; to?: string | null; onChange: (from: string | null, to: string | null) => void;
}> = ({ from, to, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<{ from?: Date; to?: Date }>({ from: fromKey(from), to: fromKey(to) });
  React.useEffect(() => { setDraft({ from: fromKey(from), to: fromKey(to) }); }, [from, to]);
  const today = new Date(); today.setHours(23, 59, 59, 999);

  const label = draft.from && draft.to ? `${nlShort(draft.from)} – ${nlShort(draft.to)}` : "Kies van–tot";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-blue-700"
        >
          <CalendarIcon className="h-3.5 w-3.5" /> {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0 pointer-events-auto">
        <Calendar
          mode="range"
          locale={nl}
          selected={{ from: draft.from, to: draft.to } as any}
          onSelect={(r: any) => setDraft({ from: r?.from, to: r?.to })}
          disabled={(d) => d > today}
          numberOfMonths={1}
          defaultMonth={draft.from}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => { setDraft({}); onChange(null, null); }}
            className="text-[12px] font-semibold text-slate-500 hover:text-slate-700"
          >
            Wissen
          </button>
          <button
            type="button"
            disabled={!draft.from || !draft.to}
            onClick={() => { onChange(toKey(draft.from as Date), toKey((draft.to || draft.from) as Date)); setOpen(false); }}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            Toepassen
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  const { period, branch, customFrom, customTo, setPeriod, setBranch, setCustomRange, rangeLabel, qs } = useRapportageFilters();

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
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as RapPeriod)}
                aria-label="Periode"
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-semibold text-slate-700"
              >
                {PERIODS.map(p => <option key={p.k} value={p.k}>{p.label}</option>)}
              </select>
              {period === "custom" && (
                <RangePicker from={customFrom} to={customTo} onChange={setCustomRange} />
              )}
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
            <span className="text-[11px] text-slate-500">{rangeLabel} · vergelijking t.o.v. de even lange periode ervoor</span>
          </div>
        </div>
        {children}
      </AsPage>
    </DashboardLayout>
  );
};
