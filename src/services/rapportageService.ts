import { supabase } from "@/integrations/supabase/client";
import { buildRange, downloadCsv, type DirectiePeriod, type DirectieBranch } from "@/services/directieService";

/** Vaste snelkeuzes + "custom" (eigen van–tot bereik). */
export type RapPeriod = DirectiePeriod | "prev_month" | "prev_quarter" | "prev_year" | "custom";
export type RapBranch = DirectieBranch;
export { buildRange, downloadCsv };

/** Keuze zoals die in de URL staat. customFrom/customTo zijn yyyy-MM-dd (inclusief einddag). */
export interface RapSelection { period: RapPeriod; customFrom?: string | null; customTo?: string | null }

export interface RapResolved {
  from: Date; to: Date; prevFrom: Date; prevTo: Date;
  trendFrom: Date; trendTo: Date;
  label: string; slug: string;
}

const d2 = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${d2(d.getMonth() + 1)}-${d2(d.getDate())}`;
const nlDate = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const parseDay = (s?: string | null) => {
  if (!s) return null;
  const [y, m, day] = s.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
};

/** Laatste 6 maanden (voor de vaste periodes), of de maanden rond een eigen bereik (max 12). */
const trendWindow = (from: Date, to: Date, custom: boolean): { trendFrom: Date; trendTo: Date } => {
  if (!custom) {
    const t = new Date(); t.setMonth(t.getMonth() - 5); t.setDate(1); t.setHours(0, 0, 0, 0);
    const end = new Date(t.getFullYear(), t.getMonth() + 6, 1);
    return { trendFrom: t, trendTo: end };
  }
  const start = monthStart(from);
  const endExcl = new Date(to.getFullYear(), to.getMonth() + 1, 1);
  let months = (endExcl.getFullYear() - start.getFullYear()) * 12 + (endExcl.getMonth() - start.getMonth());
  if (months > 12) return { trendFrom: new Date(endExcl.getFullYear(), endExcl.getMonth() - 12, 1), trendTo: endExcl };
  return { trendFrom: start, trendTo: endExcl };
};

/** Maandbuckets [start, next) binnen een venster. */
export function monthBuckets(trendFrom: Date, trendTo: Date) {
  const out: { key: string; label: string; from: Date; to: Date }[] = [];
  let d = monthStart(trendFrom);
  while (+d < +trendTo && out.length < 24) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    out.push({
      key: `${d.getFullYear()}-${d2(d.getMonth() + 1)}`,
      label: d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
      from: d, to: next,
    });
    d = next;
  }
  return out;
}

/** Zet een keuze om in concrete datumvensters. Vaste periodes gebruiken de bestaande buildRange. */
export function resolveRange(sel: RapSelection, now = new Date()): RapResolved {
  const p = sel.period;
  if (p === "custom") {
    const a = parseDay(sel.customFrom), b = parseDay(sel.customTo);
    if (a && b) {
      const from = new Date(a); from.setHours(0, 0, 0, 0);
      const to = new Date(b); to.setHours(0, 0, 0, 0); to.setDate(to.getDate() + 1); // einddag inclusief
      const span = +to - +from;
      const prevTo = from;
      const prevFrom = new Date(+from - span);
      const { trendFrom, trendTo } = trendWindow(from, new Date(+to - 1), true);
      return {
        from, to, prevFrom, prevTo, trendFrom, trendTo,
        label: `${nlDate(from)} t/m ${nlDate(new Date(+to - 86400000))}`,
        slug: `${iso(from)}_${iso(new Date(+to - 86400000))}`,
      };
    }
    // onvolledige keuze → val terug op deze maand
    return resolveRange({ period: "month" }, now);
  }

  let base: DirectiePeriod = "month";
  let ref = now;
  if (p === "week") base = "week";
  else if (p === "month") base = "month";
  else if (p === "quarter") base = "quarter";
  else if (p === "year") base = "year";
  else if (p === "prev_month") { base = "month"; ref = new Date(now.getFullYear(), now.getMonth() - 1, 15); }
  else if (p === "prev_quarter") { base = "quarter"; ref = new Date(now.getFullYear(), now.getMonth() - 3, 15); }
  else if (p === "prev_year") { base = "year"; ref = new Date(now.getFullYear() - 1, 6, 1); }

  const r = buildRange(base, ref);
  const { trendFrom, trendTo } = trendWindow(r.from, r.to, false);
  const labels: Record<string, string> = {
    week: "Deze week", month: "Deze maand", quarter: "Dit kwartaal", year: "Dit jaar",
    prev_month: "Vorige maand", prev_quarter: "Vorig kwartaal", prev_year: "Vorig jaar",
  };
  return {
    ...r, trendFrom, trendTo,
    label: labels[p] || p,
    slug: `${iso(r.from)}_${iso(new Date(+r.to - 86400000))}`,
  };
}

/** Minimaal aantal observaties voordat een gemiddelde eerlijk is. */
export const MIN_N = 3;


export interface RapInvoice {
  id: string; invoice_kind: string | null; subtotal: number | null; total: number | null;
  status: string | null; created_at: string; branch: string | null; vehicle_id: string | null;
  lines: any; source_work_order_ids: any; work_order_id: string | null;
}
export interface RapOrder {
  id: string; vehicle_id: string | null; discipline: string | null; status: string | null;
  work_seconds: number | null; assigned_to: string | null; created_at: string;
  started_at: string | null; finished_at: string | null; approved_at: string | null;
  is_rush: boolean | null; rejected_count: number | null; branch: string | null;
  origin: string | null; part: string | null; parts: any; poets_type: string | null;
}
export interface RapIntake { id: string; vehicle_id: string | null; created_at: string; approved_at: string | null; status: string | null; branch: string | null }
export interface RapVehicle {
  id: string; branch: string | null; status: string | null; aangekomen_at: string | null;
  sold_date: string | null; delivery_date: string | null; b2b_delivered_at: string | null; details: any;
}
export interface RapProfile { id: string; first_name: string | null; last_name: string | null; poetser_type?: string | null }

export interface RapRaw {
  from: Date; to: Date; prevFrom: Date; prevTo: Date; sixM: Date;
  invoices: RapInvoice[];       // periode
  invoicesPrev: RapInvoice[];   // vorige periode
  invoices6m: RapInvoice[];     // laatste 6 maanden (trend)
  orders: RapOrder[];           // laatste 6 maanden (alles, filteren in memory)
  intakes: RapIntake[];
  vehicles: RapVehicle[];
  vehicleInfo: Record<string, { brand: string | null; model: string | null; license_number: string | null }>;
  profiles: RapProfile[];
}

const bf = (q: any, branch: RapBranch) => (branch === "all" ? q : q.eq("branch", branch));

export async function fetchRapportageRaw(period: RapPeriod, branch: RapBranch): Promise<RapRaw> {
  const { from, to, prevFrom, prevTo } = buildRange(period);
  const sixM = new Date(); sixM.setMonth(sixM.getMonth() - 5); sixM.setDate(1); sixM.setHours(0, 0, 0, 0);
  const histStart = new Date(Math.min(sixM.getTime(), prevFrom.getTime()));

  const invSel = "id,invoice_kind,subtotal,total,status,created_at,branch,vehicle_id,lines,source_work_order_ids,work_order_id";
  const woSel = "id,vehicle_id,discipline,status,work_seconds,assigned_to,created_at,started_at,finished_at,approved_at,is_rush,rejected_count,branch,origin,part,parts,poets_type";

  const [inv6m, wo, intakes, veh, profiles] = await Promise.all([
    bf(supabase.from("workshop_invoices").select(invSel).gte("created_at", histStart.toISOString()), branch),
    bf(supabase.from("work_orders").select(woSel).gte("created_at", histStart.toISOString()), branch),
    bf(supabase.from("vehicle_intakes").select("id,vehicle_id,created_at,approved_at,status,branch").gte("created_at", histStart.toISOString()), branch),
    bf(supabase.from("vehicles").select("id,branch,status,aangekomen_at,sold_date,delivery_date,b2b_delivered_at,details").gte("updated_at", histStart.toISOString()), branch),
    supabase.from("profiles").select("id,first_name,last_name,poetser_type"),
  ]);

  const invoices6m = (inv6m.data || []) as any as RapInvoice[];
  const orders = (wo.data || []) as any as RapOrder[];
  const inRange = (iso: string, a: Date, b: Date) => { const t = +new Date(iso); return t >= +a && t < +b; };

  const vehicleIds = Array.from(new Set(orders.map(o => o.vehicle_id).filter(Boolean))) as string[];
  const vehicleInfo: RapRaw["vehicleInfo"] = {};
  if (vehicleIds.length) {
    const { data } = await supabase.from("vehicles").select("id,brand,model,license_number").in("id", vehicleIds.slice(0, 800));
    (data || []).forEach((v: any) => { vehicleInfo[v.id] = { brand: v.brand, model: v.model, license_number: v.license_number }; });
  }

  return {
    from, to, prevFrom, prevTo, sixM,
    invoices: invoices6m.filter(i => inRange(i.created_at, from, to)),
    invoicesPrev: invoices6m.filter(i => inRange(i.created_at, prevFrom, prevTo)),
    invoices6m,
    orders,
    intakes: (intakes.data || []) as any,
    vehicles: (veh.data || []) as any,
    vehicleInfo,
    profiles: (profiles.data || []) as any,
  };
}

/* ------------------------------ helpers ------------------------------ */

export const sentOnly = (rows: RapInvoice[]) => rows.filter(r => r.status === "verstuurd");
export const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const div = (a: number, b: number) => (b > 0 ? a / b : 0);
export const inRange = (iso?: string | null, a?: Date, b?: Date) => {
  if (!iso || !a || !b) return false;
  const t = +new Date(iso);
  return t >= +a && t < +b;
};
export const isDone = (o: RapOrder) => ["afgerond", "goedgekeurd"].includes(o.status || "");
const doneAt = (o: RapOrder) => o.finished_at || o.approved_at || o.created_at;
export const doneInPeriod = (o: RapOrder, a: Date, b: Date) => isDone(o) && inRange(doneAt(o), a, b);
export const partCount = (o: RapOrder) => {
  const p = o.parts;
  if (Array.isArray(p) && p.length) return p.length;
  return o.part ? 1 : 1;
};
const lineAmount = (l: any) => Number(l?.amount ?? l?.total ?? 0);
const isSchadeLine = (l: any) => String(l?.description || "").toLowerCase().startsWith("schadeherstel");

/** Bedragen per discipline binnen één factuur (op basis van de factuurregels). */
export function splitInvoice(inv: RapInvoice) {
  const lines: any[] = Array.isArray(inv.lines) ? inv.lines : [];
  let schade = 0, schadeParts = 0, werk = 0;
  lines.forEach(l => {
    if (isSchadeLine(l)) { schade += lineAmount(l); schadeParts += 1; }
    else werk += lineAmount(l);
  });
  if (!lines.length) werk = Number(inv.subtotal || 0);
  return { schade, schadeParts, werk, kind: inv.invoice_kind === "intern" ? "intern" : "extern" as "intern" | "extern" };
}

/* ------------------------------ A. Omzet ------------------------------ */

export interface OmzetGroup {
  intern: number; extern: number; total: number; invoices: number; parts: number;
  avgPerInvoice: number; avgPerPart: number;
}
export interface OmzetStats {
  schade: OmzetGroup; werkplaats: OmzetGroup; poets: OmzetGroup;
  totaal: number;
  trend: { month: string; schade: number; werkplaats: number; poets: number }[];
}

const emptyGroup = (): OmzetGroup => ({ intern: 0, extern: 0, total: 0, invoices: 0, parts: 0, avgPerInvoice: 0, avgPerPart: 0 });

/**
 * BRONKEUZE (leidend, voorkomt dubbeltelling):
 * - Schadeherstel + werkplaats: workshop_invoices (status 'verstuurd'), regels per discipline.
 * - Poetsen: de work_orders zelf (afgeronde poets-orders van INTERNE poetsers × POETS_PRICE_EXCL),
 *   exact dezelfde bron/berekening als /rapportages/poetsen. De maandelijkse interne poetsfactuur
 *   (invoice_kind 'poets_intern') wordt daarom hier UITGESLOTEN — anders zou poets-omzet twee keer
 *   meetellen, en zou hij in de factuurmaand vallen i.p.v. de maand van de poetsbeurt.
 */
const isPoetsInvoice = (inv: RapInvoice) => (inv as any).invoice_kind === "poets_intern";
const revenueInvoices = (rows: RapInvoice[]) => sentOnly(rows).filter(r => !isPoetsInvoice(r));

export function omzetGroups(invoices: RapInvoice[]): { schade: OmzetGroup; werkplaats: OmzetGroup } {
  const schade = emptyGroup(), werkplaats = emptyGroup();
  revenueInvoices(invoices).forEach(inv => {
    const s = splitInvoice(inv);
    if (s.schade > 0) {
      schade[s.kind] += s.schade; schade.total += s.schade; schade.invoices += 1; schade.parts += s.schadeParts;
    }
    if (s.werk > 0) {
      werkplaats[s.kind] += s.werk; werkplaats.total += s.werk; werkplaats.invoices += 1; werkplaats.parts += 1;
    }
  });
  [schade, werkplaats].forEach(g => {
    g.avgPerInvoice = div(g.total, g.invoices);
    g.avgPerPart = div(g.total, g.parts);
  });
  return { schade, werkplaats };
}

/** Poets-omzet als omzetcategorie (ex btw), bron = work_orders (zie BRONKEUZE hierboven). */
export function poetsOmzetGroup(raw: RapRaw, from = raw.from, to = raw.to): OmzetGroup {
  const p = poetsStats(raw, from, to);
  const g = emptyGroup();
  g.intern = p.revenueExcl;      // interne poetsers = onze omzet
  g.extern = 0;                  // externe poetsbeurten leveren ons geen omzet op
  g.total = p.revenueExcl;
  g.invoices = p.internCars;     // 1 poetsbeurt = 1 "order"
  g.parts = p.internCars;
  g.avgPerInvoice = div(g.total, g.invoices);
  g.avgPerPart = div(g.total, g.parts);
  return g;
}

export function omzetStats(raw: RapRaw): OmzetStats {
  const { schade, werkplaats } = omzetGroups(raw.invoices);
  const poets = poetsOmzetGroup(raw);
  const trend: OmzetStats["trend"] = [];
  const now = new Date();
  const poetsMonths = poetsStats(raw, raw.sixM, new Date(Date.now() + 86400000)).months;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    let s = 0, w = 0;
    revenueInvoices(raw.invoices6m).filter(r => inRange(r.created_at, d, next)).forEach(r => {
      const x = splitInvoice(r); s += x.schade; w += x.werk;
    });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trend.push({
      month: d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
      schade: s, werkplaats: w,
      poets: poetsMonths.find(m => m.monthKey === key)?.revenueExcl ?? 0,
    });
  }
  return { schade, werkplaats, poets, totaal: schade.total + werkplaats.total + poets.total, trend };
}


/* --------------------- omzet-toerekening per order --------------------- */

export function revenueByOrder(raw: RapRaw, invoices: RapInvoice[]) {
  const byId = new Map(raw.orders.map(o => [o.id, o]));
  const map = new Map<string, number>();
  const add = (id: string, v: number) => map.set(id, (map.get(id) || 0) + v);
  sentOnly(invoices).forEach(inv => {
    const ids: string[] = Array.isArray(inv.source_work_order_ids)
      ? inv.source_work_order_ids.filter(Boolean)
      : (inv.work_order_id ? [inv.work_order_id] : []);
    if (!ids.length) return;
    const s = splitInvoice(inv);
    const schadeIds = ids.filter(id => byId.get(id)?.discipline === "spuit");
    const werkIds = ids.filter(id => byId.get(id)?.discipline === "werkplaats");
    if (s.schade > 0) {
      const t = schadeIds.length ? schadeIds : ids;
      t.forEach(id => add(id, s.schade / t.length));
    }
    if (s.werk > 0) {
      const t = werkIds.length ? werkIds : ids;
      t.forEach(id => add(id, s.werk / t.length));
    }
  });
  return map;
}

/* ------------------- B. Performance medewerkers ------------------- */

export interface EmployeeRow {
  id: string; name: string; disciplines: string[];
  revenue: number; hours: number; perHour: number;
  tasks: number; parts: number; rejects: number; avgMinutes: number;
}

export function employeeRows(raw: RapRaw, from = raw.from, to = raw.to): EmployeeRow[] {
  const rev = revenueByOrder(raw, raw.invoices6m.filter(i => inRange(i.created_at, from, to)));
  const nameOf = (id: string) => {
    const p = raw.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Onbekend";
  };
  const map = new Map<string, EmployeeRow>();
  raw.orders
    // poetsen is extern → nooit een persoons-KPI
    .filter(o => o.assigned_to && ["werkplaats", "spuit"].includes(o.discipline || ""))
    .filter(o => doneInPeriod(o, from, to))
    .forEach(o => {
      const id = o.assigned_to as string;
      if (!map.has(id)) map.set(id, { id, name: nameOf(id), disciplines: [], revenue: 0, hours: 0, perHour: 0, tasks: 0, parts: 0, rejects: 0, avgMinutes: 0 });
      const e = map.get(id)!;
      if (o.discipline && !e.disciplines.includes(o.discipline)) e.disciplines.push(o.discipline);
      e.tasks += 1;
      e.hours += Number(o.work_seconds || 0) / 3600;
      e.revenue += rev.get(o.id) || 0;
      e.rejects += Number(o.rejected_count || 0);
      if (o.discipline === "spuit") e.parts += partCount(o);
    });
  return Array.from(map.values()).map(e => ({
    ...e,
    perHour: div(e.revenue, e.hours),
    avgMinutes: div(e.hours * 60, e.tasks),
  })).sort((a, b) => b.revenue - a.revenue);
}

export function employeeOrders(raw: RapRaw, employeeId: string, limit = 15) {
  return raw.orders
    .filter(o => o.assigned_to === employeeId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit)
    .map(o => ({ ...o, vehicle: o.vehicle_id ? raw.vehicleInfo[o.vehicle_id] : undefined }));
}

/* ------------------------- C. KPI-dashboard ------------------------- */

export interface Kpi { key: string; label: string; value: number; prev: number; unit: "eur" | "h" | "num" | "pct" | "min" | "d"; n: number; higherIsBetter: boolean }

const kpi = (key: string, label: string, value: number, prev: number, unit: Kpi["unit"], n: number, higherIsBetter = true): Kpi =>
  ({ key, label, value, prev, unit, n, higherIsBetter });

const weeksIn = (a: Date, b: Date) => Math.max(1, (+b - +a) / (7 * 86400000));

function monteurBlock(raw: RapRaw, from: Date, to: Date) {
  const done = raw.orders.filter(o => o.discipline === "werkplaats" && doneInPeriod(o, from, to));
  const created = raw.orders.filter(o => o.discipline === "werkplaats" && inRange(o.created_at, from, to));
  const hours = done.reduce((a, o) => a + Number(o.work_seconds || 0) / 3600, 0);
  const rev = revenueByOrder(raw, raw.invoices6m.filter(i => inRange(i.created_at, from, to)));
  const revenue = done.reduce((a, o) => a + (rev.get(o.id) || 0), 0);
  const pickup = created.filter(o => o.started_at).map(o => (+new Date(o.started_at as string) - +new Date(o.created_at)) / 3600000).filter(x => x >= 0);
  return {
    revenue, hours, perHour: div(revenue, hours), done: done.length,
    avgMinutes: div(hours * 60, done.length),
    pickupHours: avg(pickup), pickupN: pickup.length,
    rushPct: created.length ? (created.filter(o => o.is_rush).length / created.length) * 100 : 0,
    n: done.length,
  };
}

function schadeBlock(raw: RapRaw, from: Date, to: Date) {
  const done = raw.orders.filter(o => o.discipline === "spuit" && doneInPeriod(o, from, to));
  const hours = done.reduce((a, o) => a + Number(o.work_seconds || 0) / 3600, 0);
  const parts = done.reduce((a, o) => a + partCount(o), 0);
  const rev = revenueByOrder(raw, raw.invoices6m.filter(i => inRange(i.created_at, from, to)));
  const revenue = done.reduce((a, o) => a + (rev.get(o.id) || 0), 0);
  const rejects = done.reduce((a, o) => a + Number(o.rejected_count || 0), 0);
  const lead = done.filter(o => o.finished_at).map(o => (+new Date(o.finished_at as string) - +new Date(o.created_at)) / 86400000).filter(x => x >= 0);
  return {
    revenue, hours, perHour: div(revenue, hours), parts,
    partsPerWeek: div(parts, weeksIn(from, to)),
    minutesPerPart: div(hours * 60, parts),
    rejectPct: done.length ? (rejects / done.length) * 100 : 0,
    leadDays: avg(lead), leadN: lead.length, n: done.length,
  };
}

function uitdeukBlock(raw: RapRaw, from: Date, to: Date) {
  const done = raw.orders.filter(o => o.discipline === "uitdeuk" && doneInPeriod(o, from, to));
  const days = done.map(o => (+new Date(o.finished_at || o.approved_at || o.created_at) - +new Date(o.created_at)) / 86400000).filter(x => x >= 0);
  return { done: done.length, avgDays: avg(days), n: done.length };
}

function poetsBlock(raw: RapRaw, from: Date, to: Date) {
  const done = raw.orders.filter(o => o.discipline === "poets" && doneInPeriod(o, from, to));
  const showroom = done.filter(o => (o.poets_type || "showroom") === "showroom").length;
  return { total: done.length, showroom, aflevering: done.length - showroom, n: done.length };
}

export interface KpiDashboard {
  monteurs: Kpi[]; schade: Kpi[]; uitdeuk: Kpi[]; poets: Kpi[];
}

export function kpiDashboard(raw: RapRaw): KpiDashboard {
  const m = monteurBlock(raw, raw.from, raw.to), mp = monteurBlock(raw, raw.prevFrom, raw.prevTo);
  const s = schadeBlock(raw, raw.from, raw.to), sp = schadeBlock(raw, raw.prevFrom, raw.prevTo);
  const u = uitdeukBlock(raw, raw.from, raw.to), up = uitdeukBlock(raw, raw.prevFrom, raw.prevTo);
  const p = poetsBlock(raw, raw.from, raw.to), pp = poetsBlock(raw, raw.prevFrom, raw.prevTo);
  return {
    monteurs: [
      kpi("m_perhour", "Omzet per uur", m.perHour, mp.perHour, "eur", m.n),
      kpi("m_hours", "Gewerkte uren", m.hours, mp.hours, "h", m.n),
      kpi("m_done", "Afgeronde beurten", m.done, mp.done, "num", m.n),
      kpi("m_avg", "Gem. klustijd per beurt", m.avgMinutes, mp.avgMinutes, "min", m.n, false),
      kpi("m_pickup", "Oppaksnelheid (aanmaak → start)", m.pickupHours, mp.pickupHours, "h", m.pickupN, false),
      kpi("m_rush", "Spoed-aandeel", m.rushPct, mp.rushPct, "pct", m.n, false),
    ],
    schade: [
      kpi("s_perhour", "Omzet per uur", s.perHour, sp.perHour, "eur", s.n),
      kpi("s_parts", "Delen per week", s.partsPerWeek, sp.partsPerWeek, "num", s.n),
      kpi("s_minpart", "Gem. tijd per deel", s.minutesPerPart, sp.minutesPerPart, "min", s.n, false),
      kpi("s_reject", "Afkeurpercentage", s.rejectPct, sp.rejectPct, "pct", s.n, false),
      kpi("s_lead", "Doorlooptijd per order", s.leadDays, sp.leadDays, "d", s.leadN, false),
    ],
    uitdeuk: [
      kpi("u_done", "Afgeronde orders", u.done, up.done, "num", u.n),
      kpi("u_days", "Gem. dagen open", u.avgDays, up.avgDays, "d", u.n, false),
    ],
    poets: [
      kpi("p_total", "Gepoetste auto's", p.total, pp.total, "num", p.n),
      kpi("p_afl", "Afleveringen", p.aflevering, pp.aflevering, "num", p.n),
      kpi("p_show", "Showroom", p.showroom, pp.showroom, "num", p.n),
    ],
  };
}

/* ----------------------- D. Doorlooptijden ----------------------- */

export interface FlowStep {
  key: string; label: string; avgDays: number; n: number;
  weekly: { week: string; days: number; n: number }[];
  extra?: string;
}

interface Sample { at: Date; days: number }

const stepFrom = (key: string, label: string, samples: Sample[], from: Date, to: Date, extra?: string): FlowStep => {
  const inWin = samples.filter(s => +s.at >= +from && +s.at < +to);
  const weekly: FlowStep["weekly"] = [];
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(end); wStart.setDate(wStart.getDate() - i * 7 - 7);
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 7);
    const rows = samples.filter(s => +s.at >= +wStart && +s.at < +wEnd);
    weekly.push({
      week: wStart.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" }),
      days: avg(rows.map(r => r.days)), n: rows.length,
    });
  }
  return { key, label, avgDays: avg(inWin.map(s => s.days)), n: inWin.length, weekly, extra };
};

export interface FlowResult { steps: FlowStep[]; bottleneck: string | null; onTimePct: number | null; onTimeN: number }

export function flowSteps(raw: RapRaw): FlowResult {
  const { from, to } = raw;
  const vehById = new Map(raw.vehicles.map(v => [v.id, v]));
  const days = (a?: string | null, b?: string | null) => {
    if (!a || !b) return null;
    const d = (+new Date(b) - +new Date(a)) / 86400000;
    return d >= 0 && d < 400 ? d : null;
  };

  // 1. Transport binnen → inname afgerond
  const s1: Sample[] = [];
  raw.intakes.filter(i => i.approved_at).forEach(i => {
    const v = i.vehicle_id ? vehById.get(i.vehicle_id) : undefined;
    const d = days(v?.aangekomen_at, i.approved_at);
    if (d !== null) s1.push({ at: new Date(i.approved_at as string), days: d });
  });

  // 2. Inname afgerond → laatste herstelorder goedgekeurd
  const lastRepair = new Map<string, string>();
  raw.orders.filter(o => ["spuit", "uitdeuk"].includes(o.discipline || "") && o.approved_at && o.vehicle_id).forEach(o => {
    const cur = lastRepair.get(o.vehicle_id as string);
    if (!cur || +new Date(o.approved_at as string) > +new Date(cur)) lastRepair.set(o.vehicle_id as string, o.approved_at as string);
  });
  const s2: Sample[] = [];
  raw.intakes.filter(i => i.approved_at && i.vehicle_id).forEach(i => {
    const rep = lastRepair.get(i.vehicle_id as string);
    const d = days(i.approved_at, rep);
    if (d !== null && rep) s2.push({ at: new Date(rep), days: d });
  });

  // 3. Poets-order aangemaakt → schoon
  const poetsDone = raw.orders.filter(o => o.discipline === "poets" && isDone(o));
  const s3: Sample[] = [];
  poetsDone.forEach(o => {
    const at = o.finished_at || o.approved_at;
    const d = days(o.created_at, at);
    if (d !== null && at) s3.push({ at: new Date(at), days: d });
  });

  // 4. Totaal rijklaar: transport binnen → poets klaar
  const s4: Sample[] = [];
  poetsDone.forEach(o => {
    const v = o.vehicle_id ? vehById.get(o.vehicle_id) : undefined;
    const at = o.finished_at || o.approved_at;
    const d = days(v?.aangekomen_at, at);
    if (d !== null && at) s4.push({ at: new Date(at), days: d });
  });

  // 5. Afleveringen: verkocht → afgeleverd
  const s5: Sample[] = [];
  let onTimeHit = 0, onTimeN = 0;
  raw.vehicles.forEach(v => {
    const delivered = v.b2b_delivered_at || (v.status === "afgeleverd" ? v.delivery_date : null);
    const d = days(v.sold_date, delivered);
    if (d !== null && delivered) {
      s5.push({ at: new Date(delivered), days: d });
      const planned = v.details?.plannedDeliveryDate || v.details?.afleverDatum || null;
      if (planned) {
        onTimeN += 1;
        if (+new Date(delivered) <= +new Date(planned) + 86400000) onTimeHit += 1;
      }
    }
  });

  const steps = [
    stepFrom("t1", "Transport binnen → inname afgerond", s1, from, to),
    stepFrom("t2", "Inname afgerond → laatste herstel goedgekeurd", s2, from, to),
    stepFrom("t3", "Poets aangemaakt → schoon", s3, from, to),
    stepFrom("t4", "Totaal rijklaar (binnen → poets klaar)", s4, from, to),
    stepFrom("t5", "Verkocht → afgeleverd", s5, from, to),
  ];
  const eligible = steps.filter(s => s.n >= MIN_N);
  const bottleneck = eligible.length ? eligible.reduce((a, b) => (b.avgDays > a.avgDays ? b : a)).key : null;
  return { steps, bottleneck, onTimePct: onTimeN >= MIN_N ? (onTimeHit / onTimeN) * 100 : null, onTimeN };
}

/* ------------------------- E. Poets-specificatie ------------------------- */

/** Interne poetsbeurt: € 100,00 incl. btw per auto (= € 82,64 ex btw). */
export const POETS_PRICE_INCL = 100;
export const POETS_PRICE_EXCL = 82.64;

export interface PoetsPerson {
  id: string; name: string; type: "intern" | "extern";
  cars: number; seconds: number; avgMinutes: number; revenueIncl: number; revenueExcl: number;
}
export interface PoetsTrackRow {
  id: string; date: string; monthKey: string; plate: string; vehicle: string;
  poetserId: string | null; poetser: string; type: "intern" | "extern" | "onbekend";
  minutes: number; poetsType: string;
}
export interface PoetsStats {
  internCars: number; externCars: number; unknownCars: number;
  revenueExcl: number; revenueIncl: number;
  persons: PoetsPerson[];
  months: { month: string; monthKey: string; intern: number; extern: number; revenueIncl: number; revenueExcl: number }[];
  rows: PoetsTrackRow[];
}

const poetsDoneAt = (o: RapOrder) => o.finished_at || o.approved_at || o.created_at;

export function poetsStats(raw: RapRaw, from = raw.from, to = raw.to): PoetsStats {
  const profileOf = (id?: string | null) => raw.profiles.find(p => p.id === id);
  const typeOf = (id?: string | null): "intern" | "extern" | "onbekend" => {
    if (!id) return "onbekend";
    const p = profileOf(id);
    if (!p) return "onbekend";
    return (p.poetser_type === "extern" ? "extern" : "intern");
  };
  const nameOf = (id?: string | null) => {
    const p = profileOf(id);
    const n = p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "";
    return n || "Niet toegewezen";
  };

  const done = raw.orders.filter(o => o.discipline === "poets" && isDone(o));
  const inPeriod = done.filter(o => inRange(poetsDoneAt(o), from, to));

  const rows: PoetsTrackRow[] = inPeriod
    .map(o => {
      const d = new Date(poetsDoneAt(o));
      const v = o.vehicle_id ? raw.vehicleInfo[o.vehicle_id] : undefined;
      return {
        id: o.id,
        date: d.toISOString(),
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        plate: v?.license_number || "—",
        vehicle: [v?.brand, v?.model].filter(Boolean).join(" ") || "—",
        poetserId: o.assigned_to,
        poetser: nameOf(o.assigned_to),
        type: typeOf(o.assigned_to),
        minutes: Math.round(Number(o.work_seconds || 0) / 60),
        poetsType: o.poets_type || "showroom",
      };
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const internCars = rows.filter(r => r.type === "intern").length;
  const externCars = rows.filter(r => r.type === "extern").length;
  const unknownCars = rows.filter(r => r.type === "onbekend").length;

  const pm = new Map<string, PoetsPerson>();
  inPeriod.forEach(o => {
    const t = typeOf(o.assigned_to);
    if (t === "onbekend") return;
    const id = o.assigned_to as string;
    if (!pm.has(id)) pm.set(id, { id, name: nameOf(id), type: t, cars: 0, seconds: 0, avgMinutes: 0, revenueIncl: 0, revenueExcl: 0 });
    const e = pm.get(id)!;
    e.cars += 1;
    e.seconds += Number(o.work_seconds || 0);
  });
  const persons = Array.from(pm.values()).map(e => ({
    ...e,
    avgMinutes: div(e.seconds / 60, e.cars),
    revenueIncl: e.type === "intern" ? e.cars * POETS_PRICE_INCL : 0,
    revenueExcl: e.type === "intern" ? Math.round(e.cars * POETS_PRICE_EXCL * 100) / 100 : 0,
  })).sort((a, b) => b.cars - a.cars);

  const months: PoetsStats["months"] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const m = done.filter(o => inRange(poetsDoneAt(o), d, next));
    const intern = m.filter(o => typeOf(o.assigned_to) === "intern").length;
    const extern = m.filter(o => typeOf(o.assigned_to) === "extern").length;
    months.push({
      month: d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" }),
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      intern, extern,
      revenueIncl: intern * POETS_PRICE_INCL,
      revenueExcl: Math.round(intern * POETS_PRICE_EXCL * 100) / 100,
    });
  }

  return {
    internCars, externCars, unknownCars,
    revenueIncl: internCars * POETS_PRICE_INCL,
    revenueExcl: Math.round(internCars * POETS_PRICE_EXCL * 100) / 100,
    persons, months, rows,
  };
}

/** Tracking-overzicht: alle poetsbeurten van de laatste 6 maanden, voor factuurcontrole. */
export function poetsTracking(raw: RapRaw): PoetsTrackRow[] {
  const wide = poetsStats(raw, raw.sixM, new Date(Date.now() + 86400000));
  return wide.rows;
}
