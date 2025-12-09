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

interface JPCarsPortalUrls {
  gaspedaal?: string | null;
  autoscout24?: string | null;
  marktplaats?: string | null;
  jpCarsWindow?: string | null;
}

interface PortalListing {
  id: string;
  portal: string;
  title: string;
  price: number;
  mileage: number;
  buildYear: number;
  url: string;
  options: string[];
  color?: string;
  isPrimaryComparable: boolean;
  isLogicalDeviation: boolean;
  matchScore: number;
  deviationReason?: string;
}

// Build Gaspedaal search URL from vehicle data
function buildGaspedaalUrl(vehicleData: VehicleData): string {
  const brandSlug = vehicleData.brand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = vehicleData.model.toLowerCase().replace(/\s+/g, '-');
  
  const yearFrom = vehicleData.buildYear - 1;
  const yearTo = vehicleData.buildYear + 1;
  const mileageMax = Math.ceil(vehicleData.mileage * 1.15 / 1000) * 1000;
  
  // Build base URL
  let url = `https://www.gaspedaal.nl/${brandSlug}/${modelSlug}`;
  
  // Add filters
  const params = new URLSearchParams();
  params.set('bmin', yearFrom.toString());
  params.set('bmax', yearTo.toString());
  params.set('kmmax', mileageMax.toString());
  params.set('sort', 'prijs-oplopend');
  
  // Add fuel type filter
  if (vehicleData.fuelType) {
    const fuelMap: Record<string, string> = {
      'Benzine': 'benzine',
      'Diesel': 'diesel',
      'Hybride': 'hybride',
      'Elektrisch': 'elektrisch',
      'LPG': 'lpg',
    };
    if (fuelMap[vehicleData.fuelType]) {
      params.set('brandstof', fuelMap[vehicleData.fuelType]);
    }
  }
  
  return `${url}?${params.toString()}`;
}

