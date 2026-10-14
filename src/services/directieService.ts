import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { fairSeconds, fairSecondsByAssignee, pendingInvoiceAmount } from "@/lib/performanceGroups";
import { inPeriod, takDetails, takTotals, byEmployee, type Tak } from "@/lib/omzet";
import { fetchOmzetBron, poetsNogOpMaandfactuur, dayStr, POETS_PRICE_EXCL, type OmzetBron, type InvoiceLink } from "@/services/omzetService";

export type DirectiePeriod = "week" | "month" | "quarter" | "year";
export type DirectieBranch = "all" | "rotterdam" | "heerhugowaard";

export interface DirectieRange { from: Date; to: Date; prevFrom: Date; prevTo: Date }

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // maandag = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const buildRange = (period: DirectiePeriod, now = new Date()): DirectieRange => {
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;
  if (period === "week") {
    from = startOfWeek(now);
    to = new Date(from); to.setDate(to.getDate() + 7);
    prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - 7);
    prevTo = from;
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevTo = from;
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), q * 3, 1);
    to = new Date(now.getFullYear(), q * 3 + 3, 1);
    prevFrom = new Date(now.getFullYear(), q * 3 - 3, 1);
    prevTo = from;
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
    prevFrom = new Date(now.getFullYear() - 1, 0, 1);
    prevTo = from;
  }
  return { from, to, prevFrom, prevTo };
};

export interface InvoiceRow {
  id: string; invoice_kind: string | null; subtotal: number | null; total: number | null;
  status: string | null; created_at: string; work_order_id: string | null; source_work_order_ids: any;
}
export interface WorkOrderRow {
  id: string; discipline: string | null; status: string | null; work_seconds: number | null;
  assigned_to: string | null; started_at: string | null; finished_at: string | null; approved_at: string | null;
  created_at: string; is_rush: boolean | null; rejected_count: number | null; branch: string | null;
  vehicle_id: string | null; part: string | null; parts?: any; origin: string | null; due_date: string | null;
  poets_type: string | null; paused_seconds?: number | null; external_customer?: any;
}

export interface DirectieRaw {
  from: Date; to: Date; prevFrom: Date; prevTo: Date; sixM: Date;
  /** Eén bron voor omzet (RPC omzet_regels). */
  bron: OmzetBron;
  /** Handmatige concepten (niet verstuurd) */
  invoicesOpen: InvoiceLink[];
  orders: WorkOrderRow[];
  ordersPrev: WorkOrderRow[];
  ordersOpen: WorkOrderRow[];
  /** Ruim historisch venster — basis voor trends en onderhanden werk. */
  ordersHist: WorkOrderRow[];
  intakes: { id: string; vehicle_id: string | null; created_at: string; approved_at: string | null; status: string | null; branch: string | null }[];
  claims: { id: string; claim_status: string | null; claim_amount: number | null; estimated_amount: number | null; created_at: string; resolution_date: string | null; branch: string | null }[];
  loanCarsOut: number;
  parts: { id: string; status: string | null; part_name: string | null; created_at: string; branch: string | null }[];
  profiles: { id: string; first_name: string | null; last_name: string | null; poetser_type?: string | null }[];
  vehicles: Record<string, { brand: string | null; model: string | null; license_number: string | null }>;
}

const branchFilter = <T extends { eq: any }>(q: T, branch: DirectieBranch) =>
  branch === "all" ? q : (q as any).eq("branch", branch);

/**
 * "Klaar" overal hetzelfde (zelfde als Rapportages): status afgerond/goedgekeurd,
 * datum = approved_at, finished_at alleen als approved_at leeg is.
 */
export const approvedAtOf = (o: WorkOrderRow): string | null =>
  ["afgerond", "goedgekeurd"].includes(o.status || "") ? (o.approved_at || o.finished_at || null) : null;

const approvedInRange = (rows: WorkOrderRow[], from: Date, to: Date) =>
  rows.filter(o => {
    const at = approvedAtOf(o);
    if (!at) return false;
    const t = +new Date(at);
    return t >= +from && t < +to;
  });

