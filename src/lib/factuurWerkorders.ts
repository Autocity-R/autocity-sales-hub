/**
 * Werkorders per factuur (BOUWSTAP 19A) — pure regels voor bron, uren per persoon en "mogelijk dubbel".
 * De data komt uit de alleen-lezen RPC werkorder_details (RLS blijft gelden).
 */
import { linkedOrderIds } from "@/lib/omzet";
import { registeredSeconds, uitvoerders, type TimedOrder } from "@/lib/performanceGroups";
import { usesTijdregels, type Tijdregel } from "@/lib/tijdregels";

export interface WerkorderDetail {
  id: string;
  discipline: string | null;
  source: string | null;
  origin: string | null;
  status: string | null;
  description: string | null;
  part: string | null;
  parts: unknown;
  external_customer_name: string | null;
  warranty_claim_id: string | null;
  claim_nummer: string | null;
  vehicle_id: string | null;
  vehicle: { id: string; brand: string | null; model: string | null; license_number: string | null; status: string | null } | null;
  assigned_to: string | null;
  work_seconds: number | null;
  paused_seconds: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  approved_at: string | null;
  created_by: string | null;
  approved_by: string | null;
  factuur_niet_nodig: boolean | null;
  factuur_niet_nodig_reden: string | null;
  factuur_niet_nodig_door: string | null;
  factuur_niet_nodig_op: string | null;
  tijdregels: Tijdregel[];
  onderdelen: { id: string; part_name: string | null; aantal: number | null; status: string | null }[];
  namen: Record<string, string>;
}

/** Bron van een werkorder zoals de eigenaar hem kent. */
export function bronLabel(o: Pick<WerkorderDetail, "source" | "origin"> & { external_customer_name?: string | null }): string {
  if (o.origin === "extern" || o.source === "extern" || o.external_customer_name) return "Extern";
  switch (o.source || "") {
    case "checklist": return "Checklist / rijklaar";
    case "garantie": return "Garantie";
    case "aftersales": return "Aftersales / handmatig";
    case "inname":
    case "inname_auto": return "Inname";
    case "voorraad": return "Voorraad";
    case "": return "Handmatig";
    default: return (o.source as string).charAt(0).toUpperCase() + (o.source as string).slice(1);
  }
}

export interface UrenRegel { persoon: string | null; seconden: number }

/**
 * Uren per persoon: met (complete) tijdregels per persoon, anders work_seconds bij de uitvoerder (assigned_to).
 * Geregistreerde tijd, dus niet afgeknipt op werktijd (dat doet Performance).
 */
export function urenPerPersoon(o: Pick<WerkorderDetail, "id" | "assigned_to" | "work_seconds" | "tijdregels"> & Partial<WerkorderDetail>): { perTijdregel: boolean; regels: UrenRegel[] } {
  const t: TimedOrder = {
    id: o.id, vehicle_id: o.vehicle_id ?? null, discipline: o.discipline ?? null, status: o.status ?? null,
    assigned_to: o.assigned_to, work_seconds: o.work_seconds, created_at: o.created_at ?? new Date(0).toISOString(),
    started_at: o.started_at ?? null, finished_at: o.finished_at ?? null, paused_seconds: o.paused_seconds ?? 0,
    tijdregels: o.tijdregels,
  };
  if (!usesTijdregels(o.tijdregels)) {
    return { perTijdregel: false, regels: [{ persoon: o.assigned_to, seconden: Math.max(0, Number(o.work_seconds || 0)) }] };
  }
  return { perTijdregel: true, regels: uitvoerders(t).map(p => ({ persoon: p, seconden: registeredSeconds(t, p) })) };
}

/* ------------------------------ Mogelijk dubbel ------------------------------ */

export interface DubbelFactuur {
  id: string;
  invoice_number: string | null;
  created_at: string;
  invoice_kind: string | null;
  document_type: string | null;
  work_order_id: string | null;
  source_work_order_ids: unknown;
}
export interface DubbelOrder { id: string; vehicle_id: string | null; discipline: string | null; source: string | null; approved_at: string | null }
export interface DubbelInfo {
  /** true = actief "Mogelijk dubbel — 2e rijklaar"; false = gecorrigeerd (zelf volledig gecrediteerd) */
  actief: boolean;
  /** de eerdere rijklaar-factuur/facturen voor dezelfde auto */
  andere: string[];
}

const ts = (s: string | null | undefined) => (s ? +new Date(s) : Number.POSITIVE_INFINITY);

/**
 * Een interne werkplaatsfactuur van een checklist-order (rijklaar) is "mogelijk dubbel" als dezelfde auto al een
 * EERDERE (niet volledig gecrediteerde) interne rijklaar-factuur heeft. Volgorde: approved_at van de order,
 * dan factuurdatum, dan nummer. Een zelf volledig gecrediteerde factuur toont "gecorrigeerd".
 */
export function mogelijkDubbel(
  facturen: DubbelFactuur[],
  orders: DubbelOrder[],
  volledigGecrediteerd: (invoiceId: string) => boolean,
): Map<string, DubbelInfo> {
  const orderById = new Map(orders.map(o => [o.id, o]));
  type Kand = { f: DubbelFactuur; vehicle: string; approved: number; created: number; nr: string; credited: boolean };
  const perAuto = new Map<string, Kand[]>();
  facturen.forEach(f => {
    if (f.invoice_kind !== "intern" || f.document_type === "creditfactuur") return;
    const rijklaar = linkedOrderIds(f.source_work_order_ids, f.work_order_id)
      .map(id => orderById.get(id))
      .find(o => o && o.discipline === "werkplaats" && o.source === "checklist" && o.vehicle_id);
    if (!rijklaar) return;
    const k: Kand = {
      f, vehicle: rijklaar.vehicle_id as string, approved: ts(rijklaar.approved_at), created: ts(f.created_at),
      nr: f.invoice_number || "", credited: volledigGecrediteerd(f.id),
    };
    perAuto.set(k.vehicle, [...(perAuto.get(k.vehicle) || []), k]);
  });
  const voor = (a: Kand, b: Kand) =>
    a.approved !== b.approved ? a.approved < b.approved : a.created !== b.created ? a.created < b.created : a.nr < b.nr;
  const out = new Map<string, DubbelInfo>();
  perAuto.forEach(lijst => {
    lijst.forEach(k => {
      const eerder = lijst.filter(b => b !== k && !b.credited && voor(b, k));
      if (!eerder.length) return;
      out.set(k.f.id, { actief: !k.credited, andere: eerder.map(b => b.f.id) });
    });
  });
  return out;
}

/* ------------------------------ Weergave ------------------------------ */

const NL_DT = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
/** "dd-mm-jjjj uu:mm" in NL-tijd, of "—". */
export const fmtNlDatumTijd = (iso: string | null | undefined) => (iso ? NL_DT.format(new Date(iso)).replace(",", "").replace(/\//g, "-") : "—");

const VOERTUIG_STATUS: Record<string, string> = {
  voorraad: "Voorraad", verkocht_b2b: "Verkocht B2B", verkocht_b2c: "Verkocht B2C", afgeleverd: "Afgeleverd",
  onderweg: "Onderweg", in_transit: "Onderweg", werkplaats: "Werkplaats",
};
export const voertuigStatusLabel = (s: string | null | undefined) => (s ? VOERTUIG_STATUS[s] || s.replace(/_/g, " ") : "—");
