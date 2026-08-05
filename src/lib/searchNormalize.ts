/**
 * Kleine, pure zoek-helpers die door meerdere overzichten worden gebruikt.
 * Doel: zoeken dat "alles vindt" — ongeacht hoofdletters, streepjes in
 * kentekens, spaties in postcodes of valuta-tekens in bedragen.
 */

/** Kleine letters, geaccentueerde tekens ontdaan, dubbele spaties weg. */
export const norm = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Alleen letters+cijfers: maakt kenteken/postcode/telefoon vergelijkbaar. */
export const squash = (v: unknown): string => norm(v).replace(/[^a-z0-9]/g, "");

/** Bedrag als zoekbare tekst: "1234.5" én "1234,50". */
export const amountTokens = (v: unknown): string[] => {
  const n = Number(v);
  if (!Number.isFinite(n)) return [];
  const fixed = n.toFixed(2);
  return [String(n), fixed, fixed.replace(".", ","), String(Math.round(n))];
};

/**
 * Bouwt één zoek-index uit losse velden. Bevat zowel de genormaliseerde tekst
 * als de "gesquashte" variant, zodat "JBR40J" en "jbr-40-j" beide matchen.
 */
export const buildHaystack = (fields: unknown[]): string => {
  const parts: string[] = [];
  for (const f of fields) {
    if (f === null || f === undefined || f === "") continue;
    const n = norm(f);
    if (!n) continue;
    parts.push(n);
    const s = squash(f);
    if (s && s !== n) parts.push(s);
  }
  return parts.join(" | ");
};

/**
 * Matcht een zoekterm tegen een haystack. Meerdere woorden = AND.
 * Elke term matcht op de normale tekst óf op de gesquashte variant.
 */
export const matchesSearch = (haystack: string, query: string): boolean => {
  const q = norm(query);
  if (!q) return true;
  return q.split(" ").filter(Boolean).every((term) => {
    if (haystack.includes(term)) return true;
    const s = squash(term);
    return !!s && haystack.includes(s);
  });
};