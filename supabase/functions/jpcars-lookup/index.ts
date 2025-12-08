import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JPCarsRequest {
  licensePlate?: string;
  mileage: number;
  options?: string[];
  // Vehicle data fields
  make?: string;
  model?: string;
  body?: string;
  fuel?: string;
  gear?: string;
  build?: number;
  modelYear?: number;
  hp?: number;
  kw?: number;
  color?: string;
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
    console.log('🚗 JP Cars lookup request:', JSON.stringify(requestBody, null, 2));

    // Build the JP Cars API request body
    const jpCarsRequestBody: Record<string, unknown> = {
      mileage: requestBody.mileage || 0,
    };

    // Use license plate if available
    if (requestBody.licensePlate) {
      jpCarsRequestBody.license_plate = requestBody.licensePlate.replace(/[-\s]/g, '').toUpperCase();
    }
    
    // Always add vehicle data for better matching
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
    // Model year (kan afwijken van build year)
    if (requestBody.modelYear) {
      jpCarsRequestBody.model_year = requestBody.modelYear;
    }
    // HP is required by JP Cars, use 0 as fallback if not provided
    jpCarsRequestBody.hp = requestBody.hp || 0;
    // KW voor meer precisie
    if (requestBody.kw) {
      jpCarsRequestBody.kw = requestBody.kw;
    }
    // Color voor betere matching
    if (requestBody.color) {
      jpCarsRequestBody.color = mapColor(requestBody.color);
    }
    // Bepaal four_doors op basis van bodyType
    if (requestBody.body) {
      jpCarsRequestBody.four_doors = determineFourDoors(requestBody.body);
    }

    // Map options van Nederlands naar Engels voor JP Cars
    if (requestBody.options && requestBody.options.length > 0) {
      const mappedOptions = mapOptionsToJPCars(requestBody.options);
      if (mappedOptions) {
        jpCarsRequestBody.options = mappedOptions;
      }
    }

    console.log('📤 Calling JP Cars Extended API with:', JSON.stringify(jpCarsRequestBody, null, 2));

    // Gebruik de EXTENDED endpoint met extra query parameters
    const url = new URL('https://api.nl.jp.cars/api/valuate/extended');
    url.searchParams.append('enable_portal_urls', 'true');
    url.searchParams.append('enable_top_dealers', 'true');
    url.searchParams.append('percents', '10,25,50,75,90');

    const response = await fetch(url.toString(), {
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
    
    // LOG VOLLEDIGE RESPONSE VOOR DEBUGGING
    console.log('📊 VOLLEDIGE JP Cars Extended Response:', JSON.stringify(data, null, 2));

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

    // APR normalisatie
    const rawApr = data.apr || 0;
    const normalizedApr = rawApr > 1 ? rawApr / 100 : rawApr;
    
    // ETR - gebruik directe waarde van JP Cars indien beschikbaar
    const directEtr = data.etr || data.stat_turnover_days || null;
    const calculatedEtr = directEtr || calculateETR(data, rawApr);
    
    // Stock stats
    const windowSize = data.window_size || 0;
    const stockDaysAvg = data.stock_days_average || data.stat_stock_days || null;
    
    // Sold stats
    const soldCount = data.sold_count || data.stat_sold_count || 0;
    const soldDaysAvg = data.sold_days_average || data.stat_sold_days || directEtr || calculatedEtr;

    // Market discount
    const marketDiscount = data.price_sensitivity || data.market_discount || null;

    // Portal URLs
    const portalUrls = {
      gaspedaal: data.url_gaspedaal || null,
      autoscout24: data.url_autoscout24 || null,
      marktplaats: data.url_marktplaats || null,
      jpCarsWindow: data.window_url || null,
    };

    // Top dealers
    const topDealers = data.top_dealers?.map((dealer: Record<string, unknown>) => ({
      name: dealer.name || dealer.dealer_name,
      stockCount: dealer.stock_count || dealer.count || 0,
      soldCount: dealer.sold_count || 0,
      turnover: dealer.turnover || dealer.avg_turnover || 0,
    })) || [];

    // Value breakdown
    const valueBreakdown = data.topdown_value_breakdown || null;

    // ITR (Internal Turnover Rate)
    const itr = data.itr || data.stat_turnover_int || null;

    console.log('📈 Parsed JP Cars data:', {
      totalValue: data.value,
      apr: normalizedApr,
      rawApr,
      directEtr,
      calculatedEtr,
      windowSize,
      stockDaysAvg,
      soldCount,
      soldDaysAvg,
      marketDiscount,
      itr,
      hasPortalUrls: Object.values(portalUrls).some(v => v !== null),
      topDealersCount: topDealers.length
    });

    // Map JP Cars response to our internal format
    const jpCarsData = {
      baseValue: data.topdown_value || data.value || 0,
      optionValue: data.option_value || 0,
      totalValue: data.value || 0,
      range: {
        min: calculateRangeMin(data),
        max: calculateRangeMax(data)
      },
      confidence: calculateConfidence(data),
      apr: normalizedApr,
      etr: calculatedEtr,
      courantheid: determineCourantheid(normalizedApr),
      
      // Nieuwe uitgebreide data
      stockStats: {
        count: windowSize,
        avgDays: stockDaysAvg,
      },
      salesStats: {
        count: soldCount,
        avgDays: soldDaysAvg,
      },
      marketDiscount,
      itr,
      portalUrls,
      topDealers: topDealers.length > 0 ? topDealers : undefined,
      valueBreakdown,
      
      // Raw data voor debugging
      rawData: {
        windowSize: data.window_size,
        mileageMean: data.mileage_mean,
        priceSensitivity: data.price_sensitivity,
        statTurnoverExt: data.stat_turnover_ext,
        statTurnoverInt: data.stat_turnover_int,
        percents: data.percents,
        rawApr: rawApr
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

// Options mapping: Dutch -> English JP Cars keywords
function mapOptionsToJPCars(options: string[]): string {
  const optionMap: Record<string, string> = {
    // Dak opties
    'panoramadak': 'panorama roof',
    'panorama dak': 'panorama roof',
    'schuifdak': 'sunroof',
    'schuif-/kanteldak': 'sunroof',
    
    // Interieur
    'leder': 'leather',
    'lederen bekleding': 'leather',
    'leer': 'leather',
    'alcantara': 'alcantara',
    'stoelverwarming': 'heated seats',
    'verwarmde stoelen': 'heated seats',
    'stoelkoeling': 'ventilated seats',
    'geventileerde stoelen': 'ventilated seats',
    'elektrische stoelen': 'electric seats',
    'sportstoelen': 'sport seats',
    'massagestoelen': 'massage seats',
    
    // Navigatie & Audio
    'navigatie': 'navigation',
    'navigatiesysteem': 'navigation',
    'navi': 'navigation',
    'harman kardon': 'harman kardon',
    'harman': 'harman kardon',
    'bose': 'bose',
    'bang olufsen': 'bang olufsen',
    'b&o': 'bang olufsen',
    'burmester': 'burmester',
    
    // Rijhulpsystemen
    'acc': 'adaptive cruise control',
    'adaptive cruise control': 'adaptive cruise control',
    'adaptieve cruisecontrol': 'adaptive cruise control',
    'lane assist': 'lane assist',
    'rijstrookassistent': 'lane assist',
    'dodehoekassistent': 'blind spot',
    'dode hoek': 'blind spot',
    'head-up display': 'head up display',
    'head up display': 'head up display',
    'headup': 'head up display',
    'hud': 'head up display',
    
    // Camera's
    'camera 360': '360 camera',
    '360 camera': '360 camera',
    '360 graden camera': '360 camera',
    'achteruitrijcamera': 'rear camera',
    'camera achter': 'rear camera',
    'parkeer camera': 'rear camera',
    
    // Verlichting
    'led': 'LED',
    'led koplampen': 'LED',
    'matrix led': 'matrix LED',
    'matrix': 'matrix LED',
    'laser': 'laser',
    'laserlicht': 'laser',
    'adaptieve verlichting': 'adaptive lights',
    
    // Trekhaak
    'trekhaak': 'tow bar',
    'afneembare trekhaak': 'tow bar',
    'elektrische trekhaak': 'tow bar',
    
    // Keyless
    'keyless': 'keyless',
    'keyless entry': 'keyless',
    'keyless go': 'keyless',
    'comfort access': 'keyless',
    
    // Pakketten / Uitvoeringen
    'r-line': 'R-Line',
    's-line': 'S-Line',
    'amg': 'AMG',
    'amg line': 'AMG',
    'm pakket': 'M sport',
    'm sport': 'M sport',
    'gt line': 'GT Line',
    'rs line': 'RS Line',
    
    // Wielopties
    'lichtmetalen velgen': 'alloy wheels',
    'lm velgen': 'alloy wheels',
    '19 inch': '19 inch',
    '20 inch': '20 inch',
    '21 inch': '21 inch',
    
    // Overig
    'elektrische achterklep': 'electric tailgate',
    'privacy glass': 'privacy glass',
    'getint glas': 'tinted glass',
    'stuurverwarming': 'heated steering wheel',
    'verwarmde stuur': 'heated steering wheel',
    'draadloos opladen': 'wireless charging',
    'apple carplay': 'apple carplay',
    'android auto': 'android auto',
    'digitaal instrumentenpaneel': 'digital cockpit',
    'virtual cockpit': 'digital cockpit',
  };

  const mappedOptions: string[] = [];
  
  for (const option of options) {
    const lowerOption = option.toLowerCase().trim();
    
    // Check exacte match
    if (optionMap[lowerOption]) {
      mappedOptions.push(optionMap[lowerOption]);
      continue;
    }
    
    // Check partial matches
    for (const [dutch, english] of Object.entries(optionMap)) {
      if (lowerOption.includes(dutch) || dutch.includes(lowerOption)) {
        if (!mappedOptions.includes(english)) {
          mappedOptions.push(english);
        }
        break;
      }
    }
  }

  console.log('🏷️ Options mapping:', { original: options, mapped: mappedOptions });
  
  return mappedOptions.join(' ');
}

// Color mapping: Dutch -> JP Cars format
function mapColor(color: string): string {
  const colorMap: Record<string, string> = {
    'zwart': 'BLACK',
    'wit': 'WHITE',
    'grijs': 'GREY',
    'zilver': 'SILVER',
    'blauw': 'BLUE',
    'rood': 'RED',
    'groen': 'GREEN',
    'bruin': 'BROWN',
    'beige': 'BEIGE',
    'geel': 'YELLOW',
    'oranje': 'ORANGE',
    'paars': 'PURPLE',
    'goud': 'GOLD',
  };
  return colorMap[color.toLowerCase()] || color.toUpperCase();
}

// Determine four_doors based on body type
function determineFourDoors(body: string): boolean {
  const fourDoorTypes = ['Sedan', 'Stationwagen', 'Station', 'SUV', 'MPV', 'Hatchback'];
  const twoDoorTypes = ['Coupé', 'Coupe', 'Cabrio', 'Cabriolet'];
  
  if (twoDoorTypes.some(t => body.toLowerCase().includes(t.toLowerCase()))) {
    return false;
  }
  if (fourDoorTypes.some(t => body.toLowerCase().includes(t.toLowerCase()))) {
    return true;
  }
  return true; // Default to 4 doors
}

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

// ETR berekening - fallback als directe ETR niet beschikbaar is
function calculateETR(data: Record<string, unknown>, rawApr: number): number {
  // Prioriteit 1: Directe turnover statistieken van JP Cars
  const turnoverExt = data.stat_turnover_ext as number || 0;
  const turnoverInt = data.stat_turnover_int as number || 0;
  
  if (turnoverExt > 0 || turnoverInt > 0) {
    const avgTurnover = turnoverExt > 0 && turnoverInt > 0 
      ? (turnoverExt + turnoverInt) / 2 
      : (turnoverExt || turnoverInt);
    
    if (avgTurnover > 0) {
      const etr = Math.round(30 / avgTurnover);
      console.log('📊 ETR from turnover:', { turnoverExt, turnoverInt, avgTurnover, etr });
      return etr;
    }
  }
  
  // Prioriteit 2: APR-gebaseerde schatting
  const aprPercent = rawApr > 1 ? rawApr : rawApr * 100;
  
  console.log('📊 ETR from APR:', { rawApr, aprPercent });
  
  if (aprPercent >= 80) return 15;
  if (aprPercent >= 60) return 22;
  if (aprPercent >= 40) return 35;
  if (aprPercent >= 20) return 50;
  return 60;
}

// Courantheid bepalen op basis van genormaliseerde APR (0-1 schaal)
function determineCourantheid(normalizedApr: number): 'hoog' | 'gemiddeld' | 'laag' {
  if (normalizedApr >= 0.7) return 'hoog';
  if (normalizedApr >= 0.4) return 'gemiddeld';
  return 'laag';
}
