import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RDWVehicleData {
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  power: number;
  trim: string;
  color: string;
  options: string[];
  keywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licensePlate } = await req.json();
    
    if (!licensePlate) {
      return new Response(JSON.stringify({ 
        error: 'Kenteken is verplicht',
        code: 'MISSING_LICENSE_PLATE'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean license plate: remove dashes and spaces, uppercase
    const cleanedPlate = licensePlate.replace(/[-\s]/g, '').toUpperCase();
    console.log('🔍 RDW lookup for:', cleanedPlate);

    // Call RDW Open Data API - Gekentekende voertuigen
    const rdwUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${cleanedPlate}`;
    console.log('📤 Calling RDW API:', rdwUrl);

    const rdwResponse = await fetch(rdwUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!rdwResponse.ok) {
      console.error('❌ RDW API error:', rdwResponse.status);
      throw new Error(`RDW API error: ${rdwResponse.status}`);
    }

    const rdwData = await rdwResponse.json();
    console.log('📥 RDW response:', rdwData);

    if (!rdwData || rdwData.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Kenteken niet gevonden in RDW database',
        code: 'NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vehicle = rdwData[0];
    
    // Also fetch brandstof (fuel) data for more details
    const fuelUrl = `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${cleanedPlate}`;
    let fuelData: Record<string, string>[] = [];
    try {
      const fuelResponse = await fetch(fuelUrl, {
        headers: { 'Accept': 'application/json' },
      });
      if (fuelResponse.ok) {
        fuelData = await fuelResponse.json();
        console.log('📥 RDW fuel data:', fuelData);
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch fuel data:', e);
    }

    // Map RDW data to our format
    const mappedData: RDWVehicleData = {
      brand: mapBrand(vehicle.merk || ''),
      model: mapModel(vehicle.handelsbenaming || ''),
      buildYear: parseInt(vehicle.datum_eerste_toelating?.substring(0, 4) || '0', 10),
      mileage: 0, // RDW doesn't have mileage data
      fuelType: mapFuelType(fuelData[0]?.brandstof_omschrijving || vehicle.brandstof_omschrijving || ''),
      transmission: 'Onbekend', // RDW doesn't provide transmission info
      bodyType: mapBodyType(vehicle.inrichting || vehicle.voertuigsoort || ''),
      power: calculatePower(fuelData[0] || vehicle),
      trim: '', // RDW doesn't provide trim info
      color: mapColor(vehicle.eerste_kleur || ''),
      options: [],
      keywords: [],
    };

    console.log('✅ Mapped RDW data:', mappedData);

    return new Response(JSON.stringify({ 
      success: true,
      data: mappedData,
      rawRdwData: vehicle
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in rdw-lookup function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Map RDW brand names to cleaner format
function mapBrand(rdwBrand: string): string {
  const brandMap: Record<string, string> = {
    'VOLKSWAGEN': 'Volkswagen',
    'MERCEDES-BENZ': 'Mercedes-Benz',
    'BMW': 'BMW',
    'AUDI': 'Audi',
    'TOYOTA': 'Toyota',
    'FORD': 'Ford',
    'OPEL': 'Opel',
    'PEUGEOT': 'Peugeot',
    'RENAULT': 'Renault',
    'CITROËN': 'Citroën',
    'CITROEN': 'Citroën',
    'VOLVO': 'Volvo',
    'KIA': 'Kia',
    'HYUNDAI': 'Hyundai',
    'MAZDA': 'Mazda',
    'NISSAN': 'Nissan',
    'SKODA': 'Škoda',
    'ŠKODA': 'Škoda',
    'SEAT': 'Seat',
    'FIAT': 'Fiat',
    'HONDA': 'Honda',
    'SUZUKI': 'Suzuki',
    'MINI': 'Mini',
    'LAND ROVER': 'Land Rover',
    'JAGUAR': 'Jaguar',
    'PORSCHE': 'Porsche',
    'TESLA': 'Tesla',
    'LEXUS': 'Lexus',
    'ALFA ROMEO': 'Alfa Romeo',
    'JEEP': 'Jeep',
    'MITSUBISHI': 'Mitsubishi',
    'DACIA': 'Dacia',
  };
  
  const upper = rdwBrand.toUpperCase();
  return brandMap[upper] || rdwBrand.charAt(0).toUpperCase() + rdwBrand.slice(1).toLowerCase();
}

// Extract model from handelsbenaming
function mapModel(handelsbenaming: string): string {
  // Handelsbenaming often contains brand + model, try to extract model
  // Examples: "GOLF", "3 SERIE", "A4"
  return handelsbenaming.trim();
}

// Map RDW fuel type to Dutch
function mapFuelType(rdwFuel: string): string {
  const fuelMap: Record<string, string> = {
    'Benzine': 'Benzine',
    'Diesel': 'Diesel',
    'Elektriciteit': 'Elektrisch',
    'Waterstof': 'Waterstof',
    'LPG': 'LPG',
    'CNG': 'CNG',
  };
  return fuelMap[rdwFuel] || rdwFuel || 'Onbekend';
}

// Map RDW body type (inrichting) to Dutch
function mapBodyType(rdwInrichting: string): string {
  const bodyMap: Record<string, string> = {
    'sedan': 'Sedan',
    'hatchback': 'Hatchback',
    'stationwagen': 'Stationwagen',
    'suv': 'SUV',
    'terreinwagen': 'SUV',
    'cabriolet': 'Cabrio',
    'coupé': 'Coupé',
    'coupe': 'Coupé',
    'mpv': 'MPV',
    'monovolume': 'MPV',
    'pick-up': 'Pick-up',
    'gesloten opbouw': 'Bestelwagen',
    'open opbouw': 'Pick-up',
    'personenauto': 'Onbekend', // Generic, can't determine body type
  };
  
  const lower = rdwInrichting.toLowerCase();
  return bodyMap[lower] || rdwInrichting || 'Onbekend';
}

// Calculate power in HP from RDW data
function calculatePower(vehicleData: Record<string, string>): number {
  // RDW provides power in kW (nettomaximumvermogen)
  const kw = parseInt(vehicleData.nettomaximumvermogen || vehicleData.vermogen_massarijklaar || '0', 10);
  if (kw > 0) {
    // Convert kW to HP (1 kW ≈ 1.36 HP)
    return Math.round(kw * 1.36);
  }
  return 0;
}

// Map RDW color codes to Dutch
function mapColor(rdwColor: string): string {
  const colorMap: Record<string, string> = {
    'GRIJS': 'Grijs',
    'ZWART': 'Zwart',
    'WIT': 'Wit',
    'BLAUW': 'Blauw',
    'ROOD': 'Rood',
    'ZILVER': 'Zilver',
    'GROEN': 'Groen',
    'BRUIN': 'Bruin',
    'BEIGE': 'Beige',
    'ORANJE': 'Oranje',
    'GEEL': 'Geel',
    'PAARS': 'Paars',
    'ROZE': 'Roze',
    'GOUD': 'Goud',
    'DIVERSEN': 'Overig',
    'N.V.T.': 'Onbekend',
  };
  
  const upper = rdwColor.toUpperCase();
  return colorMap[upper] || rdwColor || 'Onbekend';
}
