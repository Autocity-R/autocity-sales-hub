/**
 * Performance-pagina: werkorders per medewerker groeperen en tijd eerlijk tellen.
 *
 * TIJDREGEL (timer: work_seconds = paused_seconds + (finished_at − started_at); bij pauze wordt de
 * lopende sessie bij paused_seconds opgeteld en started_at leeggemaakt, bij hervatten opnieuw gezet):
 *  - laatste sessie exact: [started_at, finished_at] (als dat klopt met work_seconds − paused_seconds);
 *  - eerdere sessies (paused_seconds) achterwaarts in werktijd vóór started_at geplaatst;
 *  - anders benadering [finished_at − work_seconds, finished_at].
 * Daarna afgeknipt op de werktijden (werkplaats_werktijden) en per medewerker als unie geteld.
 * Orders zonder finished_at tellen met hun work_seconds los mee.
 */
import { getWorkSchedule, placeBackward, workWindows, type WorkSchedule } from "@/lib/workHours";

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
  paused_seconds?: number | null;
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

/** Ruwe (geregistreerde) intervallen van een afgerond werkorder. */
export function rawIntervals(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()): Interval[] {
  if (!o.finished_at) return [];
  const end = +new Date(o.finished_at);
  const ws = Math.max(0, Number(o.work_seconds || 0));
  if (!ws) return [];
  const ps = Math.max(0, Number(o.paused_seconds || 0));
  if (o.started_at) {
    const st = +new Date(o.started_at);
    const last = (end - st) / 1000;
    if (last >= 0 && Math.abs(ws - ps - last) <= 120) {
      const out: Interval[] = last > 0 ? [[st, end]] : [];
      return [...placeBackward(st, Math.min(ps, ws), sched) as Interval[], ...out];
    }
  }
  return [[end - ws * 1000, end]];
}

/** Omhullende van de ruwe intervallen (voor groepering op dag/overlap). */
export function intervalOf(o: TimedOrder): Interval | null {
  const iv = rawIntervals(o);
  if (!iv.length) return null;
  return [Math.min(...iv.map(i => i[0])), Math.max(...iv.map(i => i[1]))];
}

/** Intervallen afgeknipt op werktijd. */
export function countedIntervals(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()): Interval[] {
  return rawIntervals(o, sched).flatMap(([a, b]) => workWindows(a, b, sched) as Interval[]);
}

/** Geregistreerd vs. binnen werktijd geteld (seconden) voor één werkorder. */
export function orderTime(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()) {
  const registered = Math.max(0, Number(o.work_seconds || 0));
  if (!rawIntervals(o, sched).length) return { registered, counted: registered, clipped: 0 };
  const counted = unionSeconds(countedIntervals(o, sched));
  return { registered, counted, clipped: Math.max(0, registered - counted) };
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
export function fairSeconds(orders: TimedOrder[], sched: WorkSchedule = getWorkSchedule()): number {
  const iv: Interval[] = [];
  let loose = 0;
  orders.forEach(o => { if (rawIntervals(o, sched).length) iv.push(...countedIntervals(o, sched)); else loose += Number(o.work_seconds || 0); });
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
  /** seconden die door afknippen op werktijd niet zijn meegeteld */
  clippedSeconds: number;
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
        clippedSeconds: c.reduce((a, o) => a + orderTime(o).clipped, 0),
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
