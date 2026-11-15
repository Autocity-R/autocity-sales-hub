/**
 * Performance-pagina: werkorders per medewerker groeperen en tijd eerlijk tellen.
 *
 * TIJDREGEL (timer: work_seconds = paused_seconds + (finished_at − started_at); bij pauze wordt de
 * lopende sessie bij paused_seconds opgeteld en started_at leeggemaakt, bij hervatten opnieuw gezet):
 *  - laatste sessie exact: [started_at, finished_at] (als dat klopt met work_seconds − paused_seconds);
 *  - eerdere sessies (paused_seconds): exact moment niet bewaard → aaneengesloten direct vóór started_at
 *    geplaatst (en dus ook afgeknipt; een doorgelopen timer vóór een pauze telt zo niet als werktijd);
 *  - anders benadering [finished_at − work_seconds, finished_at].
 * Daarna afgeknipt op de werktijden (werkplaats_werktijden) en per medewerker als unie geteld.
 * Orders zonder finished_at tellen met hun work_seconds los mee.
 *
 * TIJDREGELS (vanaf bouwstap 17): heeft een order complete tijdregels (work_order_tijdregels), dan
 * bepalen die de intervallen en de uren per persoon; overnemen laat de uren bij wie ze maakte.
 * Orders zonder tijdregels houden de bovenstaande berekening (alle tijd naar assigned_to).
 */
import { linkedOrderIds } from "@/lib/omzet";
import { getWorkSchedule, workWindows, type WorkSchedule } from "@/lib/workHours";
import { usesTijdregels, type Tijdregel } from "@/lib/tijdregels";

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
  tijdregels?: Tijdregel[] | null;
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
  document_type?: string | null;
}

/** Koppel-fallback: lege source_work_order_ids ([] = kolom-default) → work_order_id. */
const linkedIds = (invoice: OrderInvoiceLink): string[] => linkedOrderIds(invoice.source_work_order_ids, invoice.work_order_id);

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
  invoices.find(invoice => invoice.invoice_kind !== "intern" && invoice.document_type !== "creditfactuur" && linkedIds(invoice).includes(orderId)) || null;

export type Interval = [number, number];

const NL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
export const nlDay = (iso: string) => NL_DAY.format(new Date(iso));

/** Gesloten tijdregels als intervallen (ms), optioneel alleen van één persoon. */
export function regelIntervals(o: TimedOrder, personId?: string | null): Interval[] {
  return (o.tijdregels || [])
    .filter(r => r.gestopt_op && (!personId || r.user_id === personId))
    .map(r => [+new Date(r.gestart_op), +new Date(r.gestopt_op as string)] as Interval)
    .filter(i => i[1] > i[0]);
}

/** Wie heeft aan deze order gewerkt: tijdregel-personen + uitvoerder; zonder tijdregels alleen assigned_to. */
export function uitvoerders(o: TimedOrder): string[] {
  if (!usesTijdregels(o.tijdregels)) return o.assigned_to ? [o.assigned_to] : [];
  const out: string[] = [];
  [...(o.tijdregels || [])].sort((a, b) => +new Date(a.gestart_op) - +new Date(b.gestart_op))
    .forEach(r => { if (!out.includes(r.user_id)) out.push(r.user_id); });
  if (o.assigned_to && !out.includes(o.assigned_to)) out.push(o.assigned_to);
  return out;
}

