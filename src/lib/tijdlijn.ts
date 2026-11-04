/**
 * Voertuig-tijdlijn (BOUWSTAP 13A) — pure helpers voor de gedeelde Historie-component.
 * De data komt uit de alleen-lezen RPC voertuig_tijdlijn (SECURITY INVOKER, RLS blijft gelden);
 * deze functies bepalen alleen de NL-weergave, groepering en filtering.
 */

export type TijdlijnCategorie =
  | "status" | "import" | "inname" | "werkplaats" | "verkoop" | "nazorg" | "overig";

export interface TijdlijnEvent {
  ts: string; // ISO timestamptz uit de RPC
  heeft_tijd: boolean; // false = datum zonder tijd (bv. factuur_datum, betaald_op)
  categorie: TijdlijnCategorie;
  type: string;
  titel: string;
  detail: string | null;
  door_naam: string | null;
  bron_tabel: string | null;
  bron_id: string | null;
  via_ander_record: boolean;
}

export const CATEGORIE_LABELS: Record<TijdlijnCategorie, string> = {
  status: "Status",
  import: "Import/BPM",
  inname: "Inname",
  werkplaats: "Werkplaats",
  verkoop: "Verkoop",
  nazorg: "Nazorg",
  overig: "Overig",
};

export const CATEGORIE_VOLGORDE: TijdlijnCategorie[] = [
  "status", "import", "inname", "werkplaats", "verkoop", "nazorg", "overig",
];

const NL_TZ = "Europe/Amsterdam";

const partsOf = (iso: string | Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: NL_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(typeof iso === "string" ? new Date(iso) : iso);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute") };
};

/** "dd-mm-jjjj uu:mm" in NL-tijd; zonder tijd als heeft_tijd false is. */
export function formatEventTs(ts: string, heeftTijd: boolean): string {
  const p = partsOf(ts);
  const datum = `${p.d}-${p.m}-${p.y}`;
  return heeftTijd ? `${datum} ${p.hh}:${p.mm}` : datum;
}

/** yyyy-MM-dd van de NL-kalenderdag (voor groepering). */
export function dagKey(ts: string): string {
  const p = partsOf(ts);
  return `${p.y}-${p.m}-${p.d}`;
}

const kopFmt = new Intl.DateTimeFormat("nl-NL", {
  timeZone: NL_TZ, weekday: "short", day: "numeric", month: "short", year: "numeric",
});
/** Dagkop zoals "di 9 sep 2026". */
export function dagKop(ts: string): string {
  return kopFmt.format(new Date(ts)).replace(/\./g, "");
}

export interface DagGroep {
  key: string; // yyyy-MM-dd (NL)
  kop: string;
  events: TijdlijnEvent[];
}

/** Groepeer per NL-kalenderdag; nieuwste dag en nieuwste gebeurtenis bovenaan. */
export function groupPerDag(events: TijdlijnEvent[]): DagGroep[] {
  const gesorteerd = [...events].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  const groepen = new Map<string, DagGroep>();
  for (const e of gesorteerd) {
    const key = dagKey(e.ts);
    if (!groepen.has(key)) groepen.set(key, { key, kop: dagKop(e.ts), events: [] });
    groepen.get(key)!.events.push(e);
  }
  return Array.from(groepen.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

/** Filter op categorie; "alles" laat alles door. */
export function filterOpCategorie(events: TijdlijnEvent[], filter: TijdlijnCategorie | "alles"): TijdlijnEvent[] {
  if (filter === "alles") return events;
  return events.filter(e => e.categorie === filter);
}

/** Datumveld zonder tijd (yyyy-MM-dd) veilig tonen; ISO-momenten gaan via NL-tijd. */
export function nlDateSafe(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return formatEventTs(d, false);
}

/** Hele dagen tussen twee momenten (NL-kalenderdagen). */
export function dagenTussen(van: string | Date, tot: string | Date): number {
  const a = dagKey(typeof van === "string" ? van : van.toISOString());
  const b = dagKey(typeof tot === "string" ? tot : tot.toISOString());
  return Math.max(0, Math.round((+new Date(b + "T12:00:00Z") - +new Date(a + "T12:00:00Z")) / 86400000));
}
