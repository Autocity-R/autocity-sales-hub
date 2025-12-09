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

// Gaspedaal numerieke codes voor brandstof
function getFuelCode(fuelType: string): string {
  const fuelMap: Record<string, string> = {
    'benzine': '1',
    'diesel': '2',
    'hybride': '25',
    'elektrisch': '9',
    'lpg': '4',
    'plug-in hybride': '25',
    'mild hybride': '25',
    'full hybride': '25',
  };
  const normalized = fuelType.toLowerCase().trim();
  return fuelMap[normalized] || '';
}

// Gaspedaal numerieke codes voor transmissie
function getTransmissionCode(transmission: string): string {
  const transMap: Record<string, string> = {
    'automaat': '14',
    'handgeschakeld': '16',
    'handmatig': '16',
    'manueel': '16',
  };
  const normalized = transmission.toLowerCase().trim();
  return transMap[normalized] || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleData } = await req.json() as { vehicleData: VehicleData };
    
    console.log('🔍 Portal search request for:', vehicleData.brand, vehicleData.model, vehicleData.trim);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build search filters
    // Primaire range: zelfde bouwjaar of nieuwer
    const buildYearFrom = vehicleData.buildYear;
    const buildYearTo = vehicleData.buildYear + 1;
    // Fallback range: 1 jaar ouder toevoegen als primaire zoek niets vindt
    const buildYearFallback = vehicleData.buildYear - 1;
    const mileageMax = Math.ceil((vehicleData.mileage + 20000) / 10000) * 10000;
    
    // Genereer directe portal zoek-URLs met CORRECTE codes
    const brandSlug = vehicleData.brand.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = vehicleData.model.toLowerCase().replace(/\s+/g, '-');
    const fuelSlug = vehicleData.fuelType.toLowerCase().replace(/\s+/g, '-');
    
    // Gaspedaal gebruikt numerieke codes
    const transmissionCode = getTransmissionCode(vehicleData.transmission);
    const fuelCode = getFuelCode(vehicleData.fuelType);
    
    // Bouw Gaspedaal URL met numerieke codes (ZONDER bmax - die is te restrictief)
    let gaspedaalUrl = `https://www.gaspedaal.nl/${brandSlug}/${modelSlug}`;
    if (fuelSlug) gaspedaalUrl += `/${fuelSlug}`;
    gaspedaalUrl += `?bmin=${buildYearFrom}&kmax=${mileageMax}`;
    if (transmissionCode) gaspedaalUrl += `&trns=${transmissionCode}`;
    gaspedaalUrl += `&srt=pr-a`;
    
    const directSearchUrls = {
      gaspedaal: gaspedaalUrl,
      autoscout24: `https://www.autoscout24.nl/lst/${brandSlug}/${modelSlug}?fregfrom=${buildYearFrom}&kmto=${mileageMax}&fuel=${fuelSlug}&sort=price&asc=true`,
      autotrack: `https://www.autotrack.nl/auto/${brandSlug}/${modelSlug}?bouwjaar_van=${buildYearFrom}&km_tot=${mileageMax}`
    };

    console.log('🔗 Direct search URLs generated:', directSearchUrls);

    // Volledige inkoper-prompt met STRIKTE filters en FALLBACK instructies
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
- Bouwjaar: ${buildYearFrom} en nieuwer (bmin=${buildYearFrom}, GEEN bmax!)
- Kilometerstand: onder ${mileageMax.toLocaleString('nl-NL')} km
- Brandstof: ${vehicleData.fuelType}
- Transmissie: ${vehicleData.transmission}

### STAP 2: FALLBACK BIJ WEINIG RESULTATEN
Als je MINDER DAN 5 listings vindt met bouwjaar ${buildYearFrom}+:
→ Zoek OOK naar bouwjaar ${buildYearFallback} (1 jaar ouder)
→ Markeer deze als isLogicalDeviation: true
→ deviationReason: "Bouwjaar ${buildYearFallback} (1 jaar ouder dan ${buildYearFrom})"

### PRIMARY COMPARABLE criteria:
✓ Bouwjaar ${buildYearFrom} of nieuwer
✓ Kilometerstand < ${mileageMax.toLocaleString('nl-NL')} km
✓ Zelfde brandstof: ${vehicleData.fuelType}
✓ Zelfde transmissie: ${vehicleData.transmission}
✓ Vergelijkbare uitvoering/trim