// Calculate max mileage with 15% buffer
function calculateMaxMileage(mileage: number): number {
  return Math.ceil(mileage * 1.15 / 1000) * 1000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleData, jpCarsUrls } = await req.json() as { 
      vehicleData: VehicleData; 
      jpCarsUrls?: JPCarsPortalUrls;
    };
    
    console.log('🔍 Portal search for:', vehicleData.brand, vehicleData.model, vehicleData.trim);
    console.log('🔗 JP Cars URLs:', jpCarsUrls);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build the applied filters object
    const yearFrom = vehicleData.buildYear - 1;
    const yearTo = vehicleData.buildYear + 1;
    const mileageMax = calculateMaxMileage(vehicleData.mileage);
    
    const appliedFilters = {
      brand: vehicleData.brand,
      model: vehicleData.model,
      buildYearFrom: yearFrom,
      buildYearTo: yearTo,
      mileageMax,
      fuelType: vehicleData.fuelType,
      transmission: vehicleData.transmission,
      bodyType: vehicleData.bodyType,
      keywords: vehicleData.keywords || [],
      requiredOptions: vehicleData.options || [],
    };

    // Prefer real Gaspedaal URL over JP Cars tiny URLs
    const gaspedaalUrl = buildGaspedaalUrl(vehicleData);
    const autoscoutUrl = jpCarsUrls?.autoscout24 || null;
    const marktplaatsUrl = jpCarsUrls?.marktplaats || null;
    const jpCarsWindowUrl = jpCarsUrls?.jpCarsWindow || null;

    const directSearchUrls = {
      gaspedaal: gaspedaalUrl,
      autoscout24: autoscoutUrl,
      marktplaats: marktplaatsUrl,
      jpCarsWindow: jpCarsWindowUrl,
    };

    console.log('📡 Using Gaspedaal URL:', gaspedaalUrl);

    // Build the AI prompt
    const searchPrompt = `
# OPDRACHT: Zoek vergelijkbare auto's op Gaspedaal.nl

## TE TAXEREN AUTO
${vehicleData.brand} ${vehicleData.model} ${vehicleData.trim || ''}
Bouwjaar: ${vehicleData.buildYear}
KM-stand: ${vehicleData.mileage.toLocaleString('nl-NL')} km
Brandstof: ${vehicleData.fuelType}
Vermogen: ${vehicleData.power} PK
Transmissie: ${vehicleData.transmission}

## ZOEK OP DEZE LINK
${gaspedaalUrl}

## FILTERS TOEGEPAST
- Bouwjaar: ${yearFrom} - ${yearTo}
- KM-stand: maximaal ${mileageMax.toLocaleString('nl-NL')} km
- Brandstof: ${vehicleData.fuelType}
- Gesorteerd op prijs (laag naar hoog)

## WAT JE MOET DOEN
1. Open de link hierboven
2. Bekijk de eerste 15-20 auto's (gesorteerd op prijs, laag naar hoog)
3. Beoordeel per auto:
   - Is dit een PRIMAIRE vergelijking (zelfde motor, vergelijkbare uitvoering)?
   - Zijn er LOGISCHE AFWIJKINGEN (andere motor, schade, te hoge km)?
4. Geef per auto: titel, prijs (in hele euros, bijv. 45000 niet 45.0), km-stand, bouwjaar, URL, opties, kleur indien zichtbaar, of het een primaire vergelijking is

## RETURN DIT JSON FORMAT (alleen JSON, geen tekst ervoor of erna)
{
  "listingCount": 15,
  "lowestPrice": 45000,
  "medianPrice": 52000,
  "highestPrice": 62000,
  "primaryComparableCount": 8,
  "logicalDeviations": [
    "Listing #3: Andere motorvariant (150 PK ipv 190 PK)",
    "Listing #7: Zeer hoge km-stand (120.000 km)"
  ],
  "listings": [
    {
      "id": "listing-1",
      "portal": "gaspedaal",
      "title": "BMW 3-serie 320i M Sport",
      "price": 45000,
      "mileage": 35000,
      "buildYear": 2023,
      "url": "https://www.gaspedaal.nl/...",
      "options": ["Navigatie", "LED", "ACC"],
      "color": "Zwart",
      "isPrimaryComparable": true,
      "isLogicalDeviation": false,
      "matchScore": 95
    }
  ]
}

BELANGRIJK:
- Prijzen in HELE euros (45000, niet 45.0 of 45,000)
- Geef ECHTE listings met WERKENDE URLs
- Sorteer op prijs (laagste eerst)
- Maximaal 15-20 listings
- Markeer PRIMAIRE vergelijkingen (isPrimaryComparable: true)
- Markeer LOGISCHE AFWIJKINGEN (isLogicalDeviation: true) met reden
- matchScore: 0-100 gebaseerd op hoe goed de auto matcht
`;

    console.log('📡 Calling OpenAI with portal search prompt...');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: searchPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('📥 OpenAI response received');

    // Parse output text
    let outputText = '';
    if (aiResponse.output_text) {
      outputText = aiResponse.output_text;
    } else if (aiResponse.output && Array.isArray(aiResponse.output)) {
      for (const item of aiResponse.output) {
        if (item.type === 'message' && item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' || contentItem.type === 'text') {
              outputText = contentItem.text || contentItem.output_text || '';
              break;
            }
          }
        }
      }
    }

    if (!outputText) {
      console.error('❌ No output text in response');
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          appliedFilters,
          listings: [],
          logicalDeviations: ['Geen response van AI - probeer handmatig via de links'],
          directSearchUrls,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📝 Output length:', outputText.length);
    console.log('📝 First 500 chars:', outputText.substring(0, 500));

    // Extract JSON from response
    let jsonContent = outputText;
    const jsonMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else {
      const jsonStartIndex = outputText.indexOf('{');
      const jsonEndIndex = outputText.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonContent = outputText.substring(jsonStartIndex, jsonEndIndex + 1);
      }
    }

    // Parse JSON
    let analysisData;
    try {
      const cleanedJson = jsonContent
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x1F\x7F]/g, ' ');
      analysisData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.log('📝 JSON content:', jsonContent.substring(0, 500));
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          appliedFilters,
          listings: [],
          logicalDeviations: ['JSON parsing fout - check handmatig via links'],
          directSearchUrls,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process and validate listings
    const rawListings = analysisData.listings || [];
    const listings: PortalListing[] = rawListings
      .filter((l: any) => l.url && l.price && typeof l.price === 'number')
      .map((l: any, index: number) => ({
        id: l.id || `listing-${index + 1}`,
        portal: l.portal || 'gaspedaal',
        title: l.title || '',
        price: normalizePrice(l.price),
        mileage: l.mileage || 0,
        buildYear: l.buildYear || vehicleData.buildYear,
        url: l.url,
        options: l.options || [],
        color: l.color || undefined,
        isPrimaryComparable: l.isPrimaryComparable ?? true,
        isLogicalDeviation: l.isLogicalDeviation ?? false,
        matchScore: l.matchScore ?? 80,
        deviationReason: l.deviationReason || undefined,
      }));

    // Calculate statistics
    const prices = listings.map((l) => l.price).sort((a, b) => a - b);
    const lowestPrice = prices.length > 0 ? prices[0] : 0;
    const highestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
    const primaryComparableCount = listings.filter(l => l.isPrimaryComparable).length;
    const logicalDeviations = analysisData.logicalDeviations || [];

    console.log('✅ Portal search complete:', {
      listingCount: listings.length,
      primaryComparableCount,
      lowestPrice,
      medianPrice,
      highestPrice,
      deviationsFound: logicalDeviations.length
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        lowestPrice,
        medianPrice,
        highestPrice,
        listingCount: listings.length,
        primaryComparableCount,
        appliedFilters,
        listings,
        logicalDeviations,
        directSearchUrls,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Portal search error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Normalize price - ensure it's a valid whole number in euros
function normalizePrice(price: number): number {
  // If price looks like it's in thousands (e.g., 45.5 meaning 45500)
  if (price < 500 && price > 0) {
    return Math.round(price * 1000);
  }
  // If price looks like it has decimal for thousands separator (e.g., 45.000)
  if (price > 100 && price < 200) {
    return Math.round(price * 1000);
  }
  // Normal price in whole euros
  return Math.round(price);
}
