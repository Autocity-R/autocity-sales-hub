/**
 * Interne tarieven — spiegel van de databasefuncties intern_deel_prijs / poets_prijs_excl /
 * poets_prijs_incl (zelfde ingangsdatum, NL-kalenderdag).
 *  - Schadeherstel: € 300 ex btw per deel; een velg € 100 ex btw vanaf de ingangsdatum.
 *  - Werkplaats (onderhoud / rijklaar): € 300 ex btw per order.
 *  - Poetsbeurt: € 82,64 ex (€ 100 incl.) tot de ingangsdatum, daarna € 100 ex (€ 121 incl.).
 */
export const TARIEF_VANAF = "2026-11-16";
export const DEEL_PRIJS = 300;
export const VELG_PRIJS = 100;
export const WERKPLAATS_PRIJS = 300;
export const POETS_OUD = { excl: 82.64, incl: 100 };
export const POETS_NIEUW = { excl: 100, incl: 121 };

const NL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });
/** yyyy-MM-dd (NL) van een dag-string of moment; zonder argument: vandaag. */
const dagVan = (op?: string | Date | null) => {
  if (typeof op === "string" && /^\d{4}-\d{2}-\d{2}$/.test(op)) return op;
  return NL_DAY.format(op ? (typeof op === "string" ? new Date(op) : op) : new Date());
};

export const isVelg = (part: string | null | undefined) => /velg/i.test(part || "");
export const nieuwTarief = (op?: string | Date | null) => dagVan(op) >= TARIEF_VANAF;

/** Interne prijs van één schadeherstel-deel ex btw. */
export const deelPrijs = (part: string | null | undefined, op?: string | Date | null) =>
  isVelg(part) && nieuwTarief(op) ? VELG_PRIJS : DEEL_PRIJS;

/** Interne bedrag van één spuit-order (som per deel; zonder delenlijst telt het losse deel). */
export function spuitOrderPrijs(order: { part?: string | null; parts?: unknown }, op?: string | Date | null): number {
  const parts = Array.isArray(order.parts) ? (order.parts as unknown[]).map(p => String(p ?? "")) : [];
  if (parts.length) return parts.reduce((s, p) => s + deelPrijs(p, op), 0);
  return deelPrijs(order.part, op);
}

/** Poetsprijs per beurt op de werkdag. */
export const poetsPrijs = (dag?: string | Date | null) => (nieuwTarief(dag) ? POETS_NIEUW : POETS_OUD);
