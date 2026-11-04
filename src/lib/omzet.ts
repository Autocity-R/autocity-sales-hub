/**
 * Omzet — één bron, één set regels (BOUWSTAP 11).
 *
 * De database (RPC omzet_regels + trigger workshop_invoice_fill_omzet) is leidend; deze
 * pure functies spiegelen exact dezelfde regels, zodat schermen en tests dezelfde
 * uitkomst geven:
 *  - Bedragen altijd EXCL. btw (subtotal).
 *  - omzet_datum (Europe/Amsterdam): intern = goedkeuringsdag laatste gekoppelde order,
 *    poets_intern = werkdag laatste poetsbeurt, overig = factuurdatum (created_at).
 *  - Koppeling: source_work_order_ids als niet leeg, anders work_order_id.
 *  - Telregel: telt_niet_mee = false en (status <> concept OF automatische interne factuur).
 *  - Toerekening: schadeherstel per deel (€300 × delen), anders gelijk verdeeld over de
 *    gekoppelde orders; zonder koppeling → "niet toegewezen" (medewerker null).
 */

export type Tak = "schadeherstel" | "werkplaats" | "poets";

/** Eén rij uit public.omzet_regels: één factuur × één gekoppelde werkorder (of één rij zonder koppeling). */
export interface OmzetRegel {
  invoice_id: string; invoice_number: string | null; invoice_kind: string | null; tak: Tak;
  omzet_datum: string; subtotal: number; total: number; status: string | null; branch: string | null;
  created_at: string; klant: string | null; kenteken: string | null;
  telt_mee: boolean; telt_niet_mee: boolean; telt_niet_mee_reden: string | null;
  gekoppeld: boolean; work_order_id: string | null; discipline: string | null;
  medewerker_id: string | null; aandeel_delen: number | null; bedrag: number;
}

const NL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
/** yyyy-MM-dd in Nederlandse tijd. */
export const nlDate = (iso: string | Date) => NL_DAY.format(typeof iso === "string" ? new Date(iso) : iso);
/** yyyy-MM van een yyyy-MM-dd of ISO-moment. */
export const monthKeyOf = (day: string) => (/^\d{4}-\d{2}-\d{2}$/.test(day) ? day : nlDate(day)).slice(0, 7);

/** Koppel-fallback: lege source_work_order_ids ([] is de kolom-default) → work_order_id. */
export function linkedOrderIds(src: unknown, workOrderId: string | null | undefined): string[] {
  const ids = Array.isArray(src) ? src.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  if (ids.length) return ids;
  return workOrderId ? [workOrderId] : [];
}

export interface InvoiceForRules {
  invoice_kind: string | null; status: string | null; telt_niet_mee?: boolean | null;
}
/** Telregel. Automatische interne concepten tellen wél, handmatige concepten niet. */
export const countsAsRevenue = (inv: InvoiceForRules) =>
  !inv.telt_niet_mee && (inv.status !== "concept" || ["intern", "poets_intern"].includes(inv.invoice_kind || ""));

export interface LinkedOrderDates { approved_at: string | null; finished_at: string | null }
/** omzet_datum volgens de regels (spiegel van de databasetrigger). */
export function omzetDatum(kind: string | null, createdAt: string, linked: LinkedOrderDates[]): string {
  const max = (xs: (string | null)[]) => xs.filter(Boolean).sort((a, b) => +new Date(a!) - +new Date(b!)).pop() || null;
  if (kind === "intern") return nlDate(max(linked.map(o => o.approved_at)) || createdAt);
  if (kind === "poets_intern") return nlDate(max(linked.map(o => o.finished_at || o.approved_at)) || createdAt);
  return nlDate(createdAt);
}

export interface AllocOrder { id: string; discipline: string | null; assigned_to: string | null; parts?: unknown }
/** Toerekening van één factuur naar medewerkers (spiegel van omzet_regels). */
export function allocate(subtotal: number, tak: Tak, orders: AllocOrder[]): { work_order_id: string | null; medewerker_id: string | null; bedrag: number }[] {
  if (!orders.length) return [{ work_order_id: null, medewerker_id: null, bedrag: subtotal }];
  const w = orders.map(o => (tak === "schadeherstel" && o.discipline === "spuit"
    ? Math.max(1, Array.isArray(o.parts) ? o.parts.length : 0) : 1));
  const g = w.reduce((a, b) => a + b, 0);
  return orders.map((o, i) => ({
    work_order_id: o.id, medewerker_id: o.assigned_to,
    bedrag: Math.round((subtotal * w[i] / g) * 100) / 100,
  }));
}

/* ------------------------------ aggregatie ------------------------------ */

export interface TakTotals { schadeherstel: number; werkplaats: number; poets: number; totaal: number }
export interface TakDetail { total: number; intern: number; extern: number; invoices: number; parts: number }

const r2 = (n: number) => Math.round(n * 100) / 100;
const emptyTak = (): TakDetail => ({ total: 0, intern: 0, extern: 0, invoices: 0, parts: 0 });

/** Alleen meetellende regels binnen [van, tot) op omzet_datum (yyyy-MM-dd strings). */
export const inPeriod = (regels: OmzetRegel[], van: string, tot: string) =>
  regels.filter(r => r.telt_mee && r.omzet_datum >= van && r.omzet_datum < tot);

/** Unieke facturen uit regels. */
export function invoicesOf(regels: OmzetRegel[]): OmzetRegel[] {
  const m = new Map<string, OmzetRegel>();
  regels.forEach(r => { if (!m.has(r.invoice_id)) m.set(r.invoice_id, r); });
  return Array.from(m.values());
}

