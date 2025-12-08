import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleData {
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
  keywords?: string[];
}

interface PortalListing {
  id: string;
  portal: 'gaspedaal' | 'autoscout24' | 'autotrack' | 'marktplaats';
  url: string;
  price: number;
  mileage: number;
  buildYear: number;
  title: string;
  options: string[];
  color?: string;
  matchScore?: number;
  isPrimaryComparable?: boolean;
  isLogicalDeviation?: boolean;
  deviationReason?: string;
}

interface PortalAnalysis {
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
  listingCount: number;
  primaryComparableCount: number;
  appliedFilters: {
    brand: string;
    model: string;
    buildYearFrom: number;
    buildYearTo: number;
    mileageMax: number;
    fuelType: string;
    transmission: string;
    bodyType?: string;
    keywords: string[];
    requiredOptions: string[];
  };
  listings: PortalListing[];
  logicalDeviations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleData } = await req.json() as { vehicleData: VehicleData };
    
    console.log('🔍 Portal search request for:', vehicleData.brand, vehicleData.model);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build search filters
    const buildYearFrom = vehicleData.buildYear - 1;
    const buildYearTo = vehicleData.buildYear + 1;
    const mileageMax = Math.ceil((vehicleData.mileage + 20000) / 10000) * 10000;

    const systemPrompt = `Je bent een expert in de Nederlandse automarkt. Je taak is om realistische marktprijzen te schatten voor gebruikte auto's op Nederlandse portalen (Gaspedaal.nl, AutoScout24.nl, Marktplaats.nl, Autotrack.nl).

Gebaseerd op je uitgebreide kennis van de Nederlandse automarkt, genereer je realistische listings die je zou verwachten te vinden op deze portalen voor het gegeven voertuig.

BELANGRIJK:
- Baseer prijzen op realistische Nederlandse marktwaarden
- Houd rekening met kilometerstand, bouwjaar, uitvoering en opties
- Geef variatie in prijzen (sommige hoger, sommige lager)
- Markeer logische uitschieters en geef uitleg waarom
- Primary comparables zijn auto's die zeer vergelijkbaar zijn qua specs

Retourneer ALLEEN een geldig JSON object, geen andere tekst.`;

    const userPrompt = `Genereer een realistische marktanalyse voor dit voertuig:

Merk: ${vehicleData.brand}
Model: ${vehicleData.model}
Bouwjaar: ${vehicleData.buildYear}
Kilometerstand: ${vehicleData.mileage.toLocaleString('nl-NL')} km
Brandstof: ${vehicleData.fuelType}
Transmissie: ${vehicleData.transmission}
Carrosserie: ${vehicleData.bodyType}
Vermogen: ${vehicleData.power} pk
Uitvoering: ${vehicleData.trim}
Kleur: ${vehicleData.color}
Opties: ${vehicleData.options?.join(', ') || 'Standaard'}
Keywords: ${vehicleData.keywords?.join(', ') || 'Geen'}

Zoekfilters:
- Bouwjaar: ${buildYearFrom} - ${buildYearTo}
- Max km: ${mileageMax.toLocaleString('nl-NL')}

Genereer 6-10 realistische listings verdeeld over de 4 portalen (gaspedaal, autoscout24, marktplaats, autotrack).

Retourneer een JSON object met deze exacte structuur:
{
  "lowestPrice": number,
  "medianPrice": number,
  "highestPrice": number,
  "listingCount": number,
  "primaryComparableCount": number,
  "listings": [
    {
      "id": "string",
      "portal": "gaspedaal" | "autoscout24" | "marktplaats" | "autotrack",
      "url": "string (fictieve URL)",
      "price": number,
      "mileage": number,
      "buildYear": number,
      "title": "string (titel zoals op portal)",
      "options": ["string"],
      "color": "string",
      "matchScore": number (0-1, hoe vergelijkbaar),
      "isPrimaryComparable": boolean,
      "isLogicalDeviation": boolean,
      "deviationReason": "string of null"
    }
  ],
  "logicalDeviations": ["string (uitleg voor elke afwijking)"]
}`;

    console.log('📡 Calling OpenAI for market analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('✅ OpenAI response received');

    const analysisData = JSON.parse(content);

    // Add the applied filters to the response
    const portalAnalysis: PortalAnalysis = {
      ...analysisData,
      appliedFilters: {
        brand: vehicleData.brand,
        model: vehicleData.model,
        buildYearFrom,
        buildYearTo,
        mileageMax,
        fuelType: vehicleData.fuelType,
        transmission: vehicleData.transmission,
        bodyType: vehicleData.bodyType,
        keywords: vehicleData.keywords || [],
        requiredOptions: vehicleData.options || [],
      }
    };

    console.log('📊 Portal analysis complete:', {
      listingCount: portalAnalysis.listingCount,
      priceRange: `€${portalAnalysis.lowestPrice} - €${portalAnalysis.highestPrice}`,
      median: `€${portalAnalysis.medianPrice}`
    });

    return new Response(JSON.stringify({
      success: true,
      data: portalAnalysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Portal search error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Portal search failed',
      data: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
