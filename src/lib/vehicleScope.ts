/**
 * Centrale scope-helper voor de HANDELSVOORRAAD.
 *
 * Achtergrond: werkplaats-/aftersales-voertuigen van externe klanten staan in
 * dezelfde `vehicles`-tabel met `status = 'extern'`. Die auto's zijn GEEN
 * handelsvoorraad en mogen nooit opduiken in verkoop-/voorraadlijsten,
 * dashboards, tellingen, rapportages of exports.
 *
 * Gebruik daarom ALTIJD één van deze helpers in plaats van losse filters:
 *
 *   // server-side (Supabase query)
 *   let q = supabase.from('vehicles').select('*').eq('status', 'voorraad');
 *   q = handelsvoorraadScope(q);
 *
 *   // client-side (array die al binnen is)
 *   const rows = filterHandelsvoorraad(data);
 *
 * Alleen werkplaats-/aftersales-schermen (werkorders, inname, facturen,
 * prijslijst-lookup, garantie-koppeling) mogen externe auto's tonen.
 */

/** Status waarmee externe werkplaats-auto's worden gemarkeerd. */
export const EXTERNAL_VEHICLE_STATUS = "extern" as const;

/** Statussen die NOOIT in de handelsvoorraad/verkoopschermen thuishoren. */
export const NON_TRADE_VEHICLE_STATUSES = [EXTERNAL_VEHICLE_STATUS] as const;

/** Verkochte/afgeleverde statussen (voor omzet- en verkooprapportages). */
export const SOLD_VEHICLE_STATUSES = ["verkocht_b2b", "verkocht_b2c", "afgeleverd"] as const;

/**
 * Sluit externe werkplaats-auto's uit van een Supabase `vehicles`-query.
 * Veilig om overal toe te voegen: op queries die al op een specifieke status
 * filteren is het simpelweg een no-op qua resultaat.
 */
export function handelsvoorraadScope<T>(query: T): T {
  // @ts-expect-error - supabase query builder chain
  return query.neq("status", EXTERNAL_VEHICLE_STATUS);
}

/** Alias met expliciete naam voor leesbaarheid op call-sites. */
export const excludeExternalVehicles = handelsvoorraadScope;

type VehicleLike = {
  status?: string | null;
  salesStatus?: string | null;
  details?: { excludeFromStock?: boolean; externalWorkshop?: boolean } | null;
} | null | undefined;

/** Is dit een externe werkplaats-auto (dus geen handelsvoorraad)? */
export function isExternalVehicle(vehicle: VehicleLike): boolean {
  if (!vehicle) return false;
  const status = vehicle.status ?? vehicle.salesStatus ?? null;
  if (status === EXTERNAL_VEHICLE_STATUS) return true;
  const d = vehicle.details ?? null;
  return d?.excludeFromStock === true || d?.externalWorkshop === true;
}

/** Vangnet aan de clientkant: verwijder externe auto's uit een lijst. */
export function filterHandelsvoorraad<T extends VehicleLike>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isExternalVehicle(r));
}
