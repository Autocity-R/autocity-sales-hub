import { supabase } from "@/integrations/supabase/client";

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
  status: string | null; sent_at: string | null; created_at: string; branch: string | null;
  vehicle_id: string | null; vehicle: any; lines: any; source_work_order_ids: any; work_order_id: string | null;
}
export interface WorkOrderRow {
  id: string; discipline: string | null; status: string | null; work_seconds: number | null;
  assigned_to: string | null; started_at: string | null; finished_at: string | null; approved_at: string | null;
  created_at: string; is_rush: boolean | null; rejected_count: number | null; branch: string | null;
  vehicle_id: string | null; part: string | null; origin: string | null; due_date: string | null;
}

export interface DirectieRaw {
  invoices: InvoiceRow[];
  invoicesPrev: InvoiceRow[];
  invoices6m: InvoiceRow[];
  invoicesOpen: InvoiceRow[];
  orders: WorkOrderRow[];
  ordersPrev: WorkOrderRow[];
  ordersOpen: WorkOrderRow[];
  intakes: { id: string; vehicle_id: string | null; created_at: string; approved_at: string | null; status: string | null; branch: string | null }[];
  claims: { id: string; claim_status: string | null; claim_amount: number | null; estimated_amount: number | null; created_at: string; resolution_date: string | null; branch: string | null }[];
  loanCarsOut: number;
  parts: { id: string; status: string | null; part_name: string | null; created_at: string; branch: string | null }[];
  profiles: { id: string; first_name: string | null; last_name: string | null }[];
  vehicles: Record<string, { brand: string | null; model: string | null; license_number: string | null }>;
}

const branchFilter = <T extends { eq: any }>(q: T, branch: DirectieBranch) =>
  branch === "all" ? q : (q as any).eq("branch", branch);

export async function fetchDirectieRaw(period: DirectiePeriod, branch: DirectieBranch): Promise<DirectieRaw> {
  const { from, to, prevFrom, prevTo } = buildRange(period);
  const sixM = new Date(); sixM.setMonth(sixM.getMonth() - 5); sixM.setDate(1); sixM.setHours(0, 0, 0, 0);

  const invSel = "id,invoice_kind,subtotal,total,status,sent_at,created_at,branch,vehicle_id,vehicle,lines,source_work_order_ids,work_order_id";
  const woSel = "id,discipline,status,work_seconds,assigned_to,started_at,finished_at,approved_at,created_at,is_rush,rejected_count,branch,vehicle_id,part,origin,due_date";

  const [inv, invPrev, inv6m, invOpen, wo, woPrev, woOpen, intakes, claims, loans, parts, profiles] = await Promise.all([
    branchFilter(supabase.from("workshop_invoices").select(invSel).gte("created_at", from.toISOString()).lt("created_at", to.toISOString()), branch),
    branchFilter(supabase.from("workshop_invoices").select(invSel).gte("created_at", prevFrom.toISOString()).lt("created_at", prevTo.toISOString()), branch),
    branchFilter(supabase.from("workshop_invoices").select(invSel).gte("created_at", sixM.toISOString()), branch),
    branchFilter(supabase.from("workshop_invoices").select(invSel).neq("status", "verstuurd"), branch),
    branchFilter(supabase.from("work_orders").select(woSel).gte("created_at", from.toISOString()).lt("created_at", to.toISOString()), branch),
    branchFilter(supabase.from("work_orders").select(woSel).gte("created_at", prevFrom.toISOString()).lt("created_at", prevTo.toISOString()), branch),
    branchFilter(supabase.from("work_orders").select(woSel).not("status", "in", '("goedgekeurd","geannuleerd")'), branch),
    branchFilter(supabase.from("vehicle_intakes").select("id,vehicle_id,created_at,approved_at,status,branch").gte("created_at", sixM.toISOString()), branch),
    branchFilter(supabase.from("warranty_claims").select("id,claim_status,claim_amount,estimated_amount,created_at,resolution_date,branch").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()), branch),
    supabase.from("loan_cars").select("id,status").eq("status", "active"),
    branchFilter(supabase.from("parts_orders").select("id,status,part_name,created_at,branch").neq("status", "binnen"), branch),
    supabase.from("profiles").select("id,first_name,last_name"),
  ]);

  const orders = (wo.data || []) as any as WorkOrderRow[];
  const ordersOpen = (woOpen.data || []) as any as WorkOrderRow[];
  const invoices = (inv.data || []) as any as InvoiceRow[];

  const vehicleIds = Array.from(new Set([
    ...orders.map(o => o.vehicle_id), ...ordersOpen.map(o => o.vehicle_id), ...invoices.map(i => i.vehicle_id),
  ].filter(Boolean))) as string[];

  const vehicles: DirectieRaw["vehicles"] = {};
  if (vehicleIds.length) {
    const { data } = await supabase.from("vehicles").select("id,brand,model,license_number").in("id", vehicleIds.slice(0, 500));
    (data || []).forEach((v: any) => { vehicles[v.id] = { brand: v.brand, model: v.model, license_number: v.license_number }; });
  }

  return {
    invoices,
    invoicesPrev: (invPrev.data || []) as any,
    invoices6m: (inv6m.data || []) as any,
    invoicesOpen: (invOpen.data || []) as any,
    orders,
    ordersPrev: (woPrev.data || []) as any,
    ordersOpen,
    intakes: (intakes.data || []) as any,
    claims: (claims.data || []) as any,
    loanCarsOut: (loans.data || []).length,
    parts: (parts.data || []) as any,
    profiles: (profiles.data || []) as any,
    vehicles,
  };
}

/* ---------- afgeleide berekeningen ---------- */

