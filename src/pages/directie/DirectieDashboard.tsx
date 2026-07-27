import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, TrendingUp, TrendingDown, Wrench, Clock, ShieldIcon,
  AlertTriangle, Car, Users, RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AsPage, AsCard, AsPill, AsLicensePlate, AsMono } from "@/components/aftersales/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  fetchDirectieRaw, buildRange, sent, sum, delta, hoursOf, branchStats, monthlyTrend,
  employeeKpis, flowStats, warrantyStats, topVehicles, wipEstimate, downloadCsv,
  type DirectiePeriod, type DirectieBranch, type EmployeeKpi,
} from "@/services/directieService";

const eur = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const num = (n: number, d = 1) => (n || 0).toLocaleString("nl-NL", { maximumFractionDigits: d });

const PERIODS: { k: DirectiePeriod; label: string }[] = [
  { k: "week", label: "Deze week" },
  { k: "month", label: "Maand" },
  { k: "quarter", label: "Kwartaal" },
  { k: "year", label: "Jaar" },
];
const BRANCHES: { k: DirectieBranch; label: string }[] = [
  { k: "all", label: "Alle" },
  { k: "rotterdam", label: "Rotterdam" },
  { k: "heerhugowaard", label: "Heerhugowaard" },
];

const Delta: React.FC<{ pct: number }> = ({ pct }) => {
  const up = pct >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", up ? "text-emerald-600" : "text-red-600")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{num(pct, 0)}%
    </span>
  );
};

const Stat: React.FC<{ label: string; value: string; pct?: number; sub?: string }> = ({ label, value, pct, sub }) => (
  <AsCard className="p-4">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-[22px] font-bold tabular-nums text-slate-900">{value}</div>
    <div className="mt-0.5 flex items-center gap-2">
      {typeof pct === "number" && <Delta pct={pct} />}
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  </AsCard>
);

const Block: React.FC<{ title: string; icon?: React.ReactNode; onExport?: () => void; children: React.ReactNode; onClick?: () => void }> = ({
  title, icon, onExport, children, onClick,
}) => (
  <AsCard className="p-4">
    <div className="flex items-center justify-between mb-3">
      <button type="button" onClick={onClick} disabled={!onClick} className="flex items-center gap-2 text-left disabled:cursor-default">
        {icon}
        <span className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</span>
      </button>
      {onExport && (
        <button
          type="button" onClick={onExport}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      )}
    </div>
    {children}
  </AsCard>
);

const DirectieDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = React.useState<DirectiePeriod>("month");
  const [branch, setBranch] = React.useState<DirectieBranch>("all");
  const [employee, setEmployee] = React.useState<EmployeeKpi | null>(null);

  const { data: raw, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["directie", period, branch],
    queryFn: () => fetchDirectieRaw(period, branch),
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const range = buildRange(period);

  const m = React.useMemo(() => {
    if (!raw) return null;
    const cur = sent(raw.invoices);
    const prev = sent(raw.invoicesPrev);
    const total = sum(cur), totalPrev = sum(prev);
    const intern = sum(cur.filter(i => i.invoice_kind === "intern"));
    const internPrev = sum(prev.filter(i => i.invoice_kind === "intern"));
    const extern = sum(cur.filter(i => i.invoice_kind !== "intern"));
    const externPrev = sum(prev.filter(i => i.invoice_kind !== "intern"));
    const hours = hoursOf(raw.orders), hoursPrev = hoursOf(raw.ordersPrev);
    return {
      total, intern, extern, hours,
      dTotal: delta(total, totalPrev), dIntern: delta(intern, internPrev),
      dExtern: delta(extern, externPrev), dHours: delta(hours, hoursPrev),
      werkplaats: branchStats(raw.invoices, raw.orders, "werkplaats"),
      schade: branchStats(raw.invoices, raw.orders, "spuit"),
      trend: monthlyTrend(raw.invoices6m),
      wip: wipEstimate(raw),
      employees: employeeKpis(raw),
      flow: flowStats(raw),
      warranty: warrantyStats(raw),
      top: topVehicles(raw),
    };
  }, [raw]);

  const bestPerHour = m?.employees.length
    ? m.employees.reduce((a, b) => (b.perHour > a.perHour ? b : a)).id
    : null;

  const failedInvoices = (raw?.invoicesOpen || []).length;
  const openParts = (raw?.parts || []).length;
  const staleOrders = (raw?.ordersOpen || []).filter(o => (Date.now() - +new Date(o.created_at)) / 86400000 > 14);

  return (
    <DashboardLayout>
      <AsPage>
        {/* Kop + filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[19px] font-bold tracking-tight text-slate-900">Directie-cockpit</h1>
              <p className="text-[12px] text-slate-500">
                Operationeel overzicht · {range.from.toLocaleDateString("nl-NL")} t/m {new Date(range.to.getTime() - 1).toLocaleDateString("nl-NL")} · alleen-lezen
              </p>
            </div>
            <button
              type="button" onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 min-h-[40px] text-[12px] font-semibold text-slate-700"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Verversen
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
              {PERIODS.map(p => (
                <button
                  key={p.k} type="button" onClick={() => setPeriod(p.k)}
                  className={cn("px-3 py-1.5 rounded-md text-[12px] font-semibold", period === p.k ? "bg-slate-900 text-white" : "text-slate-600")}
                >{p.label}</button>
              ))}
            </div>
            <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
              {BRANCHES.map(b => (
                <button
                  key={b.k} type="button" onClick={() => setBranch(b.k)}
                  className={cn("px-3 py-1.5 rounded-md text-[12px] font-semibold", branch === b.k ? "bg-blue-600 text-white" : "text-slate-600")}
                >{b.label}</button>
              ))}
            </div>
          </div>
        </div>

        {isLoading || !m ? (
          <div className="text-[13px] text-slate-500">Cijfers laden…</div>
        ) : (
          <div className="space-y-4">
            {/* A. Kerncijfers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="Totale omzet excl. btw" value={eur(m.total)} pct={m.dTotal} />
              <Stat label="Omzet intern" value={eur(m.intern)} pct={m.dIntern} />
              <Stat label="Omzet extern" value={eur(m.extern)} pct={m.dExtern} />
              <Stat label="Geregistreerde uren" value={`${num(m.hours)} u`} pct={m.dHours} />
            </div>

            {/* B. Omzet per tak */}
            <Block
              title="Omzet per tak"
              icon={<Wrench className="h-4 w-4 text-slate-500" />}
              onExport={() => downloadCsv("omzet-per-tak.csv", [
                { tak: "Werkplaats", ...m.werkplaats },
                { tak: "Schadeherstel", ...m.schade },
              ])}
            >
              <div className="grid md:grid-cols-2 gap-3">
                {[{ label: "🔧 Werkplaats", s: m.werkplaats }, { label: "🎨 Schadeherstel", s: m.schade }].map(({ label, s }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-[#f8f9fb] p-3">
                    <div className="text-[12px] font-semibold text-slate-800">{label}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-slate-500">Intern</span><div className="font-semibold tabular-nums">{eur(s.internal)}</div></div>
                      <div><span className="text-slate-500">Extern</span><div className="font-semibold tabular-nums">{eur(s.external)}</div></div>
                      <div><span className="text-slate-500">Orders</span><div className="font-semibold tabular-nums">{s.count}</div></div>
                      <div><span className="text-slate-500">Gem. per order</span><div className="font-semibold tabular-nums">{eur(s.avg)}</div></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: any) => eur(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="intern" name="Intern" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="extern" name="Extern" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Onderhanden werk: {eur(m.wip)} indicatief — facturen blijven de harde basis.
              </div>
            </Block>

            {/* C. Medewerker-KPI's */}
            <Block
              title="Medewerker-KPI's"
              icon={<Users className="h-4 w-4 text-slate-500" />}
              onExport={() => downloadCsv("medewerker-kpis.csv", m.employees.map(e => ({
                medewerker: e.name, afgerond: e.done, uren: num(e.hours), omzet: Math.round(e.revenue),
                omzet_per_uur: Math.round(e.perHour), afkeur_pct: num(e.rejectPct, 0), gem_klustijd_min: Math.round(e.avgMinutes),
              })))}
            >
              {m.employees.length === 0 ? (
                <div className="text-[12px] text-slate-500">Geen toegewezen taken in deze periode.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-2 font-medium">Medewerker</th>
                          <th className="py-2 font-medium text-right">Afgerond</th>
                          <th className="py-2 font-medium text-right">Uren</th>
                          <th className="py-2 font-medium text-right">Omzet</th>
                          <th className="py-2 font-medium text-right">Omzet/uur</th>
                          <th className="py-2 font-medium text-right">Afkeur %</th>
                          <th className="py-2 font-medium text-right">Gem. klustijd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.employees.map(e => (
                          <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setEmployee(e)}>
                            <td className="py-2 font-medium text-slate-900">
                              {e.id === bestPerHour && <span className="mr-1">🏆</span>}{e.name}
                            </td>
                            <td className="py-2 text-right tabular-nums">{e.done}</td>
                            <td className="py-2 text-right tabular-nums">{num(e.hours)}</td>
                            <td className="py-2 text-right tabular-nums">{eur(e.revenue)}</td>
                            <td className="py-2 text-right tabular-nums">{eur(e.perHour)}</td>
                            <td className="py-2 text-right tabular-nums">{num(e.rejectPct, 0)}%</td>
                            <td className="py-2 text-right tabular-nums">{Math.round(e.avgMinutes)} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {m.employees.map(e => (
                      <div key={e.id} onClick={() => setEmployee(e)} className="rounded-xl border border-slate-200 bg-[#f8f9fb] p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[13px] font-semibold text-slate-900">
                            {e.id === bestPerHour && "🏆 "}{e.name}
                          </div>
                          <AsPill tone="blue">{eur(e.perHour)}/u</AsPill>
                        </div>
                        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                          <div>{e.done} taken</div><div>{num(e.hours)} u</div><div>{eur(e.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Block>

            {/* D. Doorstroom */}
            <Block
              title="Doorstroom & snelheid"
              icon={<Clock className="h-4 w-4 text-slate-500" />}
              onExport={() => downloadCsv("doorstroom.csv", [{
                gem_doorlooptijd_dagen: num(m.flow.avgLead), wacht_op_schadeherstel: m.flow.waitingRepair,
                oudste_open_taak_dagen: m.flow.oldestDays, spoed_pct: num(m.flow.rushPct, 0), open_taken_pot: m.flow.unassigned,
              }])}
            >
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-[12px]">
                <div><div className="text-slate-500">Inname → poets-klaar</div><div className="text-[16px] font-bold tabular-nums">{num(m.flow.avgLead)} d</div></div>
                <div><div className="text-slate-500">Wacht op schadeherstel</div><div className="text-[16px] font-bold tabular-nums">{m.flow.waitingRepair}</div></div>
                <div>
                  <div className="text-slate-500">Oudste open taak</div>
                  <div className="text-[16px] font-bold tabular-nums">{m.flow.oldestDays} d</div>
                  {m.flow.oldest?.vehicle_id && raw?.vehicles[m.flow.oldest.vehicle_id] && (
                    <AsLicensePlate size="sm" value={raw.vehicles[m.flow.oldest.vehicle_id].license_number} />
                  )}
                </div>
                <div><div className="text-slate-500">Spoed-aandeel</div><div className="text-[16px] font-bold tabular-nums">{num(m.flow.rushPct, 0)}%</div></div>
                <div><div className="text-slate-500">Open taken in de pot</div><div className="text-[16px] font-bold tabular-nums">{m.flow.unassigned}</div></div>
              </div>
            </Block>

            {/* E. Garantie */}
            <Block
              title="Garantie"
              icon={<ShieldIcon className="h-4 w-4 text-slate-500" />}
              onClick={() => navigate("/warranty")}
              onExport={() => downloadCsv("garantie.csv", [m.warranty])}
            >
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-[12px]">
                <div><div className="text-slate-500">Claims</div><div className="text-[16px] font-bold tabular-nums">{m.warranty.total}</div></div>
                <div className="flex flex-wrap items-center gap-1">
                  <AsPill tone="amber">{m.warranty.open} open</AsPill>
                  <AsPill tone="blue">{m.warranty.inProgress} bezig</AsPill>
                  <AsPill tone="green">{m.warranty.done} klaar</AsPill>
                </div>
                <div><div className="text-slate-500">Claimbedrag</div><div className="text-[16px] font-bold tabular-nums">{eur(m.warranty.amount)}</div></div>
                <div><div className="text-slate-500">Gem. afhandeltijd</div><div className="text-[16px] font-bold tabular-nums">{num(m.warranty.avgDays)} d</div></div>
                <div><div className="text-slate-500">Leenauto's uit</div><div className="text-[16px] font-bold tabular-nums">{m.warranty.loanCarsOut}</div></div>
              </div>
            </Block>

            {/* F. Kosten & signalen */}
            <Block
              title="Kosten & signalen"
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              onExport={() => downloadCsv("signalen.csv", [{
                openstaande_onderdelen: openParts, facturen_niet_verstuurd: failedInvoices, taken_ouder_dan_14_dagen: staleOrders.length,
              }])}
            >
              <div className="flex flex-wrap gap-2">
                <AsPill tone={openParts > 0 ? "amber" : "green"}>{openParts} openstaande onderdelen-bestellingen</AsPill>
                <AsPill tone={failedInvoices > 0 ? "red" : "green"}>{failedInvoices} facturen niet verstuurd / mislukt</AsPill>
                <AsPill tone={staleOrders.length > 0 ? "amber" : "green"}>{staleOrders.length} taken &gt; 14 dagen open</AsPill>
              </div>
            </Block>

            {/* G. Auto-toplijst */}
            <Block
              title="Top 5 auto's — herstel-omzet"
              icon={<Car className="h-4 w-4 text-slate-500" />}
              onExport={() => downloadCsv("top-autos.csv", m.top.map(t => ({
                kenteken: t.license_number, merk: t.brand, model: t.model, totaal: Math.round(t.total), delen: t.parts,
              })))}
            >
              {m.top.length === 0 ? (
                <div className="text-[12px] text-slate-500">Geen gefactureerde herstel-omzet in deze periode.</div>
              ) : (
                <div className="space-y-2">
                  {m.top.map((t, i) => (
                    <div key={t.vehicle_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-[#f8f9fb] p-2.5">
                      <span className="text-[12px] font-bold text-slate-400 w-4">{i + 1}</span>
                      <AsLicensePlate size="sm" value={t.license_number} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-slate-900 truncate">{t.brand} {t.model}</div>
                        <AsMono>{t.parts} regels</AsMono>
                      </div>
                      <div className="text-[13px] font-bold tabular-nums">{eur(t.total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Block>
          </div>
        )}

        {/* Medewerker-sheet */}
        <Sheet open={!!employee} onOpenChange={(o) => !o && setEmployee(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="text-[15px]">{employee?.name}</SheetTitle>
            </SheetHeader>
            {employee && raw && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Omzet</div><div className="font-bold">{eur(employee.revenue)}</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Omzet/uur</div><div className="font-bold">{eur(employee.perHour)}</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Afgerond</div><div className="font-bold">{employee.done}</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Uren</div><div className="font-bold">{num(employee.hours)}</div></div>
                </div>
                <div className="text-[12px] font-semibold text-slate-700">Recente taken</div>
                <div className="space-y-2">
                  {raw.orders.filter(o => o.assigned_to === employee.id)
                    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 15)
                    .map(o => (
                      <div key={o.id} className="rounded-lg border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <AsLicensePlate size="sm" value={o.vehicle_id ? raw.vehicles[o.vehicle_id]?.license_number : null} />
                          <AsPill tone={o.status === "goedgekeurd" ? "green" : o.status === "bezig" ? "blue" : "slate"}>{o.status}</AsPill>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-600">
                          {o.discipline} · {new Date(o.created_at).toLocaleDateString("nl-NL")} · {num((o.work_seconds || 0) / 3600)} u
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </AsPage>
    </DashboardLayout>
  );
};

export default DirectieDashboard;
