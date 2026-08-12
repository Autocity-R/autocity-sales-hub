/**
 * Kenteken-normalisatie: hoofdletters, streepjes in plaats van spaties,
 * dubbele scheidingstekens weg. Gebruikt bij het invullen/wijzigen van
 * `license_number` zodat de opslag overal gelijk is.
 */
export const normalizeLicensePlate = (value: string): string =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");