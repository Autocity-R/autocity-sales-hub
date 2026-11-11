/**
 * Leveranciers-inzicht (klantenmenu + voertuigdetail).
 *
 * Inkoper is in de app een verkoper (zelfde rechten, `toEffectiveRole`) maar
 * ziet daarnaast de leveranciers. Verkopers en aftersales zien ze niet.
 * Werkt op de ECHTE rol uit user_roles, niet op de effectieve rol.
 */
export const SUPPLIER_VIEW_ROLES = [
  "owner",
  "admin",
  "manager",
  "operationeel_directeur",
  "administratie",
  "inkoper",
] as const;

export const canViewSuppliers = (actualRole: string | null | undefined): boolean =>
  !!actualRole && (SUPPLIER_VIEW_ROLES as readonly string[]).includes(actualRole);

/** Rollen die voor alle bestaande rolchecks als een andere rol gelden. */
const EFFECTIVE_ROLE: Record<string, string> = { inkoper: "verkoper" };

export const toEffectiveRole = (role: string | null): string | null =>
  role ? EFFECTIVE_ROLE[role] ?? role : role;

/** Leveranciers uit een contactlijst halen voor wie ze niet mag zien. */
export const filterContactsForRole = <T extends { type?: string | null }>(
  contacts: T[],
  actualRole: string | null | undefined,
): T[] => (canViewSuppliers(actualRole) ? contacts : contacts.filter((c) => c.type !== "supplier"));
