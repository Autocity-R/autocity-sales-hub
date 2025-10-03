import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GOOGLE_SERVICE_ACCOUNT_KEY niet gevonden in secrets' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test of het valide JSON is
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GOOGLE_SERVICE_ACCOUNT_KEY is geen valide JSON',
          details: parseError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Controleer vereiste velden
    const missingFields = [];
    if (!serviceAccount.private_key) missingFields.push('private_key');
    if (!serviceAccount.client_email) missingFields.push('client_email');
    if (!serviceAccount.project_id) missingFields.push('project_id');
    if (!serviceAccount.type) missingFields.push('type');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Ontbrekende velden in service account',
          missingFields
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Controleer private key format
    const hasBeginMarker = serviceAccount.private_key.includes('BEGIN PRIVATE KEY');
    const hasEndMarker = serviceAccount.private_key.includes('END PRIVATE KEY');
    const hasNewlines = serviceAccount.private_key.includes('\\n') || serviceAccount.private_key.includes('\n');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Service account configuratie is correct',
        details: {
          client_email: serviceAccount.client_email,
          project_id: serviceAccount.project_id,
          type: serviceAccount.type,
          private_key_format: {
            has_begin_marker: hasBeginMarker,
            has_end_marker: hasEndMarker,
            has_newlines: hasNewlines,
            length: serviceAccount.private_key.length
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
