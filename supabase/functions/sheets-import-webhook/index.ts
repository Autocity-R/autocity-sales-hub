import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetUpdateRequest {
  vin?: string;
  license_number?: string;
  external_reference?: string;
  import_status: string;
  row_number?: number;
}

// Status mapping from Google Sheets to database
const statusMapping: Record<string, string> = {
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
  'Ingeschreven': 'ingeschreven'
};

// Status hiërarchie: hogere index = verder in het proces
const statusHierarchy: Record<string, number> = {
  'niet_gestart': 0,
  'niet_aangemeld': 1,
  'aangemeld': 2,
  'aanvraag_ontvangen': 3,
  'aangekomen': 4,
  'goedgekeurd': 5,
  'transport_geregeld': 5,
  'onderweg': 5,
  'afgemeld': 5,
  'bpm_betaald': 6,
  'herkeuring': 6,
  'ingeschreven': 7,
};

// Reverse lookup: index → status name (voor import_status_highest)
const statusByIndex: Record<number, string> = {
  0: 'niet_gestart',
  1: 'niet_aangemeld',
  2: 'aangemeld',
  3: 'aanvraag_ontvangen',
  4: 'aangekomen',
  5: 'goedgekeurd',
  6: 'bpm_betaald',
  7: 'ingeschreven',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('📥 Received webhook request from Google Sheets');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateRequest: SheetUpdateRequest = await req.json();
    console.log('Sheet update request:', updateRequest);

    if (!updateRequest.import_status) {
      return new Response(JSON.stringify({ error: 'import_status is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mappedStatus = statusMapping[updateRequest.import_status] || updateRequest.import_status.toLowerCase().replace(/ /g, '_');

    // Find vehicle
    let query = supabase.from('vehicles').select('*');
    
    if (updateRequest.vin) {
      // Fuzzy VIN matching: trim, uppercase, match first 17 chars
      const cleanVin = updateRequest.vin.trim().toUpperCase().substring(0, 17);
      query = query.ilike('vin', `${cleanVin}%`);
    } else if (updateRequest.license_number) {
      query = query.eq('license_number', updateRequest.license_number);
    } else if (updateRequest.external_reference) {
      query = query.eq('external_sheet_reference', updateRequest.external_reference);
    } else {
      return new Response(JSON.stringify({ error: 'Vehicle identifier required (vin, license_number, or external_reference)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: vehicles, error: findError } = await query;

    if (findError) {
      console.error('Error finding vehicle:', findError);
      return new Response(JSON.stringify({ error: 'Database error', details: findError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('Vehicle not found with provided identifiers');
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (vehicles.length > 1) {
      console.warn('Multiple vehicles found, using first one');
    }

    const vehicle = vehicles[0];
    const oldStatus = vehicle.import_status;
    const details = vehicle.details || {};

    // === EARLY RETURN: Status unchanged ===
    if (mappedStatus === oldStatus) {
      console.log(`⏭️ Status unchanged for vehicle ${vehicle.id}: ${oldStatus} — skipping`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Status unchanged',
        vehicle_id: vehicle.id,
        current_status: oldStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === BESCHERMING 1: Inruil/leenauto skip ===
    if (details.isTradeIn === true || vehicle.status === 'leenauto') {
      console.log(`⏭️ Skipping trade-in/loan car: vehicle ${vehicle.id}`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Vehicle is trade-in or loan car — import sync skipped',
        vehicle_id: vehicle.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === BESCHERMING 2: RDW protected ===
    if (vehicle.rdw_protected === true) {
      console.log(`🔒 RDW protected: vehicle ${vehicle.id} — status not overwritten`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Vehicle is RDW protected — import status locked',
        vehicle_id: vehicle.id,
        current_status: oldStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === BESCHERMING 3: Transport check ===
    if (details.transportStatus === 'onderweg' && mappedStatus !== 'niet_aangemeld') {
      console.log(`🚛 Transport check: vehicle ${vehicle.id} is onderweg — only niet_aangemeld allowed`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Vehicle is in transport — only niet_aangemeld status allowed',
        vehicle_id: vehicle.id,
        current_status: oldStatus,
        attempted_status: mappedStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === BESCHERMING 4: Status hiërarchie check met override-detectie ===
    const currentIndex = statusHierarchy[oldStatus] ?? -1;
    const newIndex = statusHierarchy[mappedStatus] ?? -1;
    const highestReached = statusHierarchy[vehicle.import_status_highest] ?? -1;

    // Detecteer handmatige reset: huidige DB-status is lager dan hoogst bereikte
    const wasManuallyReset = highestReached >= 0 && currentIndex >= 0 && currentIndex < highestReached;

    if (newIndex >= 0 && currentIndex >= 0 && newIndex <= currentIndex && !wasManuallyReset) {
      console.log(`📊 Hierarchy check: vehicle ${vehicle.id} — cannot go from ${oldStatus}(${currentIndex}) to ${mappedStatus}(${newIndex})`);
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: `Status downgrade not allowed: ${oldStatus} → ${mappedStatus}`,
        vehicle_id: vehicle.id,
        current_status: oldStatus,
        attempted_status: mappedStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (wasManuallyReset) {
      console.log(`🔄 Manual reset detected for vehicle ${vehicle.id}: current=${oldStatus}(${currentIndex}), highest=${vehicle.import_status_highest}(${highestReached}). Allowing Sheet override to ${mappedStatus}(${newIndex}).`);
    }

    // Calculate new highest status
    const newHighestIndex = Math.max(newIndex, highestReached);
    const newHighestStatus = statusByIndex[newHighestIndex] || vehicle.import_status_highest || mappedStatus;

    // Update vehicle import status + highest tracking
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        import_status: mappedStatus,
        import_updated_at: new Date().toISOString(),
        import_status_highest: newHighestStatus,
        import_status_locked_at: new Date().toISOString(),
        external_sheet_reference: updateRequest.external_reference || updateRequest.row_number?.toString() || vehicle.external_sheet_reference
      })
      .eq('id', vehicle.id);

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update vehicle', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the status change
    const { error: logError } = await supabase
      .from('vehicle_import_logs')
      .insert({
        vehicle_id: vehicle.id,
        old_status: oldStatus,
        new_status: mappedStatus,
        changed_by: 'google_sheets',
        external_reference: updateRequest.external_reference || updateRequest.row_number?.toString()
      });

    if (logError) {
      console.error('Error logging status change:', logError);
    }

    console.log(`✅ Successfully updated vehicle ${vehicle.id} from ${oldStatus} to ${mappedStatus}${wasManuallyReset ? ' (manual reset override)' : ''}`);

    return new Response(JSON.stringify({ 
      success: true, 
      vehicle_id: vehicle.id,
      old_status: oldStatus,
      new_status: mappedStatus,
      manual_reset_override: wasManuallyReset,
      message: 'Import status updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sheets-import-webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
