import { fairSeconds, fairSecondsByAssignee } from "@/lib/performanceGroups";
import { loadWorkSchedule } from "@/lib/workHours";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { inPeriod, takDetails, takTotals, byEmployee, byOrder, aansluiting, type TakDetail } from "@/lib/omzet";
import { fetchOmzetBron, poetsNogOpMaandfactuur, dayStr, type OmzetBron, type InvoiceLink } from "@/services/omzetService";
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
  work_seconds: number | null; paused_seconds?: number | null; assigned_to: string | null; created_at: string;
  started_at: string | null; finished_at: string | null; approved_at: string | null;
  is_rush: boolean | null; rejected_count: number | null; branch: string | null;
  origin: string | null; external_customer: any; part: string | null; parts: any; poets_type: string | null;
}
export interface RapIntake { id: string; vehicle_id: string | null; created_at: string; approved_at: string | null; status: string | null; branch: string | null }
export interface RapVehicle {
  id: string; branch: string | null; status: string | null; aangekomen_at: string | null;
  sold_date: string | null; delivery_date: string | null; b2b_delivered_at: string | null; details: any;
}
export interface RapProfile { id: string; first_name: string | null; last_name: string | null; poetser_type?: string | null; actief?: boolean | null }

export interface RapRaw {
  from: Date; to: Date; prevFrom: Date; prevTo: Date; sixM: Date;
  /** venster voor de maandtrend (sixM == trendFrom, blijft voor compatibiliteit bestaan) */
  trendFrom: Date; trendTo: Date;
  rangeLabel: string; rangeSlug: string;
  /** Eén bron voor omzet (RPC omzet_regels) over het hele venster. */
  bron: OmzetBron;
  /** Facturen (lichte kolommen) — alleen voor koppelingen, niet voor omzetbedragen. */
  invoices6m: InvoiceLink[];
  orders: RapOrder[];           // venster (alles, filteren in memory)
  intakes: RapIntake[];
  vehicles: RapVehicle[];
  vehicleInfo: Record<string, { brand: string | null; model: string | null; license_number: string | null }>;
  profiles: RapProfile[];
}

const bf = (q: any, branch: RapBranch) => (branch === "all" ? q : q.eq("branch", branch));

export async function fetchRapportageRaw(sel: RapSelection, branch: RapBranch): Promise<RapRaw> {
  const { from, to, prevFrom, prevTo, trendFrom, trendTo, label, slug } = resolveRange(sel);
  const sixM = trendFrom;
  const histStart = new Date(Math.min(trendFrom.getTime(), prevFrom.getTime(), from.getTime()));
  const histEnd = new Date(Math.max(+to, +trendTo));
  // orders ruim terug: een order kan lang vóór goedkeuring zijn aangemaakt
  const woStart = new Date(+histStart - 180 * 86400000);

  const woSel = "id,vehicle_id,discipline,status,work_seconds,paused_seconds,assigned_to,created_at,started_at,finished_at,approved_at,is_rush,rejected_count,branch,origin,external_customer,part,parts,poets_type";

  const [bron, orders, intakes, vehicles, profiles] = await Promise.all([
    fetchOmzetBron(histStart, histEnd, branch),
    fetchAllPages<RapOrder>((a, b) => bf(supabase.from("work_orders").select(woSel).gte("created_at", woStart.toISOString()), branch).order("id").range(a, b)),
    fetchAllPages<RapIntake>((a, b) => bf(supabase.from("vehicle_intakes").select("id,vehicle_id,created_at,approved_at,status,branch").gte("created_at", histStart.toISOString()), branch).order("id").range(a, b)),
    fetchAllPages<RapVehicle>((a, b) => bf(supabase.from("vehicles").select("id,branch,status,aangekomen_at,sold_date,delivery_date,b2b_delivered_at,details").gte("updated_at", histStart.toISOString()), branch).order("id").range(a, b)),
    supabase.from("profiles").select("id,first_name,last_name,poetser_type,actief"),
    loadWorkSchedule(),
  ]);

  const vehicleIds = Array.from(new Set(orders.map(o => o.vehicle_id).filter(Boolean))) as string[];
  const vehicleInfo: RapRaw["vehicleInfo"] = {};
  for (let i = 0; i < vehicleIds.length; i += 300) {
    const { data } = await supabase.from("vehicles").select("id,brand,model,license_number").in("id", vehicleIds.slice(i, i + 300));
    (data || []).forEach((v: any) => { vehicleInfo[v.id] = { brand: v.brand, model: v.model, license_number: v.license_number }; });
  }

  return {
    from, to, prevFrom, prevTo, sixM, trendFrom, trendTo, rangeLabel: label, rangeSlug: slug,
    bron,
    invoices6m: bron.links,
    orders,
    intakes,
    vehicles,
    vehicleInfo,
    profiles: (profiles.data || []) as any,
  };
}

