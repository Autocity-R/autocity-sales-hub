// Gedeelde logica voor het bijwerken van vehicles.import_status
// Gebruikt door sheets-import-webhook (Google Sheets) en
// import-status-from-email (Belastingdienst/RDW/EU-EVA mails).

export const statusMapping: Record<string, string> = {
  'Niet gestart': 'niet_gestart',
  'Niet aangemeld': 'niet_aangemeld',
  'Aangemeld': 'aangemeld',
  'Aanvraag ontvangen': 'aanvraag_ontvangen',
  'Aangekomen': 'aangekomen',
  'Goedgekeurd': 'goedgekeurd',
  'Transport geregeld': 'transport_geregeld',
  'Onderweg': 'onderweg',
  'Afgemeld': 'afgemeld',
  'BPM betaald': 'bpm_betaald',
  'BPM Betaald': 'bpm_betaald',
  'Herkeuring': 'herkeuring',
  'Ingeschreven': 'ingeschreven',
};

export const statusHierarchy: Record<string, number> = {
  niet_gestart: 0,
  niet_aangemeld: 1,
  aangemeld: 2,
  aangekomen: 3,
  transport_geregeld: 4,
  onderweg: 4,
  afgemeld: 4,
  aanvraag_ontvangen: 5,
  goedgekeurd: 6,
  bpm_betaald: 7,
  herkeuring: 7,
  ingeschreven: 8,
};

export const statusByIndex: Record<number, string> = {
  0: 'niet_gestart',
  1: 'niet_aangemeld',
  2: 'aangemeld',
  3: 'aangekomen',
  4: 'transport_geregeld',
  5: 'aanvraag_ontvangen',
  6: 'goedgekeurd',
  7: 'bpm_betaald',
  8: 'ingeschreven',
};

export interface VehicleRow {
  id: string;
  status: string | null;
  import_status: string | null;
  import_status_highest: string | null;
  rdw_protected: boolean | null;
  details: Record<string, unknown> | null;
  external_sheet_reference: string | null;
}

export interface ApplyOptions {
  /** 'google_sheets' | 'email_import' */
  source: string;
  externalReference?: string | null;
  /** Mail van de Belastingdienst/RDW is leidend: transport-blokkade overslaan. */
  ignoreTransportGuard?: boolean;
}

export interface ApplyResult {
  vehicle_id: string;
  updated: boolean;
  old_status: string | null;
  new_status: string;
  reason?: string;
}

/** Werk één voertuigrij bij volgens de beschermingsregels. */
export async function applyStatusToVehicle(
  supabase: any,
  vehicle: VehicleRow,
  mappedStatus: string,
  opts: ApplyOptions,
): Promise<ApplyResult> {
  const oldStatus = vehicle.import_status;
  const details = (vehicle.details || {}) as Record<string, unknown>;
  const base = { vehicle_id: vehicle.id, old_status: oldStatus, new_status: mappedStatus };

  if (mappedStatus === oldStatus) {
    return { ...base, updated: false, reason: 'Status ongewijzigd' };
  }
  if (vehicle.status === 'leenauto') {
    return { ...base, updated: false, reason: 'Leenauto — import sync overgeslagen' };
  }
  if (vehicle.rdw_protected === true) {
    return { ...base, updated: false, reason: 'RDW protected — status vergrendeld' };
  }
  if (
    !opts.ignoreTransportGuard &&
    details.transportStatus === 'onderweg' &&
    mappedStatus !== 'niet_aangemeld'
  ) {
    return { ...base, updated: false, reason: 'Voertuig is onderweg — alleen niet_aangemeld toegestaan' };
  }

  const currentIndex = statusHierarchy[oldStatus ?? ''] ?? -1;
  const newIndex = statusHierarchy[mappedStatus] ?? -1;
  const highestReached = statusHierarchy[vehicle.import_status_highest ?? ''] ?? -1;
  const wasManuallyReset = highestReached >= 0 && currentIndex >= 0 && currentIndex < highestReached;

  if (newIndex >= 0 && currentIndex >= 0 && newIndex <= currentIndex && !wasManuallyReset) {
    return {
      ...base,
      updated: false,
      reason: `Downgrade niet toegestaan: ${oldStatus} → ${mappedStatus}`,
    };
  }

  const newHighestIndex = Math.max(newIndex, highestReached);
  const newHighestStatus =
    statusByIndex[newHighestIndex] || vehicle.import_status_highest || mappedStatus;

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('vehicles')
    .update({
      import_status: mappedStatus,
      import_updated_at: now,
      import_status_highest: newHighestStatus,
      import_status_locked_at: now,
      external_sheet_reference: opts.externalReference || vehicle.external_sheet_reference,
    })
    .eq('id', vehicle.id);

  if (updateError) {
    return { ...base, updated: false, reason: `Update mislukt: ${updateError.message}` };
  }

  const { error: logError } = await supabase.from('vehicle_import_logs').insert({
    vehicle_id: vehicle.id,
    old_status: oldStatus,
    new_status: mappedStatus,
    changed_by: opts.source,
    external_reference: opts.externalReference ?? null,
  });
  if (logError) console.error('⚠️ Log mislukt:', logError.message);

  return { ...base, updated: true, reason: wasManuallyReset ? 'Handmatige reset overruled' : undefined };
}

/**
 * Zoek ALLE relevante voertuigrijen bij een VIN (dubbele VIN's komen voor).
 * Externe werkplaatsauto's en afgeleverde auto's blijven ongemoeid.
 * Sorteert de actieve verkooprijen vooraan.
 */
export async function findVehiclesByVin(supabase: any, vin: string): Promise<VehicleRow[]> {
  const cleanVin = vin.trim().toUpperCase().substring(0, 17);
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, status, import_status, import_status_highest, rdw_protected, details, external_sheet_reference, updated_at')
    .ilike('vin', `${cleanVin}%`)
    .neq('status', 'extern')
    .neq('status', 'afgeleverd');
  if (error) throw new Error(error.message);
  const rank = (s: string | null) =>
    s === 'verkocht_b2c' ? 0 : s === 'verkocht_b2b' ? 1 : s === 'voorraad' ? 2 : 3;
  return (data || []).sort(
    (a: any, b: any) =>
      rank(a.status) - rank(b.status) ||
      String(b.updated_at || '').localeCompare(String(a.updated_at || '')),
  );
}
