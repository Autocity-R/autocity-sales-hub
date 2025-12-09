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
    const { vehicleData, jpCarsUrls } = await req.json() as { 
      vehicleData: VehicleData; 
      jpCarsUrls?: JPCarsPortalUrls;
    };
    
    console.log('🔍 Portal search request for:', vehicleData.brand, vehicleData.model, vehicleData.trim);
    console.log('🔗 JP Cars URLs provided:', jpCarsUrls);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build search filters
    const buildYearFrom = vehicleData.buildYear;
    const buildYearTo = vehicleData.buildYear + 1;
    const buildYearFallback = vehicleData.buildYear - 1;
    const mileageMax = Math.ceil((vehicleData.mileage + 20000) / 10000) * 10000;
    
    // === GEBRUIK JP CARS URLs ALS BESCHIKBAAR ===
    let gaspedaalUrl = jpCarsUrls?.gaspedaal || null;
    let autoscoutUrl = jpCarsUrls?.autoscout24 || null;
    let marktplaatsUrl = jpCarsUrls?.marktplaats || null;
    const jpCarsWindowUrl = jpCarsUrls?.jpCarsWindow || null;
    
    // Simpele fallback als JP Cars geen URLs geeft
    if (!gaspedaalUrl && !autoscoutUrl && !marktplaatsUrl) {
      console.log('⚠️ No JP Cars URLs provided, building simple fallback URLs');
      const brandSlug = vehicleData.brand.toLowerCase().replace(/\s+/g, '-');
      const modelSlug = vehicleData.model.toLowerCase().replace(/\s+/g, '-');
      gaspedaalUrl = `https://www.gaspedaal.nl/${brandSlug}/${modelSlug}?bmin=${buildYearFrom}&kmax=${mileageMax}&srt=pr-a`;
      autoscoutUrl = `https://www.autoscout24.nl/lst/${brandSlug}/${modelSlug}?fregfrom=${buildYearFrom}&kmto=${mileageMax}&sort=price&asc=true`;
    }

    const directSearchUrls = {
      gaspedaal: gaspedaalUrl,
      autoscout24: autoscoutUrl,
      marktplaats: marktplaatsUrl,
      jpCarsWindow: jpCarsWindowUrl,
    };

    console.log('🔗 Search URLs to use:', directSearchUrls);

    // Volledige inkoper-prompt
    const searchPrompt = `
# OPDRACHT: ECHTE PORTAL SEARCH ALS AUTOCITY INKOPER

Je MOET het internet doorzoeken om ECHTE advertenties te vinden op Nederlandse auto portalen.
Dit is GEEN schattingsopdracht - je moet daadwerkelijk zoeken en echte listings teruggeven.

## TE ZOEKEN VOERTUIG

Merk: ${vehicleData.brand}
Model: ${vehicleData.model}
Uitvoering/Trim: ${vehicleData.trim || 'Standaard'}
Bouwjaar: ${vehicleData.buildYear}
Kilometerstand: ${vehicleData.mileage.toLocaleString('nl-NL')} km
Brandstof: ${vehicleData.fuelType}
Transmissie: ${vehicleData.transmission}
Carrosserie: ${vehicleData.bodyType}
Vermogen: ${vehicleData.power} pk
Kleur: ${vehicleData.color}
Opties: ${vehicleData.options?.join(', ') || 'Standaard'}
${vehicleData.keywords?.length ? `Keywords: ${vehicleData.keywords.join(', ')}` : ''}

## FILTERING REGELS (VERPLICHT!)

### STAP 1: PRIMAIRE ZOEKOPDRACHT
Zoek EERST met deze filters:
- Bouwjaar: ${buildYearFrom} en nieuwer (GEEN max bouwjaar!)
- Kilometerstand: onder ${mileageMax.toLocaleString('nl-NL')} km
- Brandstof: ${vehicleData.fuelType}
- Transmissie: ${vehicleData.transmission}

### STAP 2: FALLBACK BIJ WEINIG RESULTATEN
Als je MINDER DAN 5 listings vindt met bouwjaar ${buildYearFrom}+:
→ Zoek OOK naar bouwjaar ${buildYearFallback} (1 jaar ouder)
→ Markeer deze als isLogicalDeviation: true
→ deviationReason: "Bouwjaar ${buildYearFallback} (1 jaar ouder dan ${buildYearFrom})"

### PRIMARY COMPARABLE criteria (HARDE FILTERS!):
✓ Bouwjaar ${buildYearFrom} of nieuwer
✓ Kilometerstand < ${mileageMax.toLocaleString('nl-NL')} km
✓ Zelfde brandstof: ${vehicleData.fuelType}
✓ Zelfde transmissie: ${vehicleData.transmission}
${vehicleData.trim && vehicleData.trim !== 'Standaard' ? `
✓ **Vergelijkbare uitvoering/Motortype: "${vehicleData.trim}"**
  - Let op: auto's met dezelfde motor maar ander uitrustingsniveau (Active vs Allure) ZIJN vergelijkbaar
  - Auto's met ANDERE motor (bijv. 1.2 vs 2.0, B4 vs T5) zijn NIET direct vergelijkbaar
