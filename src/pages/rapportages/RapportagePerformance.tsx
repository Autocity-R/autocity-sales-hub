import React from "react";
import { Users, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AsPill } from "@/components/aftersales/ui";
import { RapportagesShell, useRapportageFilters, Block, eur, num, NoData } from "@/components/rapportages/RapportagesShell";
import { useRapportageData } from "@/hooks/useRapportageData";
import { employeeRows, employeeOrders, downloadCsv, revenueByOrder, doneInPeriod, type EmployeeRow } from "@/services/rapportageService";
import { groupOrders, suspiciousTimer, fairSeconds } from "@/lib/performanceGroups";
import { PerformanceGroupCards } from "@/components/rapportages/PerformanceGroups";
import { cn } from "@/lib/utils";

type SortKey = keyof Pick<EmployeeRow, "name" | "revenue" | "hours" | "perHour" | "tasks" | "parts">;

const RapportagePerformance: React.FC = () => {
  const { period, branch, selection, rangeSlug } = useRapportageFilters();
  const { data: raw, isLoading } = useRapportageData(selection, branch);
  const [sort, setSort] = React.useState<SortKey>("revenue");
  const [asc, setAsc] = React.useState(false);
  const [selected, setSelected] = React.useState<EmployeeRow | null>(null);

  const rows = React.useMemo(() => (raw ? employeeRows(raw) : []), [raw]);
  const sorted = React.useMemo(() => {
    const out = [...rows].sort((a, b) => {
      const va = a[sort], vb = b[sort];
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb));
      return Number(va) - Number(vb);
    });
    return asc ? out : out.reverse();
  }, [rows, sort, asc]);

  const detail = React.useMemo(() => (raw && selected ? employeeOrders(raw, selected.id) : []), [raw, selected]);
  const groups = React.useMemo(() => groupOrders(detail), [detail]);
  const revenue = React.useMemo(() => (raw ? revenueByOrder(raw, raw.invoices6m) : new Map<string, number>()), [raw]);
  const periodStats = React.useMemo(() => {
    if (!raw) return null;
    const done = detail.filter(o => doneInPeriod(o, raw.from, raw.to));
    return {
      fair: fairSeconds(done) / 3600,
      sum: done.reduce((a, o) => a + Number(o.work_seconds || 0), 0) / 3600,
      suspicious: done.filter(o => suspiciousTimer(o) != null).length,
    };
  }, [raw, detail]);
  const nameOf = React.useCallback((id?: string | null) => {
    const p = raw?.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Onbekend";
  }, [raw]);

  const th = (key: SortKey, label: string, right = false) => (
    <th
      className={cn("cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500", right ? "text-right" : "text-left")}
      onClick={() => { if (sort === key) setAsc(!asc); else { setSort(key); setAsc(false); } }}
    >
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
    </th>
  );

  return (
    <RapportagesShell title="Performance medewerkers" subtitle="Monteurs en schadeherstellers — poetsen is extern en staat hier niet in.">
      {isLoading || !raw ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Block
          title="Per medewerker"
          icon={<Users className="h-4 w-4 text-blue-600" />}
          sub="omzet toegerekend via factuurregels van de eigen orders"
          onExport={() => downloadCsv(`performance-${rangeSlug}.csv`, sorted.map(r => ({
            medewerker: r.name, disciplines: r.disciplines.join("/"), omzet: Math.round(r.revenue),
            uren: num(r.hours, 1), omzet_per_uur: Math.round(r.perHour), taken: r.tasks, delen: r.parts,
          })))}
        >
          {sorted.length === 0 ? (
            <NoData label="Nog onvoldoende data in deze periode" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50/60">
                  <tr>
                    {th("name", "Medewerker")}
                    {th("revenue", "Omzet", true)}
                    {th("hours", "Uren", true)}
                    {th("perHour", "Omzet/uur", true)}
                    {th("tasks", "Taken", true)}
                    {th("parts", "Delen", true)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => (
                    <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-blue-50/40" onClick={() => setSelected(r)}>
                      <td className="px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-slate-900">{r.name}</div>
                        <div className="mt-0.5 flex gap-1">
                          {r.disciplines.map(d => (
                            <AsPill key={d} tone={d === "spuit" ? "pink" : "blue"}>{d === "spuit" ? "Schadeherstel" : "Werkplaats"}</AsPill>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-bold tabular-nums">{eur(r.revenue)}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{r.hours > 0 ? num(r.hours, 1) : <NoData label="—" />}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{r.hours > 0 ? eur(r.perHour) : <NoData label="geen uren" />}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{num(r.tasks, 0)}</td>
                      <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{r.parts ? num(r.parts, 0) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Block>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name} — recent werk</SheetTitle>
          </SheetHeader>
          {periodStats && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12.5px] text-slate-700">
              <div>Uren {raw?.rangeLabel}: <b>{num(periodStats.fair, 1)} u</b>
                {periodStats.sum - periodStats.fair > 0.05 && <span className="text-slate-500"> (som losse timers {num(periodStats.sum, 1)} u — overlap 1× geteld)</span>}</div>
              {periodStats.suspicious > 0 && (
                <div className="mt-1 font-medium text-amber-700">⚠ {periodStats.suspicious} verdachte {periodStats.suspicious === 1 ? "timer" : "timers"} (liep door over de nacht of &gt; 10 uur) — uren tellen mee zoals geregistreerd</div>
              )}
            </div>
          )}
          <div className="mt-4">
            {raw && <PerformanceGroupCards raw={raw} groups={groups} revenue={revenue} nameOf={nameOf} />}
          </div>
        </SheetContent>
      </Sheet>
    </RapportagesShell>
  );
};

export default RapportagePerformance;
