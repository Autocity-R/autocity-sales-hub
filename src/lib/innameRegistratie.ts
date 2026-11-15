/**
 * Inname-registratie (BOUWSTAP 16A): sleutels + laadkabels.
 * Alleen weergave; wie/wanneer wordt in de database door een trigger gezet.
 */
import { formatEventTs } from "./tijdlijn";

export type AantalInname = 1 | 2 | null;

/** Normaliseer een DB-waarde naar 1, 2 of null (alles anders = leeg). */
export const toAantal = (v: unknown): AantalInname => (v === 1 || v === 2 ? v : null);

/** Nogmaals op dezelfde knop = weer leeg. */
export const toggleAantal = (huidig: AantalInname, gekozen: 1 | 2): AantalInname =>
  huidig === gekozen ? null : gekozen;

export const laadkabelLabel = (n: 1 | 2) => `${n} ${n === 1 ? "laadkabel" : "laadkabels"}`;
export const sleutelLabel = (n: 1 | 2) => `${n} ${n === 1 ? "sleutel" : "sleutels"}`;

/** Compacte kaart-weergave "🔑 2 · 🔌 1"; lege waarden worden weggelaten, alles leeg = "". */
export function formatSleutelsLaadkabels(sleutels: unknown, laadkabels: unknown): string {
  const s = toAantal(sleutels);
  const l = toAantal(laadkabels);
  return [s ? `🔑 ${s}` : null, l ? `🔌 ${l}` : null].filter(Boolean).join(" · ");
}

/** "geregistreerd door X op dd-mm-jjjj uu:mm" (NL-tijd); zonder tijdstip = "". */
export function formatRegistratie(naam: string | null | undefined, op: string | null | undefined): string {
  if (!op) return "";
  return `geregistreerd door ${naam?.trim() || "onbekend"} op ${formatEventTs(op, true)}`;
}
