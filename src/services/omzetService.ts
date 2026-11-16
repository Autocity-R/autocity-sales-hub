import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { linkedOrderIds, nlDate, nlDayStart, pendingPoets, liveOmzetRegels, type OmzetRegel, type PoetsBeurt } from "@/lib/omzet";

/** Oude poetsprijs ex btw; de prijs per werkdag komt uit src/lib/interneTarieven.ts. */
export { POETS_PRICE_EXCL, type PoetsBeurt } from "@/lib/omzet";

export interface InvoiceLink {
  id: string; invoice_number: string | null; invoice_kind: string | null; status: string | null;
  work_order_id: string | null; source_work_order_ids: unknown; subtotal: number | null;
  telt_niet_mee: boolean | null; telt_niet_mee_reden: string | null; tak: string | null;
  omzet_datum: string | null; created_at: string; customer: any; vehicle: any;
  document_type?: string | null; credit_van_invoice_id?: string | null; credit_reden?: string | null; gecrediteerd_door?: string | null;
}
export interface ExternOpen {
  id: string; approved_at: string | null; discipline: string | null; klant: string | null; vehicle_id: string | null;
  kenteken: string | null; branch: string | null; assigned_to: string | null;
}

export interface OmzetBron {
  van: string; tot: string;
  regels: OmzetRegel[];
  /** Alle facturen (lichte kolommen) — voor koppelingen en controlelijsten. */
  links: InvoiceLink[];
  /** Afgeronde poetsbeurten in het venster, met of zonder maandfactuur. */
  poetsBeurten: PoetsBeurt[];
  poetsGefactureerd: Set<string>;
  externZonderFactuur: ExternOpen[];
  /** Namen van medewerkers (voor controlelijsten, bv. wie crediteerde). */
  namen?: Record<string, string>;
}

const d2 = (n: number) => String(n).padStart(2, "0");
/** Lokale kalenderdag → yyyy-MM-dd (periodes worden in NL-tijd gekozen). */
export const dayStr = (d: Date) => `${d.getFullYear()}-${d2(d.getMonth() + 1)}-${d2(d.getDate())}`;

