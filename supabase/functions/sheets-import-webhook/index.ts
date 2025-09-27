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
  'Aangemeld': 'aangemeld',
  'Goedgekeurd': 'goedgekeurd',
  'Transport geregeld': 'transport_geregeld',
  'Onderweg': 'onderweg',
  'Aangekomen': 'aangekomen',
  'Afgemeld': 'afgemeld',
  'BPM betaald': 'bpm_betaald',
  'Herkeuring': 'herkeuring',
  'Ingeschreven': 'ingeschreven'
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const updateRequest: SheetUpdateRequest = await req.json();
    console.log('Sheet update request:', updateRequest);

    // Validate required fields
    if (!updateRequest.import_status) {
      return new Response(JSON.stringify({ error: 'import_status is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map status from sheets to database format
    const mappedStatus = statusMapping[updateRequest.import_status] || updateRequest.import_status.toLowerCase().replace(/ /g, '_');

    // Find vehicle by VIN, license number, or external reference
    let query = supabase.from('vehicles').select('*');
    
    if (updateRequest.vin) {
      query = query.eq('vin', updateRequest.vin);
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

    // Update vehicle import status
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        import_status: mappedStatus,
        import_updated_at: new Date().toISOString(),
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
      // Don't fail the request if logging fails
    }

    console.log(`Successfully updated vehicle ${vehicle.id} from ${oldStatus} to ${mappedStatus}`);

    return new Response(JSON.stringify({ 
      success: true, 
      vehicle_id: vehicle.id,
      old_status: oldStatus,
      new_status: mappedStatus,
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