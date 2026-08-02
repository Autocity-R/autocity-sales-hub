/**
 * Zichtbaarheid van gepland werk voor de uitvoerende rollen (monteur, schadeherstel,
 * uitdeuker): een work_order met planned_at ná vandaag (Europe/Amsterdam) is pas
 * zichtbaar/oppakbaar op de geplande dag zelf. Planning, agenda en chef-cockpit
 * gebruiken dit NIET — daar blijft gepland werk vooruit zichtbaar.
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

/** Zichtbaar voor de vakman: geen planning, of gepland op/voor vandaag. */
export const isReleasedToFloor = <T extends { planned_at?: string | null }>(w: T): boolean =>
  !isPlannedInFuture(w.planned_at);

/** Nette datumweergave voor de blokkade-toast. */
export const formatPlannedDay = (plannedAt: string): string =>
  new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
  }).format(new Date(plannedAt));
