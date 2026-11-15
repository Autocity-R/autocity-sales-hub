/**
 * Creditfacturen (BOUWSTAP 18) — pure regels, gelijk aan de database-RPC factuur_crediteren.
 *
 * - Een creditfactuur heeft negatieve regels en negatieve subtotal/vat/total.
 * - Btw zoals in het origineel: poets_intern rekent € 100 incl. = € 82,64 excl.,
 *   een 21%-factuur rekent 21%, anders de verhouding van het origineel.
 * - De laatste (deel)credit maakt btw en totaal exact nul (rest van het origineel).
 * - Afgeleid op het origineel: gecrediteerd bedrag, nog te crediteren, badges.
 *   payment_status van het origineel wordt nooit omgezet.
 */
import { nlDate } from "@/lib/omzet";

export const CREDIT_ROLES = ["owner", "admin", "aftersales_manager", "operationeel_directeur"];
export const mayCrediteer = (role: string | null | undefined, isAdmin = false) =>
  isAdmin || CREDIT_ROLES.includes(role || "");

export const POETS_INCL = 100;
export const POETS_EXCL = 82.64;

const r2 = (n: number) => Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-9) / 100;

export interface Bedragen { subtotal: number; vat: number; total: number }
export interface OrigForCredit extends Bedragen {
  invoice_kind: string | null;
  document_type?: string | null;
  status?: string | null;
  telt_niet_mee?: boolean | null;
  payment_status?: string | null;
}

export const isCredit = (r: { document_type?: string | null }) => r.document_type === "creditfactuur";

/** Wat er al gecrediteerd is en wat er nog openstaat (positieve bedragen). */
export interface CreditInfo {
  n: number;
  gecrediteerdExcl: number;
  gecrediteerdIncl: number;
  nogExcl: number;
  nogVat: number;
  nogIncl: number;
  volledig: boolean;
}

export function creditInfo(orig: Bedragen, credits: Bedragen[]): CreditInfo {
  const sum = (k: keyof Bedragen) => credits.reduce((s, c) => s + (Number(c[k]) || 0), 0);
  const cSub = sum("subtotal"), cVat = sum("vat"), cTot = sum("total");
  const nogExcl = r2(Number(orig.subtotal || 0) + cSub);
  return {
    n: credits.length,
    gecrediteerdExcl: r2(-cSub),
    gecrediteerdIncl: r2(-cTot),
    nogExcl,
    nogVat: r2(Number(orig.vat || 0) + cVat),
    nogIncl: r2(Number(orig.total || 0) + cTot),
    volledig: credits.length > 0 && nogExcl <= 0,
  };
}

/** Btw en totaal van een credit van `excl` (positief) — spiegel van de RPC. Retour is negatief. */
export function creditBedragen(orig: OrigForCredit, info: CreditInfo, excl: number): Bedragen {
  const e = r2(excl);
  let vat: number, tot: number;
  if (Math.abs(e - info.nogExcl) < 0.005) { vat = info.nogVat; tot = info.nogIncl; }
  else if (orig.invoice_kind === "poets_intern") { tot = r2(e * POETS_INCL / POETS_EXCL); vat = r2(tot - e); }
  else if (orig.subtotal && Math.abs(orig.vat / orig.subtotal - 0.21) < 0.001) { vat = r2(e * 0.21); tot = r2(e + vat); }
  else { vat = r2(e * (orig.subtotal ? orig.vat / orig.subtotal : 0)); tot = r2(e + vat); }
  return { subtotal: -e, vat: -vat, total: -tot };
}

/** Mag deze factuur (nog) gecrediteerd worden? Zelfde weigeringen als de RPC. */
export function crediteerbaar(orig: OrigForCredit, info: CreditInfo): boolean {
  return !isCredit(orig) && orig.status !== "concept" && !orig.telt_niet_mee && info.nogExcl > 0;
}

const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);

/** Badge op het origineel. */
export function creditBadge(orig: OrigForCredit, info: CreditInfo): { label: string; tone: "red" | "slate" | "amber" } | null {
  if (!info.n) return null;
  if (orig.payment_status === "betaald" && orig.invoice_kind !== "intern") {
    return { label: `Terugbetaling nodig: ${eur(info.gecrediteerdIncl)}`, tone: "red" };
  }
  if (info.volledig) return { label: "Volledig gecrediteerd", tone: "slate" };
  return { label: `${eur(info.gecrediteerdIncl)} gecrediteerd`, tone: "amber" };
}

/** Betaal-label in de lijst: volledig gecrediteerd + open → "Gecrediteerd" (afgeleid, niet opgeslagen). */
export function betaalLabel(orig: OrigForCredit, info: CreditInfo | null): "betaald" | "open" | "gecrediteerd" | "n.v.t." {
  if (isCredit(orig) || orig.invoice_kind === "intern" || orig.payment_status === "nvt") return "n.v.t.";
  if (orig.payment_status === "betaald") return "betaald";
  return info?.volledig ? "gecrediteerd" : "open";
}

/** Tekst op het document, gelijk aan de RPC. */
export function creditDocumentTekst(origNummer: string | null, origCreatedAt: string, reden: string): string {
  const [y, m, d] = nlDate(origCreatedAt).split("-");
  return `Creditering van factuur ${origNummer || "—"} d.d. ${d}-${m}-${y}. Reden: ${reden.trim()}`;
}

/** "1.234,56" / "1234.56" / "€ 100" → 1234.56; leeg of ongeldig → null. */
export function parseBedrag(s: string | null | undefined): number | null {
  let t = String(s ?? "").replace(/[€\s]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? r2(n) : null;
}
