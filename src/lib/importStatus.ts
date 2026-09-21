// Centrale labels, volgorde en badge-stijlen voor vehicles.import_status.
// Spiegelt de rangorde van supabase/functions/_shared/importStatus.ts.

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  niet_gestart: "Niet gestart",
  niet_aangemeld: "Niet aangemeld",
  aangemeld: "Aangemeld",
  aangekomen: "Aangekomen",
  transport_geregeld: "Transport geregeld",
  onderweg: "Onderweg",
  afgemeld: "Afgemeld",
  aanvraag_ontvangen: "Aanvraag ontvangen",
  bestanden_gevraagd: "Verzoek juiste bestanden",
  keuringsafspraak: "Keuringsafspraak (steekproef)",
  goedgekeurd: "Goedgekeurd",
  toonplicht: "Toonplicht",
  bpm_betaald: "BPM betaald",
  herkeuring: "Herkeuring",
  ingeschreven: "Ingeschreven",
};

/** Rangorde in de importflow (gelijk aan de backend-hiërarchie). */
export const IMPORT_STATUS_RANK: Record<string, number> = {
  niet_gestart: 0,
  niet_aangemeld: 1,
  aangemeld: 2,
  aangekomen: 3,
  transport_geregeld: 4,
  onderweg: 4,
  afgemeld: 4,
  aanvraag_ontvangen: 5,
  bestanden_gevraagd: 6,
  keuringsafspraak: 6,
  goedgekeurd: 7,
  toonplicht: 8,
  bpm_betaald: 9,
  herkeuring: 9,
  ingeschreven: 10,
};

/** Statussen die handmatig gekozen kunnen worden, in logische flow-volgorde. */
export const IMPORT_STATUS_OPTIONS: string[] = [
  "niet_aangemeld",
  "aanvraag_ontvangen",
  "bestanden_gevraagd",
  "keuringsafspraak",
  "goedgekeurd",
  "toonplicht",
  "bpm_betaald",
  "ingeschreven",
];

/** Nooit crashen op een onbekende waarde: toon de ruwe waarde leesbaar. */
export function getImportStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return IMPORT_STATUS_LABELS[status] || String(status).replace(/_/g, " ");
}

/** Extra badge-styling voor de uitzonderings-/escalatiestatussen. */
export function importStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case "bestanden_gevraagd":
    case "keuringsafspraak":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "toonplicht":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "";
  }
}