### LOGISCHE AFWIJKING markeren als:
- Bouwjaar ${buildYearFallback} (1 jaar ouder) → deviationReason: "Bouwjaar ${buildYearFallback} (1 jaar ouder)"
- KM boven ${mileageMax.toLocaleString('nl-NL')} → deviationReason: "Te veel km: X vs max ${mileageMax.toLocaleString('nl-NL')}"
- Andere brandstof → deviationReason: "Verkeerde brandstof: X ipv ${vehicleData.fuelType}"
- Andere transmissie → deviationReason: "Verkeerde transmissie: X ipv ${vehicleData.transmission}"
- Te kaal (veel minder opties) → deviationReason: "Te kaal: mist opties X, Y, Z"
- Beschadigd → deviationReason: "Schade vermeld in advertentie"

## ZOEKOPDRACHTEN PER PORTAL

Gebruik deze EXACTE URLs om te zoeken (sorteer op laagste prijs):

1. **gaspedaal.nl**: ${directSearchUrls.gaspedaal}
   
2. **autoscout24.nl**: ${directSearchUrls.autoscout24}
   
3. **marktplaats.nl/auto**: Zoek "${vehicleData.brand} ${vehicleData.model}" met bouwjaar ${buildYearFrom}+
   
4. **autotrack.nl**: ${directSearchUrls.autotrack}

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
9. Als de goedkoopste advertentie NIET in je resultaten zit, heb je het VERKEERD gedaan!
`;

    console.log('📡 Calling OpenAI Responses API with web_search_preview...');
    console.log('🎯 Filters:', { 
      buildYearFrom, 
      buildYearTo, 
      buildYearFallback,
      mileageMax, 
      fuelType: vehicleData.fuelType, 
      fuelCode,
      transmission: vehicleData.transmission,
      transmissionCode 
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
    
    // De Responses API kan output in verschillende formaten teruggeven
    if (aiResponse.output_text) {
      outputText = aiResponse.output_text;
    } else if (aiResponse.output && Array.isArray(aiResponse.output)) {
      // Zoek naar message content in de output array
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

    // Extract JSON from the output (may be wrapped in markdown code blocks)
    let jsonContent = outputText;
    const jsonMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
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
      
      // Return empty result with warning
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

    const analysisData = JSON.parse(jsonContent);

    // Valideer dat URLs echt zijn van portalen
    const portalUrls = ['gaspedaal.nl', 'autoscout24.nl', 'autoscout24.be', 'marktplaats.nl', 'autotrack.nl', 'vaartland.nl', 'autohopper.nl', 'autowereld.nl'];
    
    const hasRealUrls = analysisData.listings?.some((l: PortalListing) => 
      l.url && portalUrls.some(portal => l.url.includes(portal))
    );

    // Log gevonden listings voor debugging
    console.log('📋 Gevonden listings:', analysisData.listings?.map((l: PortalListing) => ({
      portal: l.portal,
      title: l.title?.substring(0, 50),
      price: l.price,
      mileage: l.mileage,
      buildYear: l.buildYear,
      isPrimaryComparable: l.isPrimaryComparable,
      deviationReason: l.deviationReason,
      urlValid: portalUrls.some(p => l.url?.includes(p))
    })));

    if (!hasRealUrls) {
      console.warn('⚠️ Geen echte portal URLs gevonden in response - web search mogelijk niet volledig succesvol');
    } else {
      console.log('✅ Echte portal URLs gevonden in listings');
    }

    // Validate and count primary comparables
    const primaryComparables = analysisData.listings?.filter((l: PortalListing) => l.isPrimaryComparable) || [];
    const logicalDeviations = analysisData.listings?.filter((l: PortalListing) => l.isLogicalDeviation) || [];
    
    console.log('📊 Listing breakdown:', {
      total: analysisData.listings?.length || 0,
      primaryComparables: primaryComparables.length,
      logicalDeviations: logicalDeviations.length
    });

    // Check voor smalle prijsspread (mogelijk niet alle goedkope listings gevonden)
    const priceSpread = analysisData.lowestPrice > 0 
      ? (analysisData.highestPrice - analysisData.lowestPrice) / analysisData.lowestPrice 
      : 0;
    const priceSpreadWarning = priceSpread < 0.10 && analysisData.listingCount > 3
      ? "Prijsspread < 10% - mogelijk niet alle goedkope advertenties gevonden. Controleer handmatig via de directe link."
      : null;

    // Add the applied filters to the response
    const portalAnalysis: PortalAnalysis = {
      ...analysisData,
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
      directSearchUrls,
      priceSpreadWarning,
    };

    console.log('📊 Portal analysis complete:', {
      listingCount: portalAnalysis.listingCount,
      primaryComparableCount: portalAnalysis.primaryComparableCount,
      priceRange: `€${portalAnalysis.lowestPrice} - €${portalAnalysis.highestPrice}`,
      median: `€${portalAnalysis.medianPrice}`,
      hasRealUrls
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