/* ------------------------------ helpers ------------------------------ */

export const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const div = (a: number, b: number) => (b > 0 ? a / b : 0);
export const inRange = (iso?: string | null, a?: Date, b?: Date) => {
  if (!iso || !a || !b) return false;
  const t = +new Date(iso);
  return t >= +a && t < +b;
};
/** "Klaar" overal hetzelfde: afgerond/goedgekeurd; datum = approved_at, finished_at alleen als approved_at leeg is. */
export const isDone = (o: RapOrder) => ["afgerond", "goedgekeurd"].includes(o.status || "");
export const doneAt = (o: { approved_at: string | null; finished_at: string | null }) => o.approved_at || o.finished_at || null;
export const doneInPeriod = (o: RapOrder, a: Date, b: Date) => isDone(o) && inRange(doneAt(o), a, b);
export const partCount = (o: RapOrder) => {
  const p = o.parts;
  if (Array.isArray(p) && p.length) return p.length;
  return 1;
};

/** Meetellende omzetregels in [from, to) op omzet_datum. */
export const regelsIn = (raw: RapRaw, from: Date, to: Date) => inPeriod(raw.bron.regels, dayStr(from), dayStr(to));

/* ------------------------------ A. Omzet ------------------------------ */

export interface OmzetGroup {
  intern: number; extern: number; total: number; invoices: number; parts: number;
  avgPerInvoice: number; avgPerPart: number;
}
export interface OmzetStats {
  schade: OmzetGroup; werkplaats: OmzetGroup; poets: OmzetGroup;
  /** gefactureerd (schade + werkplaats + poets-facturen) */
  totaal: number;
  /** interne poetsbeurten die nog niet op een maandfactuur staan — apart, niet in totaal */
  poetsOpen: { count: number; bedrag: number };
  trend: { month: string; schade: number; werkplaats: number; poets: number; poetsOpen: number; selected: boolean }[];
}

const toGroup = (d: TakDetail): OmzetGroup => ({
  intern: d.intern, extern: d.extern, total: d.total, invoices: d.invoices, parts: d.parts,
  avgPerInvoice: div(d.total, d.invoices), avgPerPart: div(d.total, d.parts),
});

/**
 * BRON: public.omzet_regels (één bron voor alle schermen). Gegroepeerd op omzet_datum (NL),
 * tak per factuur. Poets = gefactureerde poetsregels; afgeronde interne beurten die nog niet op
 * een maandfactuur staan worden apart getoond als "nog op maandfactuur".
 */
export function omzetGroups(raw: RapRaw, from: Date, to: Date): { schade: OmzetGroup; werkplaats: OmzetGroup; poets: OmzetGroup } {
  const d = takDetails(regelsIn(raw, from, to));
  return { schade: toGroup(d.schadeherstel), werkplaats: toGroup(d.werkplaats), poets: toGroup(d.poets) };
}