/** Ruwe (geregistreerde) intervallen van een afgerond werkorder. */
export function rawIntervals(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()): Interval[] {
  if (usesTijdregels(o.tijdregels)) return regelIntervals(o);
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
      const prev = Math.min(ps, ws) * 1000;
      return [...(prev > 0 ? [[st - prev, st] as Interval] : []), ...out];
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

const clip = (iv: Interval[], sched: WorkSchedule) => iv.flatMap(([a, b]) => workWindows(a, b, sched) as Interval[]);

/** Geregistreerde seconden: met tijdregels de (eigen) regels, anders work_seconds. */
export function registeredSeconds(o: TimedOrder, personId?: string | null): number {
  if (!usesTijdregels(o.tijdregels)) return Math.max(0, Number(o.work_seconds || 0));
  return regelIntervals(o, personId).reduce((a, [x, y]) => a + (y - x), 0) / 1000;
}

/** Uren per persoon voor één order (binnen werktijd). Zonder tijdregels: alles naar assigned_to. */
export function secondsByPerson(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()): Map<string, number> {
  const m = new Map<string, number>();
  if (!usesTijdregels(o.tijdregels)) {
    if (o.assigned_to) m.set(o.assigned_to, orderTime(o, sched).counted);
    return m;
  }
  uitvoerders(o).forEach(p => {
    const s = unionSeconds(clip(regelIntervals(o, p), sched));
    if (s > 0 || p !== o.assigned_to) m.set(p, s);
  });
  return m;
}

/** Geregistreerd vs. binnen werktijd geteld (seconden) voor één werkorder. */
export function orderTime(o: TimedOrder, sched: WorkSchedule = getWorkSchedule()) {
  if (usesTijdregels(o.tijdregels)) {
    const registered = registeredSeconds(o);
    const counted = unionSeconds(clip(regelIntervals(o), sched));
    return { registered, counted, clipped: Math.max(0, registered - counted) };
  }
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

/**
 * Eerlijke tijd voor een set orders: unie van intervallen + losse orders zonder interval.
 * Met `personId` tellen orders met tijdregels alleen de regels van die persoon (orders zonder
 * tijdregels in de set horen al bij die persoon en tellen zoals voorheen).
 */
export function fairSeconds(orders: TimedOrder[], sched: WorkSchedule = getWorkSchedule(), personId?: string | null): number {
  const iv: Interval[] = [];
  let loose = 0;
  orders.forEach(o => {
    if (usesTijdregels(o.tijdregels)) { iv.push(...clip(regelIntervals(o, personId), sched)); return; }
    if (rawIntervals(o, sched).length) iv.push(...countedIntervals(o, sched)); else loose += Number(o.work_seconds || 0);
  });
  return unionSeconds(iv) + loose;
}

/** Som van eerlijke tijd per medewerker (overlap alleen binnen dezelfde persoon samenvoegen). */
export function fairSecondsByAssignee(orders: TimedOrder[], sched: WorkSchedule = getWorkSchedule()): number {
  const by = new Map<string, { person: string | null; list: TimedOrder[] }>();
  const add = (k: string, person: string | null, o: TimedOrder) => {
    const e = by.get(k); if (e) e.list.push(o); else by.set(k, { person, list: [o] });
  };
  orders.forEach(o => {
    const ps = usesTijdregels(o.tijdregels) ? uitvoerders(o) : [];
    if (ps.length) ps.forEach(p => add(p, p, o));
    else add(o.assigned_to || `_${o.id}`, o.assigned_to || null, o);
  });
  let t = 0;
  by.forEach(({ person, list }) => { t += fairSeconds(list, sched, person); });
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
export function groupOrders<T extends TimedOrder>(orders: T[], personId?: string | null): OrderGroup<T>[] {
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
      const sum = c.reduce((a, o) => a + registeredSeconds(o, personId), 0);
      const fair = fairSeconds(c, getWorkSchedule(), personId);
      groups.push({
        key: `${bk}|${i}`,
        vehicle_id: vehicle_id === "-" ? null : vehicle_id,
        discipline: discipline === "-" ? null : discipline,
        day,
        orders: c,
        fairSeconds: fair,
        sumSeconds: sum,
        parallel: c.length > 1 && sum - fair > 60,
        clippedSeconds: c.reduce((a, o) => {
          if (!personId || !usesTijdregels(o.tijdregels)) return a + orderTime(o).clipped;
          return a + Math.max(0, registeredSeconds(o, personId) - fairSeconds([o], getWorkSchedule(), personId));
        }, 0),
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
