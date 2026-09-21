/**
 * Zichtbaarheid van gepland werk voor de uitvoerende rollen (monteur, schadeherstel,
 * uitdeuker).
 *
 * Alleen EXTERN werk (externe klanten, origin='extern') dat gepland staat voor een dag
 * ná vandaag (Europe/Amsterdam) blijft verborgen uit de werklijsten — die auto's zijn er
 * simpelweg nog niet en vervuilen de lijst.
 *
 * INTERNE auto's met een planning of klaar-voor-datum staan ALTIJD in de werklijst: die
 * mogen altijd eerder opgepakt worden zodat het personeel vooruit kan werken voor de
 * afleveringen. Planning, agenda en chef-cockpit filteren niets — daar is alles zichtbaar.
 */

/** Kalenderdatum in Europe/Amsterdam als "YYYY-MM-DD". */
export const amsDay = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof d === "string" ? new Date(d) : d);

/** True als de order gepland staat voor een dag ná vandaag. */
export const isPlannedInFuture = (plannedAt?: string | null): boolean => {
  if (!plannedAt) return false;
  return amsDay(plannedAt) > amsDay(new Date());
};

type FloorOrder = { planned_at?: string | null; origin?: string | null };

/** Verborgen op de vloer: uitsluitend extern werk dat later gepland staat. */
export const isHiddenFromFloor = <T extends FloorOrder>(w: T): boolean =>
  w.origin === "extern" && isPlannedInFuture(w.planned_at);

/** Zichtbaar voor de vakman: alles behalve toekomstig gepland EXTERN werk. */
export const isReleasedToFloor = <T extends FloorOrder>(w: T): boolean => !isHiddenFromFloor(w);

/** Nette datumweergave voor de blokkade-toast. */
export const formatPlannedDay = (plannedAt: string): string =>
  new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
  }).format(new Date(plannedAt));