export function omzetStats(raw: RapRaw): OmzetStats {
  const { schade, werkplaats, poets } = omzetGroups(raw, raw.from, raw.to);
  const po = poetsNogOpMaandfactuur(raw.bron, dayStr(raw.from), dayStr(raw.to));
  const trend: OmzetStats["trend"] = monthBuckets(raw.trendFrom, raw.trendTo).map(b => {
    const t = takTotals(regelsIn(raw, b.from, b.to));
    return {
      month: b.label, schade: t.schadeherstel, werkplaats: t.werkplaats, poets: t.poets,
      poetsOpen: poetsNogOpMaandfactuur(raw.bron, dayStr(b.from), dayStr(b.to)).bedrag,
      selected: +b.to > +raw.from && +b.from < +raw.to,
    };
  });
  return {
    schade, werkplaats, poets, totaal: Math.round((schade.total + werkplaats.total + poets.total) * 100) / 100,
    poetsOpen: { count: po.count, bedrag: po.bedrag }, trend,
  };
}

/* --------------------- omzet-toerekening per order --------------------- */

/** Omzet per werkorder (alle meetellende regels in het venster). */
export function revenueByOrder(raw: RapRaw, from: Date = raw.trendFrom, to: Date = new Date(Math.max(+raw.trendTo, +raw.to))) {
  return byOrder(regelsIn(raw, from, to));
}

/* ------------------- B. Performance medewerkers ------------------- */

export interface EmployeeRow {
  id: string; name: string; disciplines: string[];
  revenue: number; hours: number; perHour: number;
  tasks: number; parts: number; rejects: number; avgMinutes: number;
}

const PERF_DISC = ["werkplaats", "spuit", "uitdeuk"];

/**
 * Omzet per medewerker = toerekening uit omzet_regels (op omzet_datum), los van wanneer de order klaar was.
 * Uren/taken = eigen orders die in de periode klaar waren (fairSeconds). Uitdeuken: alleen uren/aantallen.
 * Poets-omzet staat niet per persoon in Performance (zie performanceAansluiting).
 */
export function employeeRows(raw: RapRaw, from = raw.from, to = raw.to): EmployeeRow[] {
  const regels = regelsIn(raw, from, to).filter(r => r.tak !== "poets");
  const rev = byEmployee(regels);
  const nameOf = (id: string) => {
    const p = raw.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Onbekend";
  };
  const map = new Map<string, EmployeeRow>();
  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { id, name: nameOf(id), disciplines: [], revenue: 0, hours: 0, perHour: 0, tasks: 0, parts: 0, rejects: 0, avgMinutes: 0 });
    return map.get(id)!;
  };
  const ordersBy = new Map<string, RapOrder[]>();
  raw.orders
    .filter(o => o.assigned_to && PERF_DISC.includes(o.discipline || ""))
    .filter(o => doneInPeriod(o, from, to))
    .forEach(o => {
      const e = ensure(o.assigned_to as string);
      if (o.discipline && !e.disciplines.includes(o.discipline)) e.disciplines.push(o.discipline);
      e.tasks += 1;
      ordersBy.set(e.id, [...(ordersBy.get(e.id) || []), o]);
      e.rejects += Number(o.rejected_count || 0);
      if (o.discipline === "spuit") e.parts += partCount(o);
    });
  rev.forEach((v, id) => {
    if (!id) return;
    const e = ensure(id);
    e.revenue += v;
    regels.filter(r => r.medewerker_id === id && r.discipline).forEach(r => { if (!e.disciplines.includes(r.discipline!)) e.disciplines.push(r.discipline!); });
  });
  map.forEach(e => { e.hours = fairSeconds(ordersBy.get(e.id) || []) / 3600; });
  return Array.from(map.values()).map(e => ({
    ...e,
    revenue: Math.round(e.revenue * 100) / 100,
    // uitdeuken levert geen omzet op → omzet/uur alleen over uren met omzet-disciplines
    perHour: div(e.revenue, fairSeconds((ordersBy.get(e.id) || []).filter(o => o.discipline !== "uitdeuk")) / 3600),
    avgMinutes: div(e.hours * 60, e.tasks),
  })).sort((a, b) => b.revenue - a.revenue);
}