export async function fetchDirectieRaw(period: DirectiePeriod, branch: DirectieBranch): Promise<DirectieRaw> {
  const { from, to, prevFrom, prevTo } = buildRange(period);
  const sixM = new Date(); sixM.setMonth(sixM.getMonth() - 5); sixM.setDate(1); sixM.setHours(0, 0, 0, 0);
  const histStart = new Date(Math.min(+prevFrom, +sixM));
  const histEnd = new Date(Math.max(+to, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).getTime()));
  const woSel = "id,discipline,status,work_seconds,paused_seconds,assigned_to,started_at,finished_at,approved_at,created_at,is_rush,rejected_count,branch,vehicle_id,part,parts,origin,external_customer,due_date,poets_type";
  // orders ruim terug: een order kan lang vóór goedkeuring zijn aangemaakt
  const woStart = new Date(+histStart - 180 * 86400000);

  const [bron, ordersAll, ordersOpen, intakes, claims, loans, parts, profiles] = await Promise.all([
    fetchOmzetBron(histStart, histEnd, branch),
    fetchAllPages<WorkOrderRow>((a, b) => branchFilter(supabase.from("work_orders").select(woSel).gte("created_at", woStart.toISOString()), branch).order("id").range(a, b)),
    fetchAllPages<WorkOrderRow>((a, b) => branchFilter(supabase.from("work_orders").select(woSel).not("status", "in", '("goedgekeurd","geannuleerd")'), branch).order("id").range(a, b)),
    fetchAllPages<any>((a, b) => branchFilter(supabase.from("vehicle_intakes").select("id,vehicle_id,created_at,approved_at,status,branch").gte("created_at", sixM.toISOString()), branch).order("id").range(a, b)),
    fetchAllPages<any>((a, b) => branchFilter(supabase.from("warranty_claims").select("id,claim_status,claim_amount,estimated_amount,created_at,resolution_date,branch").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()), branch).order("id").range(a, b)),
    supabase.from("loan_cars").select("id,status").eq("status", "uitgeleend"),
    fetchAllPages<any>((a, b) => branchFilter(supabase.from("parts_orders").select("id,status,part_name,created_at,branch").neq("status", "binnen"), branch).order("id").range(a, b)),
    supabase.from("profiles").select("id,first_name,last_name,poetser_type"),
  ]);

  const orders = approvedInRange(ordersAll, from, to);
  const ordersPrev = approvedInRange(ordersAll, prevFrom, prevTo);

  const vehicleIds = Array.from(new Set([...orders.map(o => o.vehicle_id), ...ordersOpen.map(o => o.vehicle_id)].filter(Boolean))) as string[];
  const vehicles: DirectieRaw["vehicles"] = {};
  for (let i = 0; i < vehicleIds.length; i += 300) {
    const { data } = await supabase.from("vehicles").select("id,brand,model,license_number").in("id", vehicleIds.slice(i, i + 300));
    (data || []).forEach((v: any) => { vehicles[v.id] = { brand: v.brand, model: v.model, license_number: v.license_number }; });
  }

  return {
    from, to, prevFrom, prevTo, sixM, bron,
    invoicesOpen: bron.links.filter(i => i.status !== "verstuurd" && !["intern", "poets_intern"].includes(i.invoice_kind || "") && !i.telt_niet_mee),
    orders, ordersPrev, ordersOpen, ordersHist: ordersAll,
    intakes, claims,
    loanCarsOut: (loans.data || []).length,
    parts,
    profiles: (profiles.data || []) as any,
    vehicles,
  };
}

/* ---------- afgeleide berekeningen (bron: omzet_regels) ---------- */

export const regelsIn = (raw: DirectieRaw, from: Date, to: Date) => inPeriod(raw.bron.regels, dayStr(from), dayStr(to));
export const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

/** Uren = fairSeconds per medewerker (interval-unie, alleen binnen werktijd) van klaar-gemelde orders. */
export const hoursOf = (orders: WorkOrderRow[]) =>
  fairSecondsByAssignee(orders.filter(o => !!approvedAtOf(o)) as any) / 3600;

export interface BranchStats { internal: number; external: number; count: number; avg: number }

/** Omzet per tak (excl. btw, op omzet_datum). */
export function branchStats(raw: DirectieRaw, from: Date, to: Date, tak: Tak): BranchStats {
  const d = takDetails(regelsIn(raw, from, to))[tak];
  return { internal: d.intern, external: d.extern, count: d.invoices, avg: d.invoices ? d.total / d.invoices : 0 };
}

export interface KernCijfers {
  total: number; intern: number; extern: number;
  schade: number; werkplaats: number; poets: number;
  poetsOpen: { count: number; bedrag: number };
}
export function kernCijfers(raw: DirectieRaw, from: Date, to: Date): KernCijfers {
  const regels = regelsIn(raw, from, to);
  const t = takTotals(regels);
  const d = takDetails(regels);
  const po = poetsNogOpMaandfactuur(raw.bron, dayStr(from), dayStr(to));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    total: t.totaal,
    intern: r2(d.schadeherstel.intern + d.werkplaats.intern + d.poets.intern),
    extern: r2(d.schadeherstel.extern + d.werkplaats.extern + d.poets.extern),
    schade: t.schadeherstel, werkplaats: t.werkplaats, poets: t.poets,
    poetsOpen: { count: po.count, bedrag: po.bedrag },
  };
}

/** Interne poetsbeurt: € 100,00 incl. btw per auto (= € 82,64 ex btw). */
export const POETS_PRICE_INCL = 100;
export { POETS_PRICE_EXCL };

export interface PoetsStats {
  internCars: number; externCars: number; unknownCars: number; minutesAvg: number;
}
/** Aantallen poetsbeurten (omzet komt uit omzet_regels + "nog op maandfactuur"). */
export function poetsStatsDirectie(raw: DirectieRaw, orders: WorkOrderRow[]): PoetsStats {
  const typeOf = (id: string | null): "intern" | "extern" | "onbekend" => {
    if (!id) return "onbekend";
    const p = raw.profiles.find(x => x.id === id);
    if (!p) return "onbekend";
    return p.poetser_type === "extern" ? "extern" : "intern";
  };
  const done = orders.filter(o => o.discipline === "poets" && !!approvedAtOf(o));
  const seconds = done.reduce((a, o) => a + Number(o.work_seconds || 0), 0);
  return {
    internCars: done.filter(o => typeOf(o.assigned_to) === "intern").length,
    externCars: done.filter(o => typeOf(o.assigned_to) === "extern").length,
    unknownCars: done.filter(o => typeOf(o.assigned_to) === "onbekend").length,
    minutesAvg: done.length ? seconds / 60 / done.length : 0,
  };
}

export function monthlyTrend(raw: DirectieRaw) {
  const out: { month: string; schade: number; werkplaats: number; poets: number; poetsOpen: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const t = takTotals(regelsIn(raw, d, next));
    out.push({
      month: d.toLocaleDateString("nl-NL", { month: "short" }),
      schade: t.schadeherstel, werkplaats: t.werkplaats, poets: t.poets,
      poetsOpen: poetsNogOpMaandfactuur(raw.bron, dayStr(d), dayStr(next)).bedrag,
    });
  }
  return out;
}

export interface EmployeeKpi {
  id: string; name: string; done: number; hours: number; revenue: number;
  perHour: number; rejects: number; rejectPct: number; avgMinutes: number;
}
export const NIET_TOEGEWEZEN = "__niet_toegewezen";

