import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValuesRequest {
  type: 'make' | 'model' | 'fuel' | 'gear' | 'hp' | 'body' | 'build';
  make?: string;
  model?: string;
  fuel?: string;
  gear?: string;
  body?: string;
  build?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ValuesRequest = await req.json();
    const { type, make, model, fuel, gear, body, build } = requestData;

    console.log('📋 JP Cars Values request:', { type, make, model, fuel, gear, body, build });

    const JPCARS_API_TOKEN = Deno.env.get('JPCARS_API_TOKEN');
    if (!JPCARS_API_TOKEN) {
      console.error('❌ JPCARS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'JP Cars API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append('type', type);
    
    if (make) params.append('make', make);
    if (model) params.append('model', model);
    if (fuel) params.append('fuel', fuel);
    if (gear) params.append('gear', gear);
    if (body) params.append('body', body);
    if (build) params.append('build', build.toString());

    const apiUrl = `https://api.jpcars.nl/api/values?${params.toString()}`;
    console.log('🌐 Calling JP Cars Values API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JPCARS_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('📥 JP Cars Values response status:', response.status);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('❌ Failed to parse JP Cars response:', responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from JP Cars API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('❌ JP Cars Values API error:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData?.error || `JP Cars API error: ${response.status}`,
          values: [] 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JP Cars returns { values: [...] } or just an array
    const values = Array.isArray(responseData) 
      ? responseData 
      : (responseData.values || responseData.data || []);

    console.log(`✅ JP Cars Values returned ${values.length} items for type "${type}"`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type,
        values,
        count: values.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ JP Cars Values function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        values: [] 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