/** Aansluiting Performance ↔ maandtotaal: medewerkers + niet toegewezen + poetsen = totaal. */
export function performanceAansluiting(raw: RapRaw, from = raw.from, to = raw.to) {
  const regels = regelsIn(raw, from, to);
  const emp = byEmployee(regels.filter(r => r.tak !== "poets"));
  const medewerkers = Array.from(emp.entries()).filter(([k]) => k).reduce((a, [, v]) => a + v, 0);
  const nietToegewezen = emp.get(null) || 0;
  const poets = takTotals(regels).poets;
  const a = aansluiting(regels);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { medewerkers: r2(medewerkers), nietToegewezen: r2(nietToegewezen), poets, totaal: a.totaal, sluit: Math.abs(a.totaal - medewerkers - nietToegewezen - poets) < 0.01 };
}

export function employeeOrders(raw: RapRaw, employeeId: string, limit = 60) {
  return raw.orders
    .filter(o => o.assigned_to === employeeId && o.status !== "geannuleerd")
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
  const hours = fairSecondsByAssignee(done) / 3600;
  // omzet = tak werkplaats op omzet_datum (zelfde bron als Rapportages > Omzet)
  const revenue = takTotals(regelsIn(raw, from, to)).werkplaats;
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
  const hours = fairSecondsByAssignee(done) / 3600;
  const parts = done.reduce((a, o) => a + partCount(o), 0);
  // omzet = tak schadeherstel; uren alleen spuit (uitdeuken levert geen omzet op)
  const revenue = takTotals(regelsIn(raw, from, to)).schadeherstel;
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
  months: { month: string; monthKey: string; intern: number; extern: number; revenueIncl: number; revenueExcl: number; selected: boolean }[];
  rows: PoetsTrackRow[];
}

const poetsDoneAt = (o: RapOrder) => o.finished_at || o.approved_at || o.created_at;
/** Poets-omzet in [a,b): gefactureerde poetsregels + interne beurten nog op maandfactuur. */
const poetsRevenue = (raw: RapRaw, a: Date, b: Date) => {
  const inv = takTotals(regelsIn(raw, a, b)).poets;
  const open = poetsNogOpMaandfactuur(raw.bron, dayStr(a), dayStr(b));
  return { invoiced: inv, open: open.bedrag, openCount: open.count, total: Math.round((inv + open.bedrag) * 100) / 100 };
};

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
  monthBuckets(raw.trendFrom, raw.trendTo).forEach(b => {
    const m = done.filter(o => inRange(poetsDoneAt(o), b.from, b.to));
    const intern = m.filter(o => typeOf(o.assigned_to) === "intern").length;
    const extern = m.filter(o => typeOf(o.assigned_to) === "extern").length;
    months.push({
      month: b.label, monthKey: b.key, intern, extern,
      revenueIncl: intern * POETS_PRICE_INCL,
      revenueExcl: Math.round(intern * POETS_PRICE_EXCL * 100) / 100,
      selected: +b.to > +from && +b.from < +to,
    });
  });

  return {
    internCars, externCars, unknownCars,
    revenueIncl: internCars * POETS_PRICE_INCL,
    revenueExcl: Math.round(internCars * POETS_PRICE_EXCL * 100) / 100,
    persons, months, rows,
  };
}

/** Tracking-overzicht: alle poetsbeurten binnen het trendvenster, voor factuurcontrole. */
export function poetsTracking(raw: RapRaw): PoetsTrackRow[] {
  const wide = poetsStats(raw, raw.trendFrom, new Date(Math.max(+raw.trendTo, +raw.to)));
  return wide.rows;
}
