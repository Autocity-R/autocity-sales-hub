import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptionsRequest {
  make: string;
  model: string;
  fuel?: string;
}

interface JPCarsOption {
  id: string;
  label: string;
  jpcarsKey: string;
  category: string;
}

// =============================================================================
// COMPLETE JP CARS OPTIONS DATABASE - Brand Specific
// Based on actual JP Cars website options per manufacturer
// =============================================================================

const BRAND_OPTIONS: Record<string, JPCarsOption[]> = {
  // MERCEDES-BENZ
  'mercedes-benz': [
    { id: 'amg_pakket', label: 'AMG Pakket', jpcarsKey: 'AMG', category: 'package' },
    { id: 'burmester', label: 'Burmester', jpcarsKey: 'burmester', category: 'audio' },
    { id: 'widescreen', label: 'Widescreen Cockpit', jpcarsKey: 'widescreen', category: 'technology' },
    { id: 'multibeam_led', label: 'Multibeam LED', jpcarsKey: 'multibeam', category: 'lighting' },
    { id: 'airmatic', label: 'Airmatic', jpcarsKey: 'airmatic', category: 'suspension' },
    { id: 'distronic', label: 'Distronic Plus', jpcarsKey: 'distronic', category: 'safety' },
    { id: 'night_pakket', label: 'Night Pakket', jpcarsKey: 'night package', category: 'package' },
  ],
  'mercedes': [
    { id: 'amg_pakket', label: 'AMG Pakket', jpcarsKey: 'AMG', category: 'package' },
    { id: 'burmester', label: 'Burmester', jpcarsKey: 'burmester', category: 'audio' },
    { id: 'widescreen', label: 'Widescreen Cockpit', jpcarsKey: 'widescreen', category: 'technology' },
    { id: 'multibeam_led', label: 'Multibeam LED', jpcarsKey: 'multibeam', category: 'lighting' },
    { id: 'airmatic', label: 'Airmatic', jpcarsKey: 'airmatic', category: 'suspension' },
    { id: 'distronic', label: 'Distronic Plus', jpcarsKey: 'distronic', category: 'safety' },
    { id: 'night_pakket', label: 'Night Pakket', jpcarsKey: 'night package', category: 'package' },
  ],

  // BMW
  'bmw': [
    { id: 'm_sport', label: 'M Sport Pakket', jpcarsKey: 'M sport', category: 'package' },
    { id: 'm_performance', label: 'M Performance', jpcarsKey: 'M performance', category: 'package' },
    { id: 'harman_kardon', label: 'Harman Kardon', jpcarsKey: 'harman kardon', category: 'audio' },
    { id: 'laser_light', label: 'Laser Light', jpcarsKey: 'laser', category: 'lighting' },
    { id: 'live_cockpit', label: 'Live Cockpit Professional', jpcarsKey: 'live cockpit', category: 'technology' },
    { id: 'driving_assistant', label: 'Driving Assistant Professional', jpcarsKey: 'driving assistant', category: 'safety' },
    { id: 'shadowline', label: 'Shadowline', jpcarsKey: 'shadowline', category: 'package' },
  ],

  // AUDI
  'audi': [
    { id: 's_line', label: 'S-Line', jpcarsKey: 'S-Line', category: 'package' },
    { id: 'bang_olufsen', label: 'Bang & Olufsen', jpcarsKey: 'bang olufsen', category: 'audio' },
    { id: 'virtual_cockpit', label: 'Virtual Cockpit', jpcarsKey: 'virtual cockpit', category: 'technology' },
    { id: 'matrix_led', label: 'Matrix LED', jpcarsKey: 'matrix', category: 'lighting' },
    { id: 'black_edition', label: 'Black Edition', jpcarsKey: 'black edition', category: 'package' },
    { id: 'tour_pakket', label: 'Tour Pakket', jpcarsKey: 'tour package', category: 'package' },
    { id: 'comfort_pakket', label: 'Comfort Pakket', jpcarsKey: 'comfort package', category: 'package' },
  ],

  // VOLKSWAGEN
  'volkswagen': [
    { id: 'r_line', label: 'R-Line', jpcarsKey: 'R-Line', category: 'package' },
    { id: 'gti_pakket', label: 'GTI Pakket', jpcarsKey: 'GTI', category: 'package' },
    { id: 'gte_pakket', label: 'GTE Pakket', jpcarsKey: 'GTE', category: 'package' },
    { id: 'dynaudio', label: 'Dynaudio', jpcarsKey: 'dynaudio', category: 'audio' },
    { id: 'digital_cockpit', label: 'Digital Cockpit Pro', jpcarsKey: 'digital cockpit', category: 'technology' },
    { id: 'iq_light', label: 'IQ.Light', jpcarsKey: 'IQ light', category: 'lighting' },
  ],

  // FORD
  'ford': [
    { id: 'st_line', label: 'ST-Line', jpcarsKey: 'ST-Line', category: 'package' },
    { id: 'titanium', label: 'Titanium', jpcarsKey: 'titanium', category: 'package' },
    { id: 'vignale', label: 'Vignale', jpcarsKey: 'vignale', category: 'package' },
    { id: 'winterpakket', label: 'Winterpakket', jpcarsKey: 'winter pack', category: 'package' },
    { id: 'b_o_sound', label: 'B&O Sound System', jpcarsKey: 'bang olufsen', category: 'audio' },
    { id: 'active_park_assist', label: 'Active Park Assist', jpcarsKey: 'park assist', category: 'safety' },
  ],

  // VOLVO
  'volvo': [
    { id: 'inscription', label: 'Inscription', jpcarsKey: 'inscription', category: 'package' },
    { id: 'r_design', label: 'R-Design', jpcarsKey: 'R-Design', category: 'package' },
    { id: 'bowers_wilkins', label: 'Bowers & Wilkins', jpcarsKey: 'bowers wilkins', category: 'audio' },
    { id: 'pilot_assist', label: 'Pilot Assist', jpcarsKey: 'pilot assist', category: 'safety' },
    { id: 'air_suspension', label: 'Luchtvering', jpcarsKey: 'air suspension', category: 'suspension' },
    { id: 'winter_pack', label: 'Winter Pack', jpcarsKey: 'winter pack', category: 'package' },
  ],

  // KIA
  'kia': [
    { id: 'gt_line', label: 'GT-Line', jpcarsKey: 'GT-Line', category: 'package' },
    { id: 'drive_wise', label: 'DriveWise', jpcarsKey: 'drivewise', category: 'safety' },
    { id: 'meridian', label: 'Meridian Sound', jpcarsKey: 'meridian', category: 'audio' },
    { id: 'jbl', label: 'JBL Sound System', jpcarsKey: 'JBL', category: 'audio' },
    { id: 'plus_pack', label: 'Plus Pack', jpcarsKey: 'plus pack', category: 'package' },
  ],

  // HYUNDAI
  'hyundai': [
    { id: 'n_line', label: 'N-Line', jpcarsKey: 'N-Line', category: 'package' },
    { id: 'n_performance', label: 'N Performance', jpcarsKey: 'N performance', category: 'package' },
    { id: 'bose', label: 'Bose Sound System', jpcarsKey: 'bose', category: 'audio' },
    { id: 'krell', label: 'Krell Premium Audio', jpcarsKey: 'krell', category: 'audio' },
    { id: 'comfort_pakket', label: 'Comfort Pakket', jpcarsKey: 'comfort package', category: 'package' },
  ],

  // TOYOTA
  'toyota': [
    { id: 'gr_sport', label: 'GR Sport', jpcarsKey: 'GR sport', category: 'package' },
    { id: 'premium_pack', label: 'Premium Pack', jpcarsKey: 'premium', category: 'package' },
    { id: 'jbl', label: 'JBL Sound System', jpcarsKey: 'JBL', category: 'audio' },
    { id: 'safety_sense', label: 'Safety Sense', jpcarsKey: 'safety sense', category: 'safety' },
  ],

  // PEUGEOT
  'peugeot': [
    { id: 'gt_line', label: 'GT-Line', jpcarsKey: 'GT-Line', category: 'package' },
    { id: 'gt', label: 'GT', jpcarsKey: 'GT', category: 'package' },
    { id: 'focal', label: 'Focal Sound System', jpcarsKey: 'focal', category: 'audio' },
    { id: 'i_cockpit', label: 'i-Cockpit', jpcarsKey: 'i-cockpit', category: 'technology' },
    { id: 'night_vision', label: 'Night Vision', jpcarsKey: 'night vision', category: 'safety' },
  ],

  // RENAULT
  'renault': [
    { id: 'rs_line', label: 'RS Line', jpcarsKey: 'RS Line', category: 'package' },
    { id: 'intens', label: 'Intens', jpcarsKey: 'intens', category: 'package' },
    { id: 'bose', label: 'Bose Sound System', jpcarsKey: 'bose', category: 'audio' },
    { id: 'techno', label: 'Techno', jpcarsKey: 'techno', category: 'package' },
  ],

  // SKODA
  'skoda': [
    { id: 'sportline', label: 'Sportline', jpcarsKey: 'sportline', category: 'package' },
    { id: 'l_k', label: 'L&K', jpcarsKey: 'L&K', category: 'package' },
    { id: 'canton', label: 'Canton Sound System', jpcarsKey: 'canton', category: 'audio' },
    { id: 'virtual_cockpit', label: 'Virtual Cockpit', jpcarsKey: 'virtual cockpit', category: 'technology' },
  ],

  // SEAT / CUPRA
  'seat': [
    { id: 'fr', label: 'FR', jpcarsKey: 'FR', category: 'package' },
    { id: 'xcellence', label: 'Xcellence', jpcarsKey: 'xcellence', category: 'package' },
    { id: 'beats', label: 'Beats Audio', jpcarsKey: 'beats', category: 'audio' },
  ],
  'cupra': [
    { id: 'vz', label: 'VZ', jpcarsKey: 'VZ', category: 'package' },
    { id: 'beats', label: 'Beats Audio', jpcarsKey: 'beats', category: 'audio' },
    { id: 'brembo', label: 'Brembo Remmen', jpcarsKey: 'brembo', category: 'performance' },
  ],

  // PORSCHE
  'porsche': [
    { id: 'sport_chrono', label: 'Sport Chrono Pakket', jpcarsKey: 'sport chrono', category: 'package' },
    { id: 'bose', label: 'Bose Surround Sound', jpcarsKey: 'bose', category: 'audio' },
    { id: 'burmester', label: 'Burmester', jpcarsKey: 'burmester', category: 'audio' },
    { id: 'pasm', label: 'PASM', jpcarsKey: 'PASM', category: 'suspension' },
    { id: 'pdls', label: 'PDLS+', jpcarsKey: 'PDLS', category: 'lighting' },
    { id: 'sport_design', label: 'Sport Design Pakket', jpcarsKey: 'sport design', category: 'package' },
  ],

  // MAZDA
  'mazda': [
    { id: 'luxury', label: 'Luxury', jpcarsKey: 'luxury', category: 'package' },
    { id: 'bose', label: 'Bose Sound System', jpcarsKey: 'bose', category: 'audio' },
    { id: 'signature', label: 'Signature', jpcarsKey: 'signature', category: 'package' },
  ],

  // NISSAN
  'nissan': [
    { id: 'tekna', label: 'Tekna', jpcarsKey: 'tekna', category: 'package' },
    { id: 'n_connecta', label: 'N-Connecta', jpcarsKey: 'n-connecta', category: 'package' },
    { id: 'bose', label: 'Bose Sound System', jpcarsKey: 'bose', category: 'audio' },
    { id: 'propilot', label: 'ProPilot', jpcarsKey: 'propilot', category: 'safety' },
  ],

  // LEXUS
  'lexus': [
    { id: 'f_sport', label: 'F Sport', jpcarsKey: 'F sport', category: 'package' },
    { id: 'mark_levinson', label: 'Mark Levinson', jpcarsKey: 'mark levinson', category: 'audio' },
    { id: 'luxury_line', label: 'Luxury Line', jpcarsKey: 'luxury', category: 'package' },
  ],

  // OPEL
  'opel': [
    { id: 'gs_line', label: 'GS Line', jpcarsKey: 'GS Line', category: 'package' },
    { id: 'ultimate', label: 'Ultimate', jpcarsKey: 'ultimate', category: 'package' },
    { id: 'intelli_lux', label: 'IntelliLux LED', jpcarsKey: 'intellilux', category: 'lighting' },
  ],

  // TESLA
  'tesla': [
    { id: 'full_self_driving', label: 'Full Self-Driving', jpcarsKey: 'FSD', category: 'technology' },
    { id: 'premium_audio', label: 'Premium Audio', jpcarsKey: 'premium audio', category: 'audio' },
    { id: 'performance', label: 'Performance', jpcarsKey: 'performance', category: 'package' },
  ],

  // LAND ROVER / RANGE ROVER
  'land rover': [
    { id: 'hse', label: 'HSE', jpcarsKey: 'HSE', category: 'package' },
    { id: 'r_dynamic', label: 'R-Dynamic', jpcarsKey: 'R-Dynamic', category: 'package' },
    { id: 'meridian', label: 'Meridian Sound', jpcarsKey: 'meridian', category: 'audio' },
    { id: 'terrain_response', label: 'Terrain Response', jpcarsKey: 'terrain response', category: 'technology' },
  ],

  // JAGUAR
  'jaguar': [
    { id: 'r_sport', label: 'R-Sport', jpcarsKey: 'R-Sport', category: 'package' },
    { id: 's_pakket', label: 'S Pakket', jpcarsKey: 'S package', category: 'package' },
    { id: 'meridian', label: 'Meridian Sound', jpcarsKey: 'meridian', category: 'audio' },
  ],

  // MINI
  'mini': [
    { id: 'john_cooper_works', label: 'John Cooper Works', jpcarsKey: 'JCW', category: 'package' },
    { id: 'chili_pack', label: 'Chili Pack', jpcarsKey: 'chili', category: 'package' },
    { id: 'harman_kardon', label: 'Harman Kardon', jpcarsKey: 'harman kardon', category: 'audio' },
  ],

  // FIAT
  'fiat': [
    { id: 'sport', label: 'Sport', jpcarsKey: 'sport', category: 'package' },
    { id: 'city_cross', label: 'City Cross', jpcarsKey: 'city cross', category: 'package' },
    { id: 'beats', label: 'Beats Audio', jpcarsKey: 'beats', category: 'audio' },
  ],

  // ALFA ROMEO
  'alfa romeo': [
    { id: 'veloce', label: 'Veloce', jpcarsKey: 'veloce', category: 'package' },
    { id: 'quadrifoglio', label: 'Quadrifoglio', jpcarsKey: 'quadrifoglio', category: 'package' },
    { id: 'harman_kardon', label: 'Harman Kardon', jpcarsKey: 'harman kardon', category: 'audio' },
  ],

  // JEEP
  'jeep': [
    { id: 'trailhawk', label: 'Trailhawk', jpcarsKey: 'trailhawk', category: 'package' },
    { id: 'overland', label: 'Overland', jpcarsKey: 'overland', category: 'package' },
    { id: 's_pakket', label: 'S Pakket', jpcarsKey: 'S package', category: 'package' },
    { id: 'alpine', label: 'Alpine Sound', jpcarsKey: 'alpine', category: 'audio' },
  ],

  // SUZUKI
  'suzuki': [
    { id: 'style', label: 'Style', jpcarsKey: 'style', category: 'package' },
    { id: 'allgrip', label: 'AllGrip', jpcarsKey: 'allgrip', category: 'technology' },
  ],

  // HONDA
  'honda': [
    { id: 'sport_line', label: 'Sport Line', jpcarsKey: 'sport line', category: 'package' },
    { id: 'advance', label: 'Advance', jpcarsKey: 'advance', category: 'package' },
    { id: 'sensing', label: 'Honda Sensing', jpcarsKey: 'sensing', category: 'safety' },
  ],

  // CITROEN
  'citroen': [
    { id: 'shine', label: 'Shine', jpcarsKey: 'shine', category: 'package' },
    { id: 'feel', label: 'Feel', jpcarsKey: 'feel', category: 'package' },
    { id: 'focal', label: 'Focal Sound System', jpcarsKey: 'focal', category: 'audio' },
  ],

  // DS
  'ds': [
    { id: 'performance_line', label: 'Performance Line', jpcarsKey: 'performance line', category: 'package' },
    { id: 'opera', label: 'Opera', jpcarsKey: 'opera', category: 'package' },
    { id: 'focal', label: 'Focal Electra', jpcarsKey: 'focal', category: 'audio' },
  ],

  // MG
  'mg': [
    { id: 'luxury', label: 'Luxury', jpcarsKey: 'luxury', category: 'package' },
    { id: 'trophy', label: 'Trophy', jpcarsKey: 'trophy', category: 'package' },
  ],

  // POLESTAR
  'polestar': [
    { id: 'performance', label: 'Performance Pack', jpcarsKey: 'performance', category: 'package' },
    { id: 'pilot', label: 'Pilot Pack', jpcarsKey: 'pilot', category: 'safety' },
    { id: 'harman_kardon', label: 'Harman Kardon', jpcarsKey: 'harman kardon', category: 'audio' },
  ],

  // DACIA
  'dacia': [
    { id: 'extreme', label: 'Extreme', jpcarsKey: 'extreme', category: 'package' },
    { id: 'journey', label: 'Journey', jpcarsKey: 'journey', category: 'package' },
  ],
};

