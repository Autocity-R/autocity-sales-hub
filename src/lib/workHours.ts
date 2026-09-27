/**
 * Werktijden werkplaats (Europe/Amsterdam). Bron: tabel werkplaats_werktijden (weekday 1=ma … 7=zo).
 * Wordt gebruikt om gewerkte tijd af te knippen op werktijd (Performance/Rapportages) en
 * spiegelt de database-functie werkplaats_auto_pauze (pauzemoment = eindtijd van de startdag).
 */
import { supabase } from "@/integrations/supabase/client";

export interface DaySchedule { enabled: boolean; start: string; end: string }
export type WorkSchedule = Record<number, DaySchedule>;

export const DEFAULT_SCHEDULE: WorkSchedule = {
  1: { enabled: true, start: "08:00", end: "18:00" },
  2: { enabled: true, start: "08:00", end: "18:00" },
  3: { enabled: true, start: "08:00", end: "18:00" },
  4: { enabled: true, start: "08:00", end: "18:00" },
  5: { enabled: true, start: "08:00", end: "18:00" },
  6: { enabled: true, start: "08:00", end: "18:00" },
  7: { enabled: false, start: "08:00", end: "18:00" },
};

export const WEEKDAY_LABELS: Record<number, string> = { 1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag", 7: "Zondag" };

let current: WorkSchedule = DEFAULT_SCHEDULE;
export const getWorkSchedule = () => current;
export const setWorkSchedule = (s: WorkSchedule) => { current = s; };

export async function fetchWorkSchedule(): Promise<WorkSchedule> {
  const { data, error } = await (supabase as any).from("werkplaats_werktijden").select("weekday, enabled, start_time, end_time");
  if (error || !data?.length) return DEFAULT_SCHEDULE;
  const s: WorkSchedule = { ...DEFAULT_SCHEDULE };
  data.forEach((r: any) => { s[r.weekday] = { enabled: !!r.enabled, start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) }; });
  return s;
}
/** Laadt de instelling en maakt hem actief voor alle berekeningen. */
export async function loadWorkSchedule() { const s = await fetchWorkSchedule(); setWorkSchedule(s); return s; }

const TZ = "Europe/Amsterdam";
const PARTS = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

const localParts = (ms: number) => {
  const p: Record<string, number> = {};
  PARTS.formatToParts(new Date(ms)).forEach(x => { if (x.type !== "literal") p[x.type] = Number(x.value); });
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
};
const offsetMs = (ms: number) => {
  const p = localParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};
/** NL-lokale datum + tijd → UTC ms. */
export function nlToUtc(y: number, m: number, d: number, hhmm: string): number {
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - offsetMs(guess);
  t = guess - offsetMs(t);
  return t;
}
const isoDow = (y: number, m: number, d: number) => { const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return w === 0 ? 7 : w; };

/** Werkvensters (UTC ms) die [from,to] raken, per NL-kalenderdag. */
export function workWindows(from: number, to: number, s: WorkSchedule = current): [number, number][] {
  const out: [number, number][] = [];
  if (!(to > from)) return out;
  const p = localParts(from);
  let day = Date.UTC(p.year, p.month - 1, p.day);
  for (let i = 0; i < 400; i++, day += 86400000) {
    const dt = new Date(day);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const ds = s[isoDow(y, m, d)];
    const dayStart = nlToUtc(y, m, d, "00:00");
    if (dayStart >= to) break;
    if (ds?.enabled) {
      const ws = nlToUtc(y, m, d, ds.start), we = nlToUtc(y, m, d, ds.end);
      const a = Math.max(ws, from), b = Math.min(we, to);
      if (b > a) out.push([a, b]);
    }
  }
  return out;
}

/** Seconden binnen werktijd van een interval. */
export const secondsWithinWork = (from: number, to: number, s: WorkSchedule = current) =>
  workWindows(from, to, s).reduce((a, [x, y]) => a + (y - x), 0) / 1000;

/**
 * Plaats `seconds` werktijd achterwaarts vóór `end`, alleen in werkvensters (max 60 dagen terug).
 * Gebruikt voor eerder opgebouwde sessies (paused_seconds) waarvan het exacte tijdstip niet bewaard is.
 */
export function placeBackward(end: number, seconds: number, s: WorkSchedule = current): [number, number][] {
  const out: [number, number][] = [];
  let left = seconds * 1000;
  if (left <= 0) return out;
  const wins = workWindows(end - 60 * 86400000, end, s).reverse();
  for (const [a, b] of wins) {
    const take = Math.min(left, b - a);
    out.push([b - take, b]);
    left -= take;
    if (left <= 0) break;
  }
  if (left > 0) { const e = out.length ? out[out.length - 1][0] : end; out.push([e - left, e]); }
  return out;
}

/** Spiegel van de DB-functie: tijdstip waarop een lopende timer automatisch gepauzeerd wordt. */
export function autoPauseAt(startedAt: number, s: WorkSchedule = current): number {
  const p = localParts(startedAt);
  const ds = s[isoDow(p.year, p.month, p.day)];
  const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}`;
  if (!ds?.enabled || hhmm >= `${ds.end}:00`) return startedAt;
  return nlToUtc(p.year, p.month, p.day, ds.end);
}
