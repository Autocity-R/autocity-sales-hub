/**
 * Performance-pagina: werkorders per medewerker groeperen en tijd eerlijk tellen.
 *
 * TIJDREGEL: elk afgerond werkorder krijgt het interval [finished_at − work_seconds, finished_at]
 * (work_seconds is de geregistreerde netto werktijd, pauzes al verrekend). Overlappende intervallen
 * van dezelfde medewerker tellen één keer (unie), zodat parallel lopende timers de uren niet opblazen.
 * Orders zonder finished_at tellen met hun work_seconds los mee.
 */

export interface TimedOrder {
  id: string;
  vehicle_id: string | null;
  discipline: string | null;
  status: string | null;
  assigned_to?: string | null;
  work_seconds: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface BillableOrder {
  id: string;
  discipline: string | null;
  status: string | null;
  origin?: string | null;
  external_customer?: unknown;
  part?: string | null;
  parts?: unknown;
}

export interface OrderInvoiceLink {
  invoice_kind: string | null;
  status?: string | null;
  work_order_id: string | null;
  source_work_order_ids: unknown;
}

const linkedIds = (invoice: OrderInvoiceLink): string[] => {
  if (Array.isArray(invoice.source_work_order_ids)) return invoice.source_work_order_ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return invoice.work_order_id ? [invoice.work_order_id] : [];
};

export const billablePartCount = (order: BillableOrder): number =>
  order.discipline === "spuit" && Array.isArray(order.parts) && order.parts.length > 0 ? order.parts.length : 1;

/** Trigger-equivalent indicatie: goedgekeurd intern werk dat nog in geen enkele interne factuur zit. */
export function pendingInvoiceAmount(order: BillableOrder, invoices: OrderInvoiceLink[]): number {
  if (order.status !== "goedgekeurd" || (order.origin || "intern") !== "intern" || order.external_customer != null) return 0;
  if (!['spuit', 'werkplaats'].includes(order.discipline || "")) return 0;
  const alreadyInvoiced = invoices.some(invoice => invoice.invoice_kind === "intern" && linkedIds(invoice).includes(order.id));
  return alreadyInvoiced ? 0 : billablePartCount(order) * 300;
}

export const linkedExternalInvoice = (orderId: string, invoices: OrderInvoiceLink[]) =>
  invoices.find(invoice => invoice.invoice_kind !== "intern" && invoice.work_order_id === orderId) || null;

export type Interval = [number, number];

const NL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
export const nlDay = (iso: string) => NL_DAY.format(new Date(iso));

export function intervalOf(o: TimedOrder): Interval | null {
  if (!o.finished_at) return null;
  const end = +new Date(o.finished_at);
  const ws = Math.max(0, Number(o.work_seconds || 0));
  if (!ws) return null;
  return [end - ws * 1000, end];
}

/** Lengte (seconden) van de unie van intervallen (ms). */
export function unionSeconds(intervals: Interval[]): number {
  const xs = intervals.filter(i => i[1] > i[0]).sort((a, b) => a[0] - b[0]);
  let total = 0, cs = -Infinity, ce = -Infinity;
  for (const [s, e] of xs) {
    if (s > ce) { if (ce > cs) total += ce - cs; cs = s; ce = e; }
    else if (e > ce) ce = e;
  }
  if (ce > cs) total += ce - cs;
  return total / 1000;
}

/** Eerlijke tijd voor een set orders: unie van intervallen + losse orders zonder interval. */
export function fairSeconds(orders: TimedOrder[]): number {
  const iv: Interval[] = [];
  let loose = 0;
  orders.forEach(o => { const i = intervalOf(o); if (i) iv.push(i); else loose += Number(o.work_seconds || 0); });
  return unionSeconds(iv) + loose;
}

/** Som van eerlijke tijd per medewerker (overlap alleen binnen dezelfde persoon samenvoegen). */
export function fairSecondsByAssignee(orders: TimedOrder[]): number {
  const by = new Map<string, TimedOrder[]>();
  orders.forEach(o => { const k = o.assigned_to || `_${o.id}`; by.set(k, [...(by.get(k) || []), o]); });
  let t = 0;
  by.forEach(list => { t += fairSeconds(list); });
  return t;
}

export const SUSPICIOUS_HOURS = 10;
/** Timer verdacht: liep over de nacht door of stond > 10 uur aaneen. Geeft de looptijd in uren of null. */
export function suspiciousTimer(o: TimedOrder): number | null {
  if (!o.started_at || !o.finished_at) return null;
  const span = (+new Date(o.finished_at) - +new Date(o.started_at)) / 3600000;
  if (span <= 0) return null;
  if (span > SUSPICIOUS_HOURS || nlDay(o.started_at) !== nlDay(o.finished_at)) return span;
  return null;
}

export interface OrderGroup<T extends TimedOrder> {
  key: string;
  vehicle_id: string | null;
  discipline: string | null;
  day: string;
  orders: T[];
  fairSeconds: number;
  sumSeconds: number;
  /** > 1 order waarvan de timers gelijktijdig liepen */
  parallel: boolean;
  suspicious: { id: string; hours: number }[];
  latest: number;
}

/**
 * Groepeer per voertuig + discipline + werkdag (NL) en daarbinnen per cluster van in tijd
 * overlappende timers. Orders zonder interval (nog niet afgerond) vormen hun eigen card.
 */
export function groupOrders<T extends TimedOrder>(orders: T[]): OrderGroup<T>[] {
  const buckets = new Map<string, T[]>();
  orders.forEach(o => {
    const iv = intervalOf(o);
    const dayIso = iv ? new Date(iv[0]).toISOString() : (o.started_at || o.created_at);
    const k = `${o.vehicle_id || "-"}|${o.discipline || "-"}|${nlDay(dayIso)}`;
    buckets.set(k, [...(buckets.get(k) || []), o]);
  });
  const groups: OrderGroup<T>[] = [];
  buckets.forEach((list, bk) => {
    const timed = list.map(o => ({ o, iv: intervalOf(o) }));
    const withIv = timed.filter(x => x.iv).sort((a, b) => a.iv![0] - b.iv![0]);
    const clusters: T[][] = [];
    let end = -Infinity;
    withIv.forEach(({ o, iv }) => {
      if (clusters.length && iv![0] <= end) { clusters[clusters.length - 1].push(o); end = Math.max(end, iv![1]); }
      else { clusters.push([o]); end = iv![1]; }
    });
    timed.filter(x => !x.iv).forEach(x => clusters.push([x.o]));
    const [vehicle_id, discipline, day] = bk.split("|");
    clusters.forEach((c, i) => {
      const sum = c.reduce((a, o) => a + Number(o.work_seconds || 0), 0);
      const fair = fairSeconds(c);
      groups.push({
        key: `${bk}|${i}`,
        vehicle_id: vehicle_id === "-" ? null : vehicle_id,
        discipline: discipline === "-" ? null : discipline,
        day,
        orders: c,
        fairSeconds: fair,
        sumSeconds: sum,
        parallel: c.length > 1 && sum - fair > 60,
        suspicious: c.map(o => ({ id: o.id, hours: suspiciousTimer(o) })).filter(x => x.hours != null) as { id: string; hours: number }[],
        latest: Math.max(...c.map(o => +new Date(o.finished_at || o.started_at || o.created_at))),
      });
    });
  });
  return groups.sort((a, b) => b.latest - a.latest);
}

export const cleanDescription = (d?: string | null) =>
  (d || "").replace(/\[ingepland op [^\]]*\]/gi, "").split("\n").map(s => s.trim()).filter(Boolean).join("\n");

export interface DupCandidate {
  id: string; vehicle_id: string | null; discipline: string | null; part: string | null;
  description: string | null; created_at: string;
}
/** Mogelijk dubbel: zelfde voertuig + discipline + onderdeel + omschrijving, aangemaakt binnen 5 min. */
export function possibleDuplicates(rows: DupCandidate[]): Set<string> {
  const out = new Set<string>();
  const norm = (s: string | null) => cleanDescription(s).toLowerCase().replace(/\s+/g, " ");
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.vehicle_id === b.vehicle_id && a.discipline === b.discipline
      && (a.part || "").toLowerCase() === (b.part || "").toLowerCase()
      && norm(a.description) === norm(b.description)
      && Math.abs(+new Date(a.created_at) - +new Date(b.created_at)) <= 5 * 60000) {
      out.add(a.id); out.add(b.id);
    }
  }
  return out;
}
