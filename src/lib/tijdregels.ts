/**
 * Tijdregels per persoon (tabel work_order_tijdregels, gevuld door een databasetrigger bij
 * starten/hervatten/pauzeren/afronden/overnemen). Bepalen de uren per persoon als een order ze heeft;
 * orders zonder (complete) tijdregels houden de oude berekening (alles naar assigned_to).
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";

export interface Tijdregel {
  work_order_id: string;
  user_id: string;
  gestart_op: string;
  gestopt_op: string | null;
  stop_reden?: string | null;
  /** werktijd die al op de order stond toen deze regel begon (0 = order begon met tijdregels) */
  vooraf_seconden?: number | null;
}

/** Datum vanaf wanneer de uren per persoon per tijdregel worden geteld. */
export const TIJDREGELS_VANAF = "16-11-2026";
export const TIJDREGELS_SELECT = "work_order_id,user_id,gestart_op,gestopt_op,stop_reden,vooraf_seconden";

/**
 * Order telt per tijdregel als hij regels heeft én de eerste regel geen eerder (zonder regel)
 * geregistreerde tijd had. Een klus die vóór de livegang al tijd had, blijft volledig op de oude manier tellen.
 */
export function usesTijdregels(regels?: Tijdregel[] | null): boolean {
  if (!regels?.length) return false;
  const first = regels.reduce((a, b) => (+new Date(b.gestart_op) < +new Date(a.gestart_op) ? b : a));
  return !Number(first.vooraf_seconden || 0);
}

export function groupByOrder(regels: Tijdregel[]): Map<string, Tijdregel[]> {
  const m = new Map<string, Tijdregel[]>();
  regels.forEach(r => { const l = m.get(r.work_order_id); if (l) l.push(r); else m.set(r.work_order_id, [r]); });
  return m;
}

/** Hangt de regels aan de orders (in place) zodat alle berekeningen ze kunnen gebruiken. */
export function attachTijdregels<T extends { id: string; tijdregels?: Tijdregel[] | null }>(orders: T[], regels: Tijdregel[]): T[] {
  if (!regels.length) return orders;
  const m = groupByOrder(regels);
  orders.forEach(o => { const l = m.get(o.id); if (l) o.tijdregels = l; });
  return orders;
}

/** Alle (voor deze gebruiker leesbare) tijdregels die vanaf `from` begonnen. Fout → [] (oude berekening). */
export async function fetchTijdregelsSince(from: Date): Promise<Tijdregel[]> {
  try {
    return await fetchAllPages<Tijdregel>((a, b) => (supabase as any).from("work_order_tijdregels")
      .select(TIJDREGELS_SELECT).gte("gestart_op", from.toISOString()).order("id").range(a, b));
  } catch {
    return [];
  }
}

/** 4800 s → "1u20". */
export function fmtUren(seconds: number): string {
  const min = Math.round(Math.max(0, seconds) / 60);
  return `${Math.floor(min / 60)}u${String(min % 60).padStart(2, "0")}`;
}

const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] || "Onbekend";

/** "Samsom 1u20 · Dani 0u45" (volgorde: wie het eerst begon). */
export function urenPerPersoonLabel(perPerson: Map<string, number>, nameOf: (id: string) => string): string {
  return Array.from(perPerson.entries()).map(([id, s]) => `${firstName(nameOf(id))} ${fmtUren(s)}`).join(" · ");
}

/** "samen met Dani" / "samen met Dani en Marcos" of null als je alleen werkte. */
export function samenMetLabel(uitvoerders: string[], personId: string, nameOf: (id: string) => string): string | null {
  const others = uitvoerders.filter(id => id !== personId).map(id => firstName(nameOf(id)));
  if (!others.length) return null;
  const last = others.pop()!;
  return `samen met ${others.length ? `${others.join(", ")} en ${last}` : last}`;
}