export function takTotals(regels: OmzetRegel[]): TakTotals {
  const t = { schadeherstel: 0, werkplaats: 0, poets: 0, totaal: 0 };
  invoicesOf(regels.filter(r => r.telt_mee)).forEach(i => { t[i.tak] += Number(i.subtotal || 0); t.totaal += Number(i.subtotal || 0); });
  return { schadeherstel: r2(t.schadeherstel), werkplaats: r2(t.werkplaats), poets: r2(t.poets), totaal: r2(t.totaal) };
}

export function takDetails(regels: OmzetRegel[]): Record<Tak, TakDetail> {
  const out: Record<Tak, TakDetail> = { schadeherstel: emptyTak(), werkplaats: emptyTak(), poets: emptyTak() };
  const counted = regels.filter(r => r.telt_mee);
  invoicesOf(counted).forEach(i => {
    const d = out[i.tak];
    const amt = Number(i.subtotal || 0);
    d.total += amt; d.invoices += 1;
    if (["intern", "poets_intern", "poets_pending"].includes(i.invoice_kind || "")) d.intern += amt; else d.extern += amt;
  });
  counted.forEach(r => { out[r.tak].parts += r.tak === "schadeherstel" ? Number(r.aandeel_delen || 1) : 1; });
  (Object.keys(out) as Tak[]).forEach(k => { out[k].total = r2(out[k].total); out[k].intern = r2(out[k].intern); out[k].extern = r2(out[k].extern); });
  return out;
}

/** Omzet per medewerker (sleutel null = niet toegewezen) en per werkorder. */
export function byEmployee(regels: OmzetRegel[], filter?: (r: OmzetRegel) => boolean) {
  const m = new Map<string | null, number>();
  regels.filter(r => r.telt_mee && (!filter || filter(r))).forEach(r => m.set(r.medewerker_id, (m.get(r.medewerker_id) || 0) + Number(r.bedrag || 0)));
  return m;
}
export function byOrder(regels: OmzetRegel[]) {
  const m = new Map<string, number>();
  regels.filter(r => r.telt_mee && r.work_order_id).forEach(r => m.set(r.work_order_id!, (m.get(r.work_order_id!) || 0) + Number(r.bedrag || 0)));
  return m;
}

export interface Aansluiting { totaal: number; takken: number; medewerkers: number; nietToegewezen: number; verschilTak: number; verschilMedewerker: number; sluit: boolean }
/** Controle: totaal facturen = som takken = som medewerkers + niet toegewezen. */
export function aansluiting(regels: OmzetRegel[]): Aansluiting {
  const t = takTotals(regels);
  const emp = byEmployee(regels);
  let medewerkers = 0, nietToegewezen = 0;
  emp.forEach((v, k) => { if (k) medewerkers += v; else nietToegewezen += v; });
  const takken = t.schadeherstel + t.werkplaats + t.poets;
  const verschilTak = r2(t.totaal - takken);
  const verschilMedewerker = r2(t.totaal - medewerkers - nietToegewezen);
  return {
    totaal: t.totaal, takken: r2(takken), medewerkers: r2(medewerkers), nietToegewezen: r2(nietToegewezen),
    verschilTak, verschilMedewerker, sluit: Math.abs(verschilTak) < 0.01 && Math.abs(verschilMedewerker) < 0.01,
  };
}

export const TAK_LABEL: Record<Tak, string> = { schadeherstel: "Schadeherstel", werkplaats: "Werkplaats", poets: "Poetsen" };

export const POETS_PRICE_EXCL = 82.64;
export interface PoetsBeurt { id: string; day: string; assigned_to: string | null; vehicle_id: string | null; branch: string | null; intern: boolean | null }

/** NL midnight as an instant, including daylight saving at month boundaries. */
export function nlDayStart(day: string): string {
  const noon = new Date(`${day}T12:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }).format(noon));
  return new Date(Date.parse(`${day}T00:00:00Z`) - (hour - 12) * 3600000).toISOString();
}

export function pendingPoets(beurten: PoetsBeurt[], invoiced: Set<string>, van: string, tot: string) {
  const list = beurten.filter(b => !!b.assigned_to && b.intern === true && !invoiced.has(b.id) && b.day >= van && b.day < tot);
  return { list, count: list.length, bedrag: r2(list.length * POETS_PRICE_EXCL) };
}

/** Read-only revenue projection: invoice rows plus disjoint pending monthly polishing work. */
export function liveOmzetRegels(regels: OmzetRegel[], beurten: PoetsBeurt[], invoiced: Set<string>, van: string, tot: string): OmzetRegel[] {
  const pending = pendingPoets(beurten, invoiced, van, tot);
  return [...inPeriod(regels, van, tot), ...pending.list.map(b => ({
    invoice_id: `pending-poets:${b.id}`, invoice_number: null, invoice_kind: "poets_pending", tak: "poets" as const,
    omzet_datum: b.day, subtotal: POETS_PRICE_EXCL, total: 100, status: "nog_op_maandfactuur", branch: b.branch,
    created_at: `${b.day}T12:00:00Z`, klant: null, kenteken: null,
    telt_mee: true, telt_niet_mee: false, telt_niet_mee_reden: null, gekoppeld: true,
    work_order_id: b.id, discipline: "poets", medewerker_id: b.assigned_to, aandeel_delen: 1, bedrag: POETS_PRICE_EXCL,
  }))];
}