` : '✓ Vergelijkbare uitvoering/trim'}

### LOGISCHE AFWIJKING markeren als:
- Bouwjaar ${buildYearFallback} (1 jaar ouder) → deviationReason: "Bouwjaar ${buildYearFallback} (1 jaar ouder)"
- KM boven ${mileageMax.toLocaleString('nl-NL')} → deviationReason: "Te veel km: X vs max ${mileageMax.toLocaleString('nl-NL')}"
- Andere brandstof → deviationReason: "Verkeerde brandstof: X ipv ${vehicleData.fuelType}"
- Andere transmissie → deviationReason: "Verkeerde transmissie: X ipv ${vehicleData.transmission}"
- Beschadigd → deviationReason: "Schade vermeld in advertentie"

## ZOEKOPDRACHTEN - GEBRUIK DEZE URLs!

JP Cars heeft de juiste zoek-URLs al samengesteld. Gebruik deze als startpunt:

${gaspedaalUrl ? `1. **gaspedaal.nl**: ${gaspedaalUrl}` : '1. **gaspedaal.nl**: Zoek handmatig'}
   
${autoscoutUrl ? `2. **autoscout24.nl**: ${autoscoutUrl}` : '2. **autoscout24.nl**: Zoek handmatig'}
   
${marktplaatsUrl ? `3. **marktplaats.nl**: ${marktplaatsUrl}` : `3. **marktplaats.nl**: Zoek "${vehicleData.brand} ${vehicleData.model}" met bouwjaar ${buildYearFrom}+`}

${jpCarsWindowUrl ? `4. **JP Cars overzicht** (referentie): ${jpCarsWindowUrl}` : ''}

## KRITIEKE ZOEKSTRATEGIE - SORTEER OP LAAGSTE PRIJS!

**ALS INKOPER WIL IK DE ONDERKANT VAN DE MARKT ZIEN!**

1. SORTEER ALTIJD OP PRIJS VAN LAAG NAAR HOOG op elke portal
2. Begin bij de GOEDKOOPSTE advertenties en werk naar boven
3. De goedkoopste listings zijn CRUCIAAL voor taxatie!
4. Als alle prijzen binnen €3.000 van elkaar liggen, zoek breder

## VEREISTE OUTPUT

Zoek 15-20 ECHTE listings (minstens 15!) en retourneer ALLEEN dit JSON object (geen andere tekst):

{
  "lowestPrice": getal (laagste PRIMARY COMPARABLE prijs),
  "medianPrice": getal (mediaan van PRIMARY COMPARABLES),
  "highestPrice": getal (hoogste prijs van alle listings),
  "listingCount": getal (totaal gevonden),
  "primaryComparableCount": getal (alleen listings die aan ALLE harde filters voldoen),
  "listings": [
    {
      "id": "unieke-id-1",
      "portal": "gaspedaal",
      "url": "https://www.gaspedaal.nl/... of https://www.vaartland.nl/...",
      "price": 27500,
      "mileage": 45000,
      "buildYear": 2023,
      "title": "Volledige advertentie titel",
      "options": ["Navigatie", "LED", "Achteruitrijcamera"],
      "color": "Zwart",
      "matchScore": 0.95,
      "isPrimaryComparable": true,
      "isLogicalDeviation": false,
      "deviationReason": null
    },
    {
      "id": "unieke-id-2", 
      "portal": "autoscout24",
      "url": "https://www.autoscout24.nl/...",
      "price": 24900,
      "mileage": 85000,
      "buildYear": ${buildYearFallback},
      "title": "Advertentie titel",
      "options": ["Airco"],
      "color": "Grijs",
      "matchScore": 0.60,
      "isPrimaryComparable": false,
      "isLogicalDeviation": true,
      "deviationReason": "Bouwjaar ${buildYearFallback} (1 jaar ouder)"
    }
  ],
  "logicalDeviations": [
    "Listing X heeft bouwjaar ${buildYearFallback} (1 jaar ouder dan ${buildYearFrom})",
    "Listing Y heeft te veel km (85.000 vs max ${mileageMax.toLocaleString('nl-NL')})"
  ]
}

## KRITIEKE INSTRUCTIES

1. ALLEEN ECHTE URLs die daadwerkelijk werken - geen verzonnen links!
2. De URL kan een doorverwijzing zijn (bijv. vaartland.nl via gaspedaal.nl)
3. ALLE listings moeten een werkende URL hebben
4. Als je minder dan 10 listings vindt met bouwjaar ${buildYearFrom}+, zoek ook bouwjaar ${buildYearFallback} en markeer als logische afwijking
5. PRIMARY COMPARABLE = voldoet aan ALLE harde filters (bouwjaar ${buildYearFrom}+)
6. Bereken lowestPrice en medianPrice ALLEEN op basis van primaryComparables
7. Log ELKE afwijking in logicalDeviations array
8. START ALTIJD MET DE GOEDKOOPSTE ADVERTENTIES - dit is de onderkant van de markt!
`;

    console.log('📡 Calling OpenAI Responses API with web_search_preview...');
    console.log('🎯 Filters:', { 
      buildYearFrom, 
      buildYearTo, 
      buildYearFallback,
      mileageMax, 
      fuelType: vehicleData.fuelType, 
      transmission: vehicleData.transmission,
      jpCarsUrlsProvided: !!jpCarsUrls
    });

    // OpenAI Responses API met web search tool
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
      console.error('❌ OpenAI Responses API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log('📥 OpenAI Responses API raw response received');

    // Parse de Responses API output
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
      console.error('❌ No output text found in response:', JSON.stringify(aiResponse).substring(0, 500));
      throw new Error('Empty response from OpenAI Responses API');
    }

    console.log('✅ Output text received, length:', outputText.length);
    console.log('📝 First 500 chars of output:', outputText.substring(0, 500));

    // Extract JSON from the output
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

    // Check if we got valid JSON
    if (!jsonContent.startsWith('{')) {
      console.error('❌ No valid JSON found in response. Got:', jsonContent.substring(0, 200));
      console.log('⚠️ OpenAI returned text instead of JSON - market may be thin or search failed');
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          listings: [],
          logicalDeviations: ['OpenAI kon geen listings vinden - controleer handmatig via de directe links'],
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
          },
          directSearchUrls,
          searchFailed: true,
          failureReason: 'OpenAI returned text instead of structured JSON - check direct URLs manually'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean and parse JSON
    let cleanedJson = jsonContent
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\n\s*\n/g, '\n');
    
    let analysisData;
    try {
      analysisData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('❌ JSON parse error after cleanup:', parseError.message);
      console.log('📝 First 500 chars of cleaned JSON:', cleanedJson.substring(0, 500));
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          listings: [],
          logicalDeviations: [`JSON parse error: ${parseError.message} - controleer handmatig via de directe links`],
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
          },
          directSearchUrls,
          searchFailed: true,
          failureReason: `JSON parse error: ${parseError.message}`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and enhance the data
    const listings = analysisData.listings || [];
    
    // Filter valid portal URLs
    const validListings = listings.filter((listing: PortalListing) => {
      if (!listing.url) return false;
      const validDomains = ['gaspedaal.nl', 'autoscout24.nl', 'autotrack.nl', 'marktplaats.nl', 
                          'vaartland.nl', 'autoweek.nl', 'viabovag.nl', 'autowereld.nl'];
      return validDomains.some(domain => listing.url.includes(domain));
    });

    // Calculate statistics
    const primaryComparables = validListings.filter((l: PortalListing) => l.isPrimaryComparable);
    const primaryPrices = primaryComparables.map((l: PortalListing) => l.price).sort((a: number, b: number) => a - b);
    
    const lowestPrice = primaryPrices.length > 0 ? primaryPrices[0] : (analysisData.lowestPrice || 0);
    const medianPrice = primaryPrices.length > 0 
      ? primaryPrices[Math.floor(primaryPrices.length / 2)]
      : (analysisData.medianPrice || 0);
    const highestPrice = analysisData.highestPrice || (primaryPrices.length > 0 ? primaryPrices[primaryPrices.length - 1] : 0);

    const result: PortalAnalysis = {
      lowestPrice,
      medianPrice,
      highestPrice,
      listingCount: validListings.length,
      primaryComparableCount: primaryComparables.length,
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
      },
      listings: validListings,
      logicalDeviations: analysisData.logicalDeviations || [],
    };

    console.log('✅ Portal analysis complete:', {
      listingCount: result.listingCount,
      primaryComparableCount: result.primaryComparableCount,
      priceRange: `€${result.lowestPrice} - €${result.highestPrice}`,
      jpCarsUrlsUsed: !!jpCarsUrls
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result,
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