export async function fetchOmzetBron(from: Date, to: Date, branch: string): Promise<OmzetBron> {
  const van = dayStr(from), tot = dayStr(to);
  const pBranch = branch === "all" ? null : branch;
  const start = nlDayStart(van), end = nlDayStart(tot);

  const [regels, links, poets, ext, profiles] = await Promise.all([
    fetchAllPages<OmzetRegel>((a, b) => (supabase as any)
      .rpc("omzet_regels", { p_van: van, p_tot: tot, p_branch: pBranch })
      .order("invoice_id").order("work_order_id", { nullsFirst: true }).range(a, b)),
    fetchAllPages<InvoiceLink>((a, b) => (supabase as any).from("workshop_invoices")
      .select("id,invoice_number,invoice_kind,status,work_order_id,source_work_order_ids,subtotal,telt_niet_mee,telt_niet_mee_reden,tak,omzet_datum,created_at,customer,vehicle,document_type,credit_van_invoice_id,credit_reden,gecrediteerd_door")
      .order("created_at").range(a, b)),
    fetchAllPages<any>((a, b) => {
      let q = supabase.from("work_orders").select("id,assigned_to,vehicle_id,branch,finished_at,approved_at")
        .eq("discipline", "poets").in("status", ["afgerond", "goedgekeurd"])
        .or(`and(finished_at.gte.${start},finished_at.lt.${end}),and(finished_at.is.null,approved_at.gte.${start},approved_at.lt.${end})`);
      if (pBranch) q = q.eq("branch", pBranch);
      return q.order("id").range(a, b);
    }),
    fetchAllPages<any>((a, b) => {
      let q = (supabase as any).from("work_orders").select("id,approved_at,discipline,external_customer,vehicle_id,branch,assigned_to,origin")
        .eq("status", "goedgekeurd").or("origin.eq.extern,external_customer.not.is.null")
        .eq("factuur_niet_nodig", false);
      if (pBranch) q = q.eq("branch", pBranch);
      return q.order("id").range(a, b);
    }),
    fetchAllPages<{ id: string; poetser_type: string | null; first_name: string | null; last_name: string | null }>((a, b) => supabase.from("profiles").select("id,poetser_type,first_name,last_name").order("id").range(a, b)),
  ]);

  // creditfacturen herkenbaar maken in de regels (de RPC levert alleen factuurvelden)
  const docType = new Map(links.map(i => [i.id, i.document_type || "factuur"]));
  regels.forEach(r => { r.document_type = docType.get(r.invoice_id) || "factuur"; });
  const namen: Record<string, string> = {};
  profiles.forEach(p => { const n = `${p.first_name || ""} ${p.last_name || ""}`.trim(); if (n) namen[p.id] = n; });

  const poetsType = new Map(profiles.map(p => [p.id, p.poetser_type]));
  const poetsGefactureerd = new Set<string>();
  const linked = new Set<string>();
  links.forEach(i => linkedOrderIds(i.source_work_order_ids, i.work_order_id).forEach(id => {
    linked.add(id);
    if (i.invoice_kind === "poets_intern") poetsGefactureerd.add(id);
  }));

  const poetsBeurten: PoetsBeurt[] = poets
    .map((o: any) => ({ o, at: o.finished_at || o.approved_at }))
    .filter(({ at }) => at)
    .map(({ o, at }) => ({
      id: o.id, day: nlDate(at), assigned_to: o.assigned_to, vehicle_id: o.vehicle_id, branch: o.branch,
      intern: o.assigned_to && poetsType.has(o.assigned_to) ? (poetsType.get(o.assigned_to) ?? "intern") === "intern" : null,
    }))
    .filter(b => b.day >= van && b.day < tot);

  const extOpen = ext.filter((o: any) => !linked.has(o.id));
  const vIds = Array.from(new Set(extOpen.map((o: any) => o.vehicle_id).filter(Boolean)));
  const plates = new Map<string, string>();
  if (vIds.length) {
    const { data } = await supabase.from("vehicles").select("id,license_number").in("id", vIds as string[]);
    (data || []).forEach((v: any) => plates.set(v.id, v.license_number));
  }

  return {
    van, tot, regels, links, poetsBeurten, poetsGefactureerd, namen,
    externZonderFactuur: extOpen.map((o: any) => ({
      id: o.id, approved_at: o.approved_at, discipline: o.discipline,
      klant: o.external_customer?.name || o.external_customer?.company || null,
      vehicle_id: o.vehicle_id, kenteken: o.vehicle_id ? plates.get(o.vehicle_id) || null : null,
      branch: o.branch, assigned_to: o.assigned_to,
    })),
  };
}

/* ---------------------- afgeleide cijfers op de bron ---------------------- */

/** Interne poetsbeurten die nog niet op een maandfactuur staan (prijs van hun werkdag) in [van, tot). */
export function poetsNogOpMaandfactuur(bron: OmzetBron, van: string, tot: string) {
  return pendingPoets(bron.poetsBeurten, bron.poetsGefactureerd, van, tot);
}
export const omzetLiveRegels = (bron: OmzetBron, van: string, tot: string) =>
  liveOmzetRegels(bron.regels, bron.poetsBeurten, bron.poetsGefactureerd, van, tot);
/** Poetsbeurten zonder uitvoerder die nergens gefactureerd zijn (controlelijst). */
export const poetsZonderUitvoerder = (bron: OmzetBron, van: string, tot: string) =>
  bron.poetsBeurten.filter(b => !b.assigned_to && !bron.poetsGefactureerd.has(b.id) && b.day >= van && b.day < tot);

