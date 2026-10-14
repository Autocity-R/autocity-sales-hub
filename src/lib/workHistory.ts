/** Werkhistorie per afgeleverde auto: vóór/na aflevering splitsen (alleen lezen). */

const AMS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" });

/** Kalenderdag (YYYY-MM-DD) in Europe/Amsterdam. */
export const amsterdamDay = (d: string | Date): string => AMS.format(new Date(d));

/**
 * Afleverdatum is vaak een kale datum (middernacht UTC). Dan is de bedoelde dag de UTC-datum zelf,
 * niet de NL-dag van dat moment (die is gelijk, maar bij 22:00Z zou hij verschuiven).
 */
export const deliveryDay = (d: string | Date): string => {
  const s = typeof d === "string" ? d : d.toISOString();
  if (/^\d{4}-\d{2}-\d{2}($|T00:00:00(\.0+)?(Z|\+00:00)?$)/.test(s)) return s.slice(0, 10);
  return amsterdamDay(d);
};

export interface SplittableOrder { created_at: string; source?: string | null }

export function splitWorkOrdersByDelivery<T extends SplittableOrder>(orders: T[], deliveredAt: string | Date | null | undefined) {
  if (!deliveredAt) return { before: [...orders], after: [] as T[] };
  const dDay = deliveryDay(deliveredAt);
  const before: T[] = [];
  const after: T[] = [];
  for (const o of orders) {
    if (o.source === "checklist" || amsterdamDay(o.created_at) <= dDay) before.push(o);
    else after.push(o);
  }
  return { before, after };
}

/** Kenteken/VIN-sleutel voor hard matchen: hoofdletters, alleen A-Z0-9; korter dan 6 = niet matchen. */
export const plateKey = (s?: string | null): string | null => {
  const k = String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return k.length >= 6 ? k : null;
};
export const samePlate = (a?: string | null, b?: string | null) => {
  const ka = plateKey(a);
  return !!ka && ka === plateKey(b);
};

export const OPEN_STATUSES = ["aangevraagd", "ingepland", "bezig", "gepauzeerd"];

export const SOURCE_LABELS: Record<string, string> = {
  garantie: "Garantie", aftersales: "Aftersales", inname: "Inname", inname_auto: "Inname",
  extern: "Extern", checklist: "Checklist",
};
export const sourceLabel = (s?: string | null) => (s ? SOURCE_LABELS[s] || s : "—");

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: "Actief", in_progress: "In behandeling", resolved: "Opgelost", void: "Vervallen",
};
export const claimStatusLabel = (s?: string | null) => CLAIM_STATUS_LABELS[s || "pending"] || s || "Actief";
export const isOpenClaim = (s?: string | null) => !s || s === "pending" || s === "in_progress";

export const fmtHours = (sec?: number | null) => {
  if (!sec || sec <= 0) return "0:00";
  const m = Math.round(sec / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};

/** Open eerst, dan nieuwste bovenaan. */
export const sortAfter = <T extends { status: string; created_at: string }>(list: T[]) =>
  [...list].sort((a, b) => {
    const oa = OPEN_STATUSES.includes(a.status) ? 0 : 1;
    const ob = OPEN_STATUSES.includes(b.status) ? 0 : 1;
    return oa - ob || b.created_at.localeCompare(a.created_at);
  });