export const sent = (rows: InvoiceRow[]) => rows.filter(r => r.status === "verstuurd");
export const sum = (rows: InvoiceRow[]) => rows.reduce((a, r) => a + Number(r.subtotal || 0), 0);
export const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

export const hoursOf = (orders: WorkOrderRow[]) =>
  orders.filter(o => ["afgerond", "goedgekeurd"].includes(o.status || "")).reduce((a, o) => a + Number(o.work_seconds || 0), 0) / 3600;

export interface BranchStats { internal: number; external: number; count: number; avg: number }

export function branchStats(invoices: InvoiceRow[], orders: WorkOrderRow[], discipline: string): BranchStats {
  const ids = new Set(orders.filter(o => o.discipline === discipline).map(o => o.id));
  const rel = sent(invoices).filter(i =>
    (i.work_order_id && ids.has(i.work_order_id)) ||
    (Array.isArray(i.source_work_order_ids) && i.source_work_order_ids.some((x: string) => ids.has(x))));
  const internal = sum(rel.filter(i => i.invoice_kind === "intern"));
  const external = sum(rel.filter(i => i.invoice_kind !== "intern"));
  const count = rel.length;
  return { internal, external, count, avg: count ? (internal + external) / count : 0 };
}

export function monthlyTrend(invoices6m: InvoiceRow[]) {
  const out: { month: string; intern: number; extern: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const rows = sent(invoices6m).filter(r => {
      const t = new Date(r.created_at);
      return t >= d && t < next;
    });
    out.push({
      month: d.toLocaleDateString("nl-NL", { month: "short" }),
      intern: sum(rows.filter(r => r.invoice_kind === "intern")),
      extern: sum(rows.filter(r => r.invoice_kind !== "intern")),
    });
  }
  return out;
}

export interface EmployeeKpi {
  id: string; name: string; done: number; hours: number; revenue: number;
  perHour: number; rejects: number; rejectPct: number; avgMinutes: number;
}

export function employeeKpis(raw: DirectieRaw): EmployeeKpi[] {
  const nameOf = (id: string) => {
    const p = raw.profiles.find(x => x.id === id);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Onbekend" : "Onbekend";
  };
  const revenueByOrder = new Map<string, number>();
  sent(raw.invoices).forEach(inv => {
    const ids: string[] = Array.isArray(inv.source_work_order_ids) ? inv.source_work_order_ids : (inv.work_order_id ? [inv.work_order_id] : []);
    if (!ids.length) return;
    const per = Number(inv.subtotal || 0) / ids.length;
    ids.forEach(id => revenueByOrder.set(id, (revenueByOrder.get(id) || 0) + per));
  });

  const map = new Map<string, EmployeeKpi>();
  raw.orders.filter(o => o.assigned_to).forEach(o => {
    const id = o.assigned_to as string;
    if (!map.has(id)) map.set(id, { id, name: nameOf(id), done: 0, hours: 0, revenue: 0, perHour: 0, rejects: 0, rejectPct: 0, avgMinutes: 0 });
    const e = map.get(id)!;
    if (["afgerond", "goedgekeurd"].includes(o.status || "")) {
      e.done += 1;
      e.hours += Number(o.work_seconds || 0) / 3600;
    }
    e.rejects += Number(o.rejected_count || 0);
    e.revenue += revenueByOrder.get(o.id) || 0;
  });
  return Array.from(map.values()).map(e => ({
    ...e,
    perHour: e.hours > 0 ? e.revenue / e.hours : 0,
    rejectPct: e.done > 0 ? (e.rejects / e.done) * 100 : 0,
    avgMinutes: e.done > 0 ? (e.hours * 60) / e.done : 0,
  })).sort((a, b) => b.revenue - a.revenue);
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
  const oldest = [...raw.ordersOpen].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0];
  const oldestDays = oldest ? Math.floor((Date.now() - +new Date(oldest.created_at)) / 86400000) : 0;
  const rushPct = raw.orders.length ? (raw.orders.filter(o => o.is_rush).length / raw.orders.length) * 100 : 0;
  const unassigned = raw.ordersOpen.filter(o => !o.assigned_to).length;

  return { avgLead, waitingRepair, oldest, oldestDays, rushPct, unassigned };
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

export function topVehicles(raw: DirectieRaw) {
  const map = new Map<string, { vehicle_id: string; total: number; parts: number }>();
  sent(raw.invoices).forEach(inv => {
    if (!inv.vehicle_id) return;
    const cur = map.get(inv.vehicle_id) || { vehicle_id: inv.vehicle_id, total: 0, parts: 0 };
    cur.total += Number(inv.subtotal || 0);
    cur.parts += Array.isArray(inv.lines) ? inv.lines.length : 0;
    map.set(inv.vehicle_id, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
    .map(v => ({ ...v, ...(raw.vehicles[v.vehicle_id] || { brand: null, model: null, license_number: null }) }));
}

/** Indicatief onderhanden werk: goedgekeurde nog niet gefactureerde + lopende interne orders x tarief. */
export function wipEstimate(raw: DirectieRaw) {
  const invoiced = new Set<string>();
  raw.invoices6m.forEach(i => {
    if (i.work_order_id) invoiced.add(i.work_order_id);
    if (Array.isArray(i.source_work_order_ids)) i.source_work_order_ids.forEach((x: string) => invoiced.add(x));
  });
  const TARIFF = 300;
  const candidates = raw.orders.concat(raw.ordersOpen)
    .filter(o => (o.origin || "intern") === "intern" && ["werkplaats", "spuit"].includes(o.discipline || ""))
    .filter(o => !invoiced.has(o.id));
  const unique = new Map(candidates.map(o => [o.id, o]));
  return unique.size * TARIFF;
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