// Generic options available for all brands
const GENERIC_OPTIONS: JPCarsOption[] = [
  // Roof
  { id: 'panorama_dak', label: 'Open/Panorama Dak', jpcarsKey: 'panorama roof', category: 'roof' },
  { id: 'schuifdak', label: 'Schuifdak', jpcarsKey: 'sunroof', category: 'roof' },

  // Interior
  { id: 'leder', label: 'Half Lederen Bekleding', jpcarsKey: 'leather', category: 'interior' },
  { id: 'stoelverwarming', label: 'Stoelverwarming', jpcarsKey: 'heated seats', category: 'interior' },
  { id: 'stoelkoeling', label: 'Stoelkoeling', jpcarsKey: 'ventilated seats', category: 'interior' },
  { id: 'climate_control', label: 'Climate Control', jpcarsKey: 'climate control', category: 'interior' },
  { id: 'elektrische_stoelen', label: 'Elektrische Stoelen', jpcarsKey: 'electric seats', category: 'interior' },

  // Technology
  { id: 'navigatie', label: 'Navigatie', jpcarsKey: 'navigation', category: 'technology' },
  { id: 'head_up_display', label: 'Head-up Display', jpcarsKey: 'head up display', category: 'technology' },
  { id: 'smartphone_integration', label: 'Smartphone Integration', jpcarsKey: 'smartphone integration', category: 'technology' },
  { id: 'keyless', label: 'Keyless Entry/Go', jpcarsKey: 'keyless', category: 'technology' },
  { id: 'wireless_charging', label: 'Draadloos Opladen', jpcarsKey: 'wireless charging', category: 'technology' },

  // Camera & Sensors
  { id: 'achteruitrijcamera', label: 'Achteruitrijcamera', jpcarsKey: 'rear camera', category: 'camera' },
  { id: '360_camera', label: '360° Camera', jpcarsKey: '360 camera', category: 'camera' },
  { id: 'pdc', label: 'PDC Voor + Achter', jpcarsKey: 'PDC', category: 'camera' },

  // Safety
  { id: 'adaptive_cruise', label: 'Adaptive Cruise Control', jpcarsKey: 'adaptive cruise', category: 'safety' },
  { id: 'lane_assist', label: 'Lane Assist', jpcarsKey: 'lane assist', category: 'safety' },
  { id: 'dodehoek', label: 'Dodehoek Detectie', jpcarsKey: 'blind spot', category: 'safety' },

  // Lighting
  { id: 'led_verlichting', label: 'LED Verlichting', jpcarsKey: 'LED', category: 'lighting' },
  { id: 'ambient_light', label: 'Ambient Verlichting', jpcarsKey: 'ambient', category: 'lighting' },

  // Config
  { id: '7_zitter', label: '7 Zitter', jpcarsKey: '7 seater', category: 'config' },
  { id: '4x4', label: '4x4 / AWD', jpcarsKey: '4x4', category: 'config' },

  // Other
  { id: 'trekhaak', label: 'Trekhaak', jpcarsKey: 'tow bar', category: 'other' },
  { id: 'lm_velgen', label: 'Lichtmetalen Velgen', jpcarsKey: 'alloy wheels', category: 'other' },
  { id: 'premium_audio', label: 'Premium Audio', jpcarsKey: 'premium audio', category: 'audio' },
];