/** Omzet per medewerker uit omzet_regels (som + niet toegewezen = totaal); uren = fairSeconds. */
export function employeeKpis(raw: DirectieRaw): EmployeeKpi[] {
  const nameOf = (id: string) => {
    const p = raw.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Onbekend";
  };
  const rev = byEmployee(regelsIn(raw, raw.from, raw.to));
  const map = new Map<string, EmployeeKpi>();
  const ensure = (id: string, name: string) => {
    if (!map.has(id)) map.set(id, { id, name, done: 0, hours: 0, revenue: 0, perHour: 0, rejects: 0, rejectPct: 0, avgMinutes: 0 });
    return map.get(id)!;
  };
  const byPerson = new Map<string, WorkOrderRow[]>();
  raw.orders.filter(o => o.assigned_to).forEach(o => {
    const e = ensure(o.assigned_to as string, nameOf(o.assigned_to as string));
    e.done += 1;
    e.rejects += Number(o.rejected_count || 0);
    byPerson.set(e.id, [...(byPerson.get(e.id) || []), o]);
  });
  rev.forEach((v, id) => { ensure(id || NIET_TOEGEWEZEN, id ? nameOf(id) : "Niet toegewezen").revenue += v; });
  return Array.from(map.values()).map(e => {
    const hours = fairSeconds((byPerson.get(e.id) || []) as any) / 3600;
    // uitdeuken levert geen omzet op → niet in omzet/uur
    const revHours = fairSeconds((byPerson.get(e.id) || []).filter(o => o.discipline !== "uitdeuk") as any) / 3600;
    return {
      ...e, hours, revenue: Math.round(e.revenue * 100) / 100,
      perHour: revHours > 0 ? e.revenue / revHours : 0,
      rejectPct: e.done > 0 ? (e.rejects / e.done) * 100 : 0,
      avgMinutes: e.done > 0 ? (hours * 60) / e.done : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function flowStats(raw: DirectieRaw) {
  // doorlooptijd inname -> poets goedgekeurd
  const poets = raw.orders.concat(raw.ordersOpen).filter(o => o.discipline === "poets" && o.approved_at);
  const durations: number[] = [];
  poets.forEach(p => {
    const intake = raw.intakes.find(i => i.vehicle_id === p.vehicle_id);
    if (intake) {
      const d = (new Date(p.approved_at as string).getTime() - new Date(intake.created_at).getTime()) / 86400000;
      if (d >= 0 && d < 365) durations.push(d);
    }
  });
  const avgLead = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const waitingRepair = new Set(raw.ordersOpen.filter(o => ["spuit", "uitdeuk"].includes(o.discipline || "")).map(o => o.vehicle_id)).size;
  const sortedOpen = [...raw.ordersOpen].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const oldest = sortedOpen[0];
  const oldestDays = oldest ? Math.floor((Date.now() - +new Date(oldest.created_at)) / 86400000) : 0;
  const rushPct = raw.orders.length ? (raw.orders.filter(o => o.is_rush).length / raw.orders.length) * 100 : 0;
  const unassigned = raw.ordersOpen.filter(o => !o.assigned_to).length;

  const profileName = (id: string | null) => {
    if (!id) return null;
    const p = raw.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || null : null;
  };

  const oldestList = sortedOpen.slice(0, 5).map(o => {
    const v = o.vehicle_id ? raw.vehicles[o.vehicle_id] : undefined;
    return {
      id: o.id,
      days: Math.floor((Date.now() - +new Date(o.created_at)) / 86400000),
      discipline: o.discipline,
      status: o.status,
      part: o.part,
      origin: o.origin,
      isRush: !!o.is_rush,
      dueDate: o.due_date,
      createdAt: o.created_at,
      assignedName: profileName(o.assigned_to),
      vehicleId: o.vehicle_id,
      licensePlate: v?.license_number || null,
      vehicleLabel: v ? [v.brand, v.model].filter(Boolean).join(" ") : null,
    };
  });

  return { avgLead, waitingRepair, oldest, oldestDays, oldestList, rushPct, unassigned };
}

export function warrantyStats(raw: DirectieRaw) {
  const open = raw.claims.filter(c => c.claim_status === "pending").length;
  const inProgress = raw.claims.filter(c => c.claim_status === "in_progress").length;
  const done = raw.claims.filter(c => c.claim_status === "resolved").length;
  const amount = raw.claims.reduce((a, c) => a + Number(c.claim_amount ?? c.estimated_amount ?? 0), 0);
  const times = raw.claims
    .filter(c => c.resolution_date)
    .map(c => (+new Date(c.resolution_date as string) - +new Date(c.created_at)) / 86400000)
    .filter(d => d >= 0);
  const avgDays = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  return { total: raw.claims.length, open, inProgress, done, amount, avgDays, loanCarsOut: raw.loanCarsOut };
}

/**
 * Onderhanden werk / nog te factureren — alleen schatting, NOOIT bij omzet opgeteld.
 * - interne spuit/werkplaats-orders goedgekeurd zonder interne factuur → € 300 per deel;
 * - goedgekeurde externe orders zonder gekoppelde factuur → aantal + lijst, geen bedrag.
 */
export function wipEstimate(raw: DirectieRaw) {
  const intern = raw.ordersHist.reduce((a, o) => a + pendingInvoiceAmount(o as any, raw.bron.links as any), 0);
  return { internBedrag: intern, externZonderFactuur: raw.bron.externZonderFactuur };
}

export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(";"), ...rows.map(r => headers.map(h => esc(r[h])).join(";"))].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
