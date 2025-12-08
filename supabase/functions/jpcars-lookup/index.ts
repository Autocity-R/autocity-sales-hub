import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JPCarsRequest {
  licensePlate?: string;
  mileage: number;
  options?: string;
  // Vehicle data fields
  make?: string;
  model?: string;
  body?: string;
  fuel?: string;
  gear?: string;
  build?: number;
  hp?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JPCARS_API_TOKEN = Deno.env.get('JPCARS_API_TOKEN');
    if (!JPCARS_API_TOKEN) {
      console.error('JPCARS_API_TOKEN is not configured');
      throw new Error('JPCARS_API_TOKEN is not configured');
    }

    const requestBody: JPCarsRequest = await req.json();
    console.log('🚗 JP Cars lookup request:', {
      licensePlate: requestBody.licensePlate,
      mileage: requestBody.mileage,
      make: requestBody.make,
      model: requestBody.model,
      body: requestBody.body,
      fuel: requestBody.fuel,
      gear: requestBody.gear,
      build: requestBody.build,
      hp: requestBody.hp
    });

    // Build the JP Cars API request body
    const jpCarsRequestBody: Record<string, unknown> = {
      mileage: requestBody.mileage || 0,
    };

    // Use license plate if available
    if (requestBody.licensePlate) {
      jpCarsRequestBody.license_plate = requestBody.licensePlate.replace(/[-\s]/g, '').toUpperCase();
    }
    
    // Always add vehicle data for better matching (even with license plate)
    if (requestBody.make) {
      jpCarsRequestBody.make = requestBody.make.toUpperCase();
    }
    if (requestBody.model) {
      jpCarsRequestBody.model = requestBody.model.toUpperCase();
    }
    if (requestBody.body) {
      jpCarsRequestBody.body = mapBodyType(requestBody.body);
    }
    if (requestBody.fuel) {
      jpCarsRequestBody.fuel = mapFuelType(requestBody.fuel);
    }
    if (requestBody.gear) {
      jpCarsRequestBody.gear = mapGearType(requestBody.gear);
    }
    if (requestBody.build) {
      jpCarsRequestBody.build = requestBody.build;
    }
    // HP is required by JP Cars, use 0 as fallback if not provided
    jpCarsRequestBody.hp = requestBody.hp || 0;

    // Add options if provided
    if (requestBody.options) {
      jpCarsRequestBody.options = requestBody.options;
    }

    console.log('📤 Calling JP Cars API with:', jpCarsRequestBody);

    const response = await fetch('https://api.nl.jp.cars/api/valuate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JPCARS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jpCarsRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ JP Cars API error:', response.status, errorText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'JP Cars authenticatie mislukt - controleer je API token',
          code: 'AUTH_ERROR'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 422) {
        return new Response(JSON.stringify({ 
          error: 'Ongeldige voertuiggegevens voor JP Cars',
          code: 'VALIDATION_ERROR',
          details: errorText
        }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`JP Cars API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ JP Cars response received:', {
      value: data.value,
      apr: data.apr,
      windowSize: data.window_size
    });

    // Check for valuation errors
    if (data.error) {
      console.warn('⚠️ JP Cars valuation warning:', data.error, data.error_message);
      return new Response(JSON.stringify({ 
        success: false,
        error: data.error_message || 'Voertuig kon niet gewaardeerd worden',
        code: data.error
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map JP Cars response to our internal format
    const jpCarsData = {
      baseValue: data.topdown_value || data.value || 0,
      optionValue: 0,
      totalValue: data.value || 0,
      range: {
        min: calculateRangeMin(data),
        max: calculateRangeMax(data)
      },
      confidence: calculateConfidence(data),
      apr: data.apr || 0,
      etr: calculateETR(data),
      courantheid: determineCourantheid(data.apr),
      rawData: {
        windowSize: data.window_size,
        mileageMean: data.mileage_mean,
        priceSensitivity: data.price_sensitivity,
        statTurnoverExt: data.stat_turnover_ext,
        statTurnoverInt: data.stat_turnover_int,
        percents: data.percents,
        windowUrl: data.window_url,
        topdownBreakdown: data.topdown_value_breakdown
      }
    };

    return new Response(JSON.stringify({ 
      success: true,
      data: jpCarsData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in jpcars-lookup function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Body type mapping: Dutch -> JP Cars format
function mapBodyType(body: string): string {
  const bodyMap: Record<string, string> = {
    'Hatchback': 'SmallCar',
    'Sedan': 'Sedan',
    'Stationwagen': 'StationWagon',
    'Station': 'StationWagon',
    'SUV': 'SUV',
    'Terreinwagen': 'SUV',
    'Coupé': 'Coupe',
    'Coupe': 'Coupe',
    'Cabrio': 'Cabrio',
    'Cabriolet': 'Cabrio',
    'MPV': 'MPV',
    'MVP': 'MPV',
    'Pick-up': 'Pickup',
    'Pickup': 'Pickup',
    'Bus': 'Bus',
    'Bestelwagen': 'Van',
    'Van': 'Van',
  };
  return bodyMap[body] || body;
}

// Fuel type mapping: Dutch -> JP Cars format
function mapFuelType(fuel: string): string {
  const fuelMap: Record<string, string> = {
    'Benzine': 'PETROL',
    'Diesel': 'DIESEL',
    'Elektrisch': 'ELECTRIC',
    'Hybride': 'HYBRID',
    'Plug-in Hybride': 'PLUGIN_HYBRID',
    'Plug-in hybride': 'PLUGIN_HYBRID',
    'LPG': 'LPG',
    'CNG': 'CNG',
    'Waterstof': 'HYDROGEN',
  };
  return fuelMap[fuel] || fuel.toUpperCase();
}

// Gear type mapping: Dutch -> JP Cars format
function mapGearType(gear: string): string {
  const gearMap: Record<string, string> = {
    'Automaat': 'AUTOMATIC_GEAR',
    'Automatisch': 'AUTOMATIC_GEAR',
    'Handgeschakeld': 'MANUAL_GEAR',
    'Handmatig': 'MANUAL_GEAR',
    'CVT': 'AUTOMATIC_GEAR',
  };
  return gearMap[gear] || gear.toUpperCase();
}

function calculateRangeMin(data: Record<string, unknown>): number {
  const percents = data.percents as Array<{ percent: number; target_value: number }> | undefined;
  if (percents && percents.length > 0) {
    const p10 = percents.find(p => p.percent === 10);
    if (p10) return p10.target_value;
    return percents[0]?.target_value || (data.value as number) * 0.85;
  }
  return (data.value as number) * 0.85;
}

function calculateRangeMax(data: Record<string, unknown>): number {
  const percents = data.percents as Array<{ percent: number; target_value: number }> | undefined;
  if (percents && percents.length > 0) {
    const p90 = percents.find(p => p.percent === 90);
    if (p90) return p90.target_value;
    return percents[percents.length - 1]?.target_value || (data.value as number) * 1.15;
  }
  return (data.value as number) * 1.15;
}

function calculateConfidence(data: Record<string, unknown>): number {
  const windowSize = data.window_size as number || 0;
  if (windowSize >= 20) return 0.95;
  if (windowSize >= 10) return 0.85;
  if (windowSize >= 5) return 0.75;
  if (windowSize >= 2) return 0.60;
  return 0.40;
}

function calculateETR(data: Record<string, unknown>): number {
  const turnoverExt = data.stat_turnover_ext as number || 0;
  const turnoverInt = data.stat_turnover_int as number || 0;
  const avgTurnover = (turnoverExt + turnoverInt) / 2;
  
  if (avgTurnover > 0) {
    return Math.round(30 / avgTurnover);
  }
  
  const apr = data.apr as number || 0;
  if (apr >= 0.8) return 15;
  if (apr >= 0.6) return 22;
  if (apr >= 0.4) return 30;
  return 45;
}

function determineCourantheid(apr: number): 'hoog' | 'gemiddeld' | 'laag' {
  if (apr >= 0.7) return 'hoog';
  if (apr >= 0.4) return 'gemiddeld';
  return 'laag';
}