// EV-specific options (only for electric/plug-in vehicles)
const EV_OPTIONS: JPCarsOption[] = [
  { id: 'long_range', label: 'Long Range', jpcarsKey: 'long range', category: 'ev' },
  { id: 'warmtepomp', label: 'Warmtepomp', jpcarsKey: 'heat pump', category: 'ev' },
  { id: 'v2l', label: 'Vehicle-to-Load (V2L)', jpcarsKey: 'V2L', category: 'ev' },
];

function getOptionsForVehicle(make: string, fuel: string): JPCarsOption[] {
  const makeLower = make.toLowerCase();
  const fuelLower = fuel?.toLowerCase() || '';

  // Get brand-specific options
  const brandOptions = BRAND_OPTIONS[makeLower] || [];

  // Get EV options if applicable
  const isEV = fuelLower.includes('elektr') || fuelLower.includes('electric') || fuelLower.includes('plug-in') || fuelLower.includes('hybride');
  const evOptions = isEV ? EV_OPTIONS : [];

  // Combine all options
  const allOptions = [...brandOptions, ...GENERIC_OPTIONS, ...evOptions];

  // Deduplicate by id
  const uniqueOptions = allOptions.filter((opt, index, arr) =>
    arr.findIndex(o => o.id === opt.id) === index
  );

  return uniqueOptions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: OptionsRequest = await req.json();
    const { make, model, fuel } = requestData;

    console.log('📋 JP Cars Options request:', { make, model, fuel });

    if (!make) {
      return new Response(
        JSON.stringify({ success: false, error: 'Make is required', options: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const options = getOptionsForVehicle(make, fuel || '');

    console.log(`✅ Returning ${options.length} options for ${make}`);

    return new Response(
      JSON.stringify({
        success: true,
        options,
        source: 'database',
        count: options.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ JP Cars Options function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        options: GENERIC_OPTIONS,
        source: 'fallback',
        error: error.message || 'Internal server error',
        count: GENERIC_OPTIONS.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
