import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyStatusToVehicle, statusMapping } from "../_shared/importStatus.ts";


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

// statusMapping / hiërarchie / beschermingen: zie ../_shared/importStatus.ts


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
    let query = supabase.from('vehicles').select('*').neq('status', 'extern');
    
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

    // Dubbele VIN's komen voor: werk ALLE relevante rijen bij (niet extern/afgeleverd),
    // verkooprijen eerst, zodat de lijst die verkoop ziet altijd klopt.
    const rank = (s: string | null) =>
      s === 'verkocht_b2c' ? 0 : s === 'verkocht_b2b' ? 1 : s === 'voorraad' ? 2 : 3;
    const targets = vehicles
      .filter((v: any) => v.status !== 'afgeleverd')
      .sort(
        (a: any, b: any) =>
          rank(a.status) - rank(b.status) ||
          String(b.updated_at || '').localeCompare(String(a.updated_at || '')),
      );

    if (targets.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        reason: 'Alleen afgeleverde/externe voertuigen gevonden',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (targets.length > 1) {
      console.warn(`⚠️ ${targets.length} voertuigen met dezelfde identificatie — alle rijen worden bijgewerkt`);
    }

    const externalReference =
      updateRequest.external_reference || updateRequest.row_number?.toString() || null;

    const results = [] as any[];
    for (const vehicle of targets) {
      const r = await applyStatusToVehicle(supabase, vehicle, mappedStatus, {
        source: 'google_sheets',
        externalReference,
      });
      console.log(
        r.updated
          ? `✅ ${vehicle.id}: ${r.old_status} → ${mappedStatus}`
          : `⏭️ ${vehicle.id} overgeslagen: ${r.reason}`,
      );
      results.push(r);
    }

    const anyUpdated = results.some((r) => r.updated);

    return new Response(JSON.stringify({
      success: true,
      skipped: !anyUpdated,
      new_status: mappedStatus,
      matched_vehicles: targets.length,
      updated_vehicles: results.filter((r) => r.updated).length,
      results,
      message: anyUpdated ? 'Import status updated successfully' : 'Geen enkele rij bijgewerkt',
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
