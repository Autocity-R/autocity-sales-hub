/**
 * Interne werkplaatsfacturen bij goedkeuren (BOUWSTAP 19B) — pure regels.
 * De database (RPC werkorder_goedkeuren_met_factuur) controleert hetzelfde; dit is voor het venster.
 */
import { getWorkOrderParts } from "@/components/werkplaats/workOrderParts";
import type { InvoiceDraft, InvoiceLine } from "@/services/workshopInvoiceService";

/** Klant op elke interne factuur (gelijk aan de databasetrigger). */
export const INTERNE_KLANT = {
  name: "Autocity Automotive Group B.V.",
  street: "Thurledeweg",
  house_number: "61-a",
  postal_code: "3044 ER",
  city: "Rotterdam",
  email: "administratie@auto-city.nl",
  address: "",
  phone: "",
};

export const RIJKLAAR_REDEN = "Valt onder rijklaar (€300 per auto)";

export interface InternOrder {
  id: string;
  discipline: string | null;
  source?: string | null;
  origin: string | null;
  external_customer: unknown;
}

export const isInternWerkplaats = (o: InternOrder) =>
  o.discipline === "werkplaats" && (o.origin || "intern") === "intern" && o.external_customer == null && o.source !== "extern";

/**
 * Moet het factuurvenster verplicht open bij goedkeuren?
 * Alleen met de vlag 'aan' en alleen voor interne werkplaatsorders die geen rijklaar (checklist) zijn;
 * rijklaar factureert de database automatisch (max. 1x per auto).
 */
export function factuurVensterBijGoedkeuren(o: InternOrder, vlagAan: boolean): boolean {
  return vlagAan && isInternWerkplaats(o) && o.source !== "checklist";
}

export type FactuurregelSoort = "arbeid" | "onderdelen";
export interface InterneRegel extends InvoiceLine { soort?: FactuurregelSoort }

export interface InternDraftOrder extends InternOrder {
  branch: string | null;
  description: string | null;
  part?: string | null;
  parts?: unknown;
  claim_nummer?: string | null;
  vehicle?: { brand?: string | null; model?: string | null; license_number?: string | null; vin?: string | null } | null;
}

/** Eerste regel = omschrijving van de order met bedrag leeg; garantie krijgt "Garantie GC-…" ervoor. */
export function internInvoiceDraft(w: InternDraftOrder): InvoiceDraft {
  const omschrijving = [getWorkOrderParts(w as any).join(" · ") || null, (w.description || "").trim() || null]
    .filter(Boolean).join(" — ");
  const prefix = w.source === "garantie" ? `Garantie ${w.claim_nummer || ""}`.trim() : null;
  return {
    work_order_id: w.id,
    branch: w.branch || "rotterdam",
    customer: { ...INTERNE_KLANT },
    vehicle: {
      brand: w.vehicle?.brand || "", model: w.vehicle?.model || "",
      license_number: w.vehicle?.license_number || "", vin: w.vehicle?.vin || null,
    },
    lines: [{ description: [prefix, omschrijving].filter(Boolean).join(" — "), amount: 0 }],
  };
}

export type InternKeuze = { soort: "factuur"; regels: InterneRegel[] } | { soort: "geen_kosten"; reden: string };

/** Fout als de keuze niet mag; null = in orde. Bedrag > 0 verplicht, of "Geen kosten" met reden. */
export function valideerInternKeuze(k: InternKeuze): string | null {
  if (k.soort === "geen_kosten") return k.reden.trim() ? null : "Kies een reden voor Geen kosten";
  const gevuld = k.regels.filter(r => r.description.trim() || Number(r.amount));
  if (gevuld.some(r => Number(r.amount) < 0)) return "Bedragen mogen niet negatief zijn";
  if (gevuld.some(r => Number(r.amount) > 0 && !r.description.trim())) return "Elke regel met een bedrag heeft een omschrijving nodig";
  const totaal = gevuld.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  if (!(totaal > 0)) return "Vul een bedrag groter dan € 0 in, of kies Geen kosten met een reden";
  return null;
}

/** Regels zoals de RPC ze verwacht (soort alleen als het onderdelen zijn). */
export const regelsVoorRpc = (regels: InterneRegel[]) =>
  regels.filter(r => r.description.trim() || Number(r.amount))
    .map(r => ({ description: r.description.trim(), amount: Math.round((Number(r.amount) || 0) * 100) / 100, ...(r.soort === "onderdelen" ? { soort: "onderdelen" } : {}) }));

export const GEEN_KOSTEN_REDENEN = ["Kosteloos", "Coulance", "Eigen fout", "Anders"] as const;

/** "Coulance" + toelichting → "Coulance: …"; "Anders" vereist een toelichting. */
export function geenKostenReden(keuze: string, toelichting: string): string {
  const t = toelichting.trim();
  if (!keuze) return "";
  if (keuze === "Anders") return t;
  return t ? `${keuze}: ${t}` : keuze;
}

/**
 * Vangnet "Nog te factureren (intern)": goedgekeurde interne werkplaatsorders vanaf de livegang,
 * zonder gekoppelde factuur en zonder "geen factuur nodig".
 */
export function interneOrdersZonderFactuur<T extends InternOrder & { status: string; approved_at: string | null; factuur_niet_nodig?: boolean | null }>(
  orders: T[], gekoppeld: Set<string>, vanaf: string | null,
): T[] {
  const grens = vanaf ? +new Date(vanaf) : Number.POSITIVE_INFINITY;
  return orders.filter(o => o.status === "goedgekeurd" && isInternWerkplaats(o) && !o.factuur_niet_nodig
    && !gekoppeld.has(o.id) && !!o.approved_at && +new Date(o.approved_at) >= grens);
}