export interface Controle {
  losZonderWerkorder: OmzetRegel[];
  externZonderFactuur: ExternOpen[];
  conceptenHandmatig: InvoiceLink[];
  nietMee: InvoiceLink[];
  poetsZonderUitvoerder: PoetsBeurt[];
  /** Creditfacturen met omzetdatum in de periode (credit telt in de creditmaand). */
  creditfacturen: (InvoiceLink & { origineel: string | null; door: string | null })[];
}
export function controle(bron: OmzetBron, van: string, tot: string): Controle {
  const inP = bron.regels.filter(r => r.omzet_datum >= van && r.omzet_datum < tot);
  const los = new Map<string, OmzetRegel>();
  inP.filter(r => !r.gekoppeld && r.tak !== "poets" && !r.telt_niet_mee).forEach(r => los.set(r.invoice_id, r));
  return {
    losZonderWerkorder: Array.from(los.values()),
    externZonderFactuur: bron.externZonderFactuur,
    conceptenHandmatig: bron.links.filter(i => i.status === "concept" && i.document_type !== "creditfactuur" && !["intern", "poets_intern"].includes(i.invoice_kind || "") && !i.telt_niet_mee),
    nietMee: bron.links.filter(i => i.telt_niet_mee),
    poetsZonderUitvoerder: poetsZonderUitvoerder(bron, van, tot),
    creditfacturen: bron.links
      .filter(i => i.document_type === "creditfactuur" && (i.omzet_datum || "") >= van && (i.omzet_datum || "") < tot)
      .map(i => ({
        ...i,
        origineel: bron.links.find(o => o.id === i.credit_van_invoice_id)?.invoice_number || null,
        door: (i.gecrediteerd_door && bron.namen?.[i.gecrediteerd_door]) || null,
      })),
  };
}

/* ---------------- handmatige factuur: koppel-suggesties ---------------- */

export type ExternOpenOrder = ExternOpen & { match?: boolean };

/** Goedgekeurde externe werkorders zonder gekoppelde factuur (alleen lezen). */
export async function fetchExternOrdersZonderFactuur(): Promise<ExternOpenOrder[]> {
  const [links, ext] = await Promise.all([
    fetchAllPages<any>((a, b) => (supabase as any).from("workshop_invoices").select("id,work_order_id,source_work_order_ids").order("id").range(a, b)),
    fetchAllPages<any>((a, b) => (supabase as any).from("work_orders")
      .select("id,approved_at,discipline,external_customer,vehicle_id,branch,assigned_to")
      .eq("status", "goedgekeurd").or("origin.eq.extern,external_customer.not.is.null")
      .eq("factuur_niet_nodig", false).order("id").range(a, b)),
  ]);
  const linked = new Set<string>();
  links.forEach((i: any) => linkedOrderIds(i.source_work_order_ids, i.work_order_id).forEach(id => linked.add(id)));
  const open = ext.filter((o: any) => !linked.has(o.id));
  const vIds = Array.from(new Set(open.map((o: any) => o.vehicle_id).filter(Boolean))) as string[];
  const plates = new Map<string, string>();
  if (vIds.length) {
    const { data } = await supabase.from("vehicles").select("id,license_number").in("id", vIds);
    (data || []).forEach((v: any) => plates.set(v.id, v.license_number));
  }
  return open.map((o: any) => ({
    id: o.id, approved_at: o.approved_at, discipline: o.discipline,
    klant: o.external_customer?.name || o.external_customer?.company || null,
    vehicle_id: o.vehicle_id, kenteken: o.vehicle_id ? plates.get(o.vehicle_id) || null : null,
    branch: o.branch, assigned_to: o.assigned_to,
  }));
}

const norm = (s?: string | null) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Suggesties: match op kenteken of klantnaam bovenaan. */
export function rankOrderSuggestions(list: ExternOpen[], plate?: string | null, name?: string | null): ExternOpenOrder[] {
  const p = norm(plate), n = norm(name);
  return list
    .map(o => ({ ...o, match: (!!p && norm(o.kenteken) === p) || (n.length >= 3 && norm(o.klant).includes(n)) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || +new Date(b.approved_at || 0) - +new Date(a.approved_at || 0));
}
