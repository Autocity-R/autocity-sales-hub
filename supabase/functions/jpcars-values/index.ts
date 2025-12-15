import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValuesRequest {
  type: 'make' | 'model' | 'fuel' | 'gear' | 'hp' | 'body' | 'build' | 'options';
  make?: string;
  model?: string;
  fuel?: string;
  gear?: string;
  body?: string;
  build?: number;
}

// Map fuel types to JP Cars format
function mapFuelToJPCars(fuel: string): string {
  const fuelLower = fuel.toLowerCase();
  if (fuelLower.includes('benzine')) return 'PETROL';
  if (fuelLower.includes('diesel')) return 'DIESEL';
  if (fuelLower.includes('elektr')) return 'ELECTRIC';
  if (fuelLower.includes('hybride') && fuelLower.includes('plug')) return 'PLUG_IN_HYBRID';
  if (fuelLower.includes('hybride')) return 'HYBRID';
  if (fuelLower.includes('lpg')) return 'LPG';
  if (fuelLower.includes('waterstof') || fuelLower.includes('hydrogen')) return 'HYDROGEN';
  return 'PETROL';
}

// Map gear types to JP Cars format
function mapGearToJPCars(gear: string): string {
  const gearLower = gear.toLowerCase();
  if (gearLower.includes('automaat') || gearLower.includes('automatic')) return 'AUTOMATIC_GEAR';
  if (gearLower.includes('hand') || gearLower.includes('manual')) return 'MANUAL_GEAR';
  return 'AUTOMATIC_GEAR';
}

// Map body types to JP Cars format
function mapBodyToJPCars(body: string): string {
  const bodyMapping: Record<string, string> = {
    'SUV': 'SUV',
    'Sedan': 'SEDAN',
    'Hatchback': 'SMALL_CAR',
    'Station': 'STATION_WAGON',
    'Stationwagen': 'STATION_WAGON',
    'MPV': 'MPV',
    'Cabrio': 'CONVERTIBLE',
    'Cabriolet': 'CONVERTIBLE',
    'Coupé': 'COUPE',
    'Coupe': 'COUPE',
    'Terreinwagen': 'SUV',
    'Bus': 'BUS',
    'Bestelwagen': 'VAN',
  };
  return bodyMapping[body] || body.toUpperCase();
}

// Fallback HP options when API fails - UITGEBREID met 350 en meer waarden
const FALLBACK_HP_OPTIONS = [
  '75', '90', '100', '110', '120', '130', '140', '150', '163', '177', 
  '190', '197', '204', '220', '231', '235', '245', '250', '252', '265', 
  '272', '286', '300', '310', '320', '333', '340', '350', '360', '380', 
  '390', '400', '408', '420', '450', '476', '500', '525', '550', '600'
];

// Fallback options when API fails
const FALLBACK_OPTIONS = [
  'panorama roof', 'air suspension', 'leather', 'heated seats', 'navigation',
  'adaptive cruise', '360 camera', 'head up display', 'premium audio',
  'sunroof', 'tow bar', '4x4', '7 seater', 'LED', 'keyless'
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ValuesRequest = await req.json();
    const { type, make, model, fuel, gear, body, build } = requestData;

    console.log('📋 JP Cars Values request:', { type, make, model, fuel, gear, body, build });

    const apiToken = Deno.env.get('JPCARS_API_TOKEN');
    if (!apiToken) {
      console.error('❌ JPCARS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'JP Cars API token not configured',
          values: type === 'hp' ? FALLBACK_HP_OPTIONS : FALLBACK_OPTIONS,
          source: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build API URL
    const apiUrl = new URL('https://api.nl.jp.cars/api/values');
    apiUrl.searchParams.append('type', type === 'options' ? 'options' : type);
    
    if (make) apiUrl.searchParams.append('make', make);
    if (model) apiUrl.searchParams.append('model', model);
    if (fuel) apiUrl.searchParams.append('fuel', mapFuelToJPCars(fuel));
    if (gear) apiUrl.searchParams.append('gear', mapGearToJPCars(gear));
    if (body) apiUrl.searchParams.append('body', body);
    if (build) apiUrl.searchParams.append('build', build.toString());

    console.log('🔗 Calling JP Cars API:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ JP Cars API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      
      // Return fallback values
      const fallbackValues = type === 'hp' ? FALLBACK_HP_OPTIONS : 
                            type === 'options' ? FALLBACK_OPTIONS : [];
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          type,
          values: fallbackValues,
          count: fallbackValues.length,
          source: 'fallback',
          apiError: `${response.status}: ${response.statusText}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('✅ JP Cars API response:', JSON.stringify(data).substring(0, 500));

    // JP Cars API returns { results: [...] }
    const results = data.results || data.values || [];
    
    // Convert to string array and filter empty values
    const values = results
      .map((v: unknown) => String(v))
      .filter((v: string) => v && v.trim() !== '');

    console.log(`✅ Returning ${values.length} ${type} values from JP Cars API`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type,
        values,
        count: values.length,
        source: 'api'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ JP Cars Values function error:', error);
    
    // Return fallback on any error
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        values: FALLBACK_HP_OPTIONS,
        source: 'fallback'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
