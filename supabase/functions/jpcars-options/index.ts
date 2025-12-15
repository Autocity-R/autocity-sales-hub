import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptionsRequest {
  make: string;
  model: string;
  fuel?: string;
  gear?: string;
  hp?: number;
  body?: string;
  build?: number;
}

interface JPCarsOption {
  id: string;
  label: string;
  category?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: OptionsRequest = await req.json();
    const { make, model, fuel, gear, hp, body, build } = requestData;

    console.log('📋 JP Cars Options request:', { make, model, fuel, gear, hp, body, build });

    if (!make || !model) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Make and model are required',
          options: [] 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const JPCARS_API_TOKEN = Deno.env.get('JPCARS_API_TOKEN');
    if (!JPCARS_API_TOKEN) {
      console.error('❌ JPCARS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'JP Cars API token not configured', options: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query parameters for the JP Cars catalog/values API with type=option
    const params = new URLSearchParams();
    params.append('type', 'option');
    params.append('make', make);
    params.append('model', model);
    
    if (fuel) params.append('fuel', fuel);
    if (gear) params.append('gear', gear);
    if (hp) params.append('hp', hp.toString());
    if (body) params.append('body', body);
    if (build) params.append('build', build.toString());

    const apiUrl = `https://api.nl.jp.cars/api/catalog/values?${params.toString()}`;
    console.log('🌐 Calling JP Cars Options API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JPCARS_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('📥 JP Cars Options response status:', response.status);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('❌ Failed to parse JP Cars response:', responseText.substring(0, 500));
      
      // Return static fallback options
      const fallbackOptions = getStaticOptions(make, model);
      return new Response(
        JSON.stringify({ 
          success: true, 
          options: fallbackOptions,
          source: 'fallback',
          count: fallbackOptions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('❌ JP Cars Options API error:', responseData);
      
      // Return static fallback options on error
      const fallbackOptions = getStaticOptions(make, model);
      return new Response(
        JSON.stringify({ 
          success: true, 
          options: fallbackOptions,
          source: 'fallback',
          error: responseData?.error || `JP Cars API error: ${response.status}`,
          count: fallbackOptions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JP Cars returns { values: [...] } or just an array
    let rawOptions = Array.isArray(responseData) 
      ? responseData 
      : (responseData.values || responseData.data || responseData.options || []);

    // Transform the options into our format
    const options: JPCarsOption[] = rawOptions.map((opt: string | { id?: string; name?: string; label?: string; value?: string }) => {
      if (typeof opt === 'string') {
        return { id: opt, label: opt };
      }
      return {
        id: opt.id || opt.value || opt.name || String(opt),
        label: opt.label || opt.name || opt.value || opt.id || String(opt),
      };
    });

    // If no options from API, use fallback
    if (options.length === 0) {
      const fallbackOptions = getStaticOptions(make, model);
      console.log(`⚠️ No options from API, using ${fallbackOptions.length} fallback options`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          options: fallbackOptions,
          source: 'fallback',
          count: fallbackOptions.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ JP Cars Options returned ${options.length} options`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        options,
        source: 'jpcars',
        count: options.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ JP Cars Options function error:', error);
    
    // Return static options on any error
    const fallbackOptions = getStaticOptions('', '');
    return new Response(
      JSON.stringify({ 
        success: true, 
        options: fallbackOptions,
        source: 'fallback',
        error: error.message || 'Internal server error',
        count: fallbackOptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Static fallback options based on common vehicle features
function getStaticOptions(make: string, model: string): JPCarsOption[] {
  const baseOptions: JPCarsOption[] = [
    // Premium/Performance packages
    { id: 'amg_line', label: 'AMG Line', category: 'package' },
    { id: 'm_sport', label: 'M Sport', category: 'package' },
    { id: 's_line', label: 'S-Line', category: 'package' },
    { id: 'r_line', label: 'R-Line', category: 'package' },
    { id: 'gt_line', label: 'GT-Line', category: 'package' },
    { id: 'f_sport', label: 'F Sport', category: 'package' },
    { id: 'inscription', label: 'Inscription', category: 'package' },
    { id: 'r_design', label: 'R-Design', category: 'package' },
    
    // Roof options
    { id: 'panoramadak', label: 'Panoramadak', category: 'roof' },
    { id: 'schuifdak', label: 'Schuifdak', category: 'roof' },
    { id: 'glazen_dak', label: 'Glazen dak', category: 'roof' },
    
    // Interior
    { id: 'leder', label: 'Leder interieur', category: 'interior' },
    { id: 'alcantara', label: 'Alcantara', category: 'interior' },
    { id: 'stoelverwarming', label: 'Stoelverwarming', category: 'interior' },
    { id: 'stoelkoeling', label: 'Stoelkoeling', category: 'interior' },
    { id: 'elektrische_stoelen', label: 'Elektrische stoelen', category: 'interior' },
    { id: 'massagestoelen', label: 'Massagestoelen', category: 'interior' },
    
    // Technology
    { id: 'navigatie', label: 'Navigatie', category: 'technology' },
    { id: 'head_up_display', label: 'Head-up Display', category: 'technology' },
    { id: 'apple_carplay', label: 'Apple CarPlay', category: 'technology' },
    { id: 'android_auto', label: 'Android Auto', category: 'technology' },
    { id: 'harman_kardon', label: 'Harman Kardon', category: 'technology' },
    { id: 'bose', label: 'Bose Sound', category: 'technology' },
    { id: 'burmester', label: 'Burmester', category: 'technology' },
    { id: 'bang_olufsen', label: 'Bang & Olufsen', category: 'technology' },
    { id: '360_camera', label: '360° Camera', category: 'technology' },
    
    // Lighting
    { id: 'led_koplampen', label: 'LED koplampen', category: 'lighting' },
    { id: 'matrix_led', label: 'Matrix LED', category: 'lighting' },
    { id: 'laser_light', label: 'Laser Light', category: 'lighting' },
    { id: 'ambient_light', label: 'Ambient verlichting', category: 'lighting' },
    
    // Safety & Assist
    { id: 'adaptive_cruise', label: 'Adaptive Cruise Control', category: 'safety' },
    { id: 'lane_assist', label: 'Lane Assist', category: 'safety' },
    { id: 'blind_spot', label: 'Dodehoek detectie', category: 'safety' },
    { id: 'park_assist', label: 'Park Assist', category: 'safety' },
    
    // Wheels & exterior
    { id: 'lichtmetalen_velgen', label: 'Lichtmetalen velgen', category: 'exterior' },
    { id: '19_inch', label: '19 inch velgen', category: 'exterior' },
    { id: '20_inch', label: '20 inch velgen', category: 'exterior' },
    { id: '21_inch', label: '21 inch velgen', category: 'exterior' },
    { id: 'metallic_lak', label: 'Metallic lak', category: 'exterior' },
    
    // Towing
    { id: 'trekhaak', label: 'Trekhaak', category: 'other' },
    { id: 'elektrische_trekhaak', label: 'Elektrische trekhaak', category: 'other' },
  ];

  // Filter brand-specific options
  const makeLower = make.toLowerCase();
  
  return baseOptions.filter(opt => {
    // Brand-specific filtering
    if (opt.id === 'amg_line' && makeLower !== 'mercedes-benz' && makeLower !== 'mercedes') return false;
    if (opt.id === 'm_sport' && makeLower !== 'bmw') return false;
    if (opt.id === 's_line' && makeLower !== 'audi') return false;
    if (opt.id === 'r_line' && makeLower !== 'volkswagen') return false;
    if (opt.id === 'gt_line' && !['peugeot', 'kia'].includes(makeLower)) return false;
    if (opt.id === 'f_sport' && makeLower !== 'lexus') return false;
    if (opt.id === 'inscription' && makeLower !== 'volvo') return false;
    if (opt.id === 'r_design' && makeLower !== 'volvo') return false;
    if (opt.id === 'burmester' && !['mercedes-benz', 'mercedes', 'porsche'].includes(makeLower)) return false;
    if (opt.id === 'bang_olufsen' && !['audi', 'bmw', 'ford'].includes(makeLower)) return false;
    if (opt.id === 'harman_kardon' && !['bmw', 'mercedes-benz', 'mercedes', 'volvo', 'subaru'].includes(makeLower)) return false;
    if (opt.id === 'bose' && !['audi', 'mazda', 'nissan', 'porsche', 'cadillac', 'chevrolet'].includes(makeLower)) return false;
    
    return true;
  });
}
