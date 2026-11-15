/**
 * Live werkplaatsstatus per garantieclaim (BOUWSTAP 16B) — pure functies.
 * Bron: work_orders met warranty_claim_id; per claim telt de meest recente niet-geannuleerde order.
 */

export interface ClaimWerkorder {
  id: string;
  warranty_claim_id: string | null;
  status: string;
  created_at: string;
  planned_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  finished_at: string | null;
  approved_at: string | null;
  assigned_to: string | null;
  assigned_name?: string | null;
  description?: string | null;
  is_rush?: boolean | null;
  branch?: string | null;
}

export type WerkplaatsSoort =
  | "geen" | "niet_ingepland" | "ingepland" | "bezig" | "gepauzeerd" | "afgerond" | "goedgekeurd";

export interface WerkplaatsStatus {
  soort: WerkplaatsSoort;
  label: string;
  teLaat: boolean;
  /** Open claim waarvan het werk goedgekeurd is → "Werk klaar — claim afronden?" (nooit automatisch). */
  afrondenSignaal: boolean;
}

export type WerkplaatsFilter = "alle" | "niet_ingepland" | "ingepland" | "bezig" | "wacht" | "gereed";

export const WERKPLAATS_FILTER_LABELS: Record<WerkplaatsFilter, string> = {
  alle: "Alle",
  niet_ingepland: "Niet ingepland",
  ingepland: "Ingepland",
  bezig: "Bezig",
  wacht: "Wacht op goedkeuring",
  gereed: "Werk gereed",
};

export const AFRONDEN_LABEL = "Werk klaar — claim afronden?";

const NL_TZ = "Europe/Amsterdam";

const nlParts = (iso: string) => {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: NL_TZ, weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return { wd: get("weekday").replace(/\./g, ""), d: get("day"), m: get("month"), hh: get("hour"), mm: get("minute") };
};
const dagKeyNl = (iso: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: NL_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(typeof iso === "string" ? new Date(iso) : iso);

/** "di 18-11 09:00" in NL-tijd. */
export const fmtDagTijd = (iso: string) => { const p = nlParts(iso); return `${p.wd} ${p.d}-${p.m} ${p.hh}:${p.mm}`; };
/** "10:12" in NL-tijd. */
export const fmtTijd = (iso: string) => { const p = nlParts(iso); return `${p.hh}:${p.mm}`; };
/** "18-11" in NL-tijd. */
export const fmtDagMaand = (iso: string) => { const p = nlParts(iso); return `${p.d}-${p.m}`; };

/** Meest recente niet-geannuleerde order per claim (op created_at). */
export function laatsteOrderPerClaim(rows: ClaimWerkorder[]): Map<string, ClaimWerkorder> {
  const map = new Map<string, ClaimWerkorder>();
  for (const r of rows) {
    if (!r.warranty_claim_id || r.status === "geannuleerd") continue;
    const cur = map.get(r.warranty_claim_id);
    if (!cur || +new Date(r.created_at) > +new Date(cur.created_at)) map.set(r.warranty_claim_id, r);
  }
  return map;
}

/** Statuslabel voor de badge. claimOpen = claim nog niet opgelost/vervallen. */
export function werkplaatsStatus(order: ClaimWerkorder | null | undefined, claimOpen: boolean, now: Date = new Date()): WerkplaatsStatus {
  const naam = order?.assigned_name?.trim() || null;
  const metNaam = (s: string) => (naam ? `${s} · ${naam}` : s);
  if (!order) {
    return claimOpen
      ? { soort: "niet_ingepland", label: "Niet ingepland", teLaat: false, afrondenSignaal: false }
      : { soort: "geen", label: "", teLaat: false, afrondenSignaal: false };
  }
  switch (order.status) {
    case "ingepland": {
      const teLaat = !!order.planned_at && !order.started_at && +new Date(order.planned_at) < +now;
      const basis = order.planned_at ? `Ingepland ${fmtDagTijd(order.planned_at)}` : "Ingepland";
      return { soort: "ingepland", label: metNaam(basis) + (teLaat ? " · te laat" : ""), teLaat, afrondenSignaal: false };
    }
    case "bezig": {
      const s = order.started_at;
      const sinds = !s ? "" : dagKeyNl(s) === dagKeyNl(now) ? ` sinds ${fmtTijd(s)}` : ` sinds ${fmtDagTijd(s)}`;
      return { soort: "bezig", label: metNaam(`Bezig${sinds}`), teLaat: false, afrondenSignaal: false };
    }
    case "gepauzeerd":
      return { soort: "gepauzeerd", label: `Gepauzeerd${order.pause_reason?.trim() ? ` · ${order.pause_reason.trim()}` : ""}`, teLaat: false, afrondenSignaal: false };
    case "afgerond":
      return { soort: "afgerond", label: "Klaar — wacht op goedkeuring", teLaat: false, afrondenSignaal: false };
    case "goedgekeurd": {
      const d = order.approved_at || order.finished_at;
      return { soort: "goedgekeurd", label: d ? `Werk gereed ${fmtDagMaand(d)}` : "Werk gereed", teLaat: false, afrondenSignaal: claimOpen };
    }
    default: // 'aangevraagd' of onbekend: er is een order, maar nog niet in de planning
      return { soort: "niet_ingepland", label: "Aangevraagd — nog niet ingepland", teLaat: false, afrondenSignaal: false };
  }
}

/** Past de soort bij het gekozen filter? "Bezig" omvat ook gepauzeerd. */
export function matchWerkplaatsFilter(soort: WerkplaatsSoort, filter: WerkplaatsFilter): boolean {
  switch (filter) {
    case "alle": return true;
    case "niet_ingepland": return soort === "niet_ingepland" || soort === "geen";
    case "ingepland": return soort === "ingepland";
    case "bezig": return soort === "bezig" || soort === "gepauzeerd";
    case "wacht": return soort === "afgerond";
    case "gereed": return soort === "goedgekeurd";
  }
}
