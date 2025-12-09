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
    
    console.log('🔍 Portal search request for:', vehicleData.brand, vehicleData.model, vehicleData.trim);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build search filters - ZELFDE BOUWJAAR OF NIEUWER (accurate taxatie)
    const buildYearFrom = vehicleData.buildYear;      // Zelfde bouwjaar als minimum
    const buildYearTo = vehicleData.buildYear + 1;    // Max 1 jaar jonger
    const mileageMax = Math.ceil((vehicleData.mileage + 20000) / 10000) * 10000;
    
    // Genereer directe portal zoek-URLs
    const brandSlug = vehicleData.brand.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = vehicleData.model.toLowerCase().replace(/\s+/g, '-');
    const fuelSlug = vehicleData.fuelType.toLowerCase().replace(/\s+/g, '-');
    const transmissionSlug = vehicleData.transmission === 'Automaat' ? 'AUTOMATISCH' : 'HANDGESCHAKELD';
    
    const directSearchUrls = {
      gaspedaal: `https://www.gaspedaal.nl/${brandSlug}/${modelSlug}/${fuelSlug}?bmin=${buildYearFrom}&bmax=${buildYearTo}&kmax=${mileageMax}&trns=${transmissionSlug}&srt=pr-a`,
      autoscout24: `https://www.autoscout24.nl/lst/${brandSlug}/${modelSlug}?fregfrom=${buildYearFrom}&fregto=${buildYearTo}&kmto=${mileageMax}&fuel=${fuelSlug}&sort=price&asc=true`,
      autotrack: `https://www.autotrack.nl/auto/${brandSlug}/${modelSlug}?bouwjaar_van=${buildYearFrom}&bouwjaar_tot=${buildYearTo}&km_tot=${mileageMax}`
    };

    // Volledige inkoper-prompt met STRIKTE filters
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

### HARDE FILTERS - Listings MOETEN voldoen aan:
- Bouwjaar: MOET tussen ${buildYearFrom} en ${buildYearTo} liggen
- Kilometerstand: MOET onder ${mileageMax.toLocaleString('nl-NL')} km zijn
- Brandstof: ${vehicleData.fuelType}
- Transmissie: ${vehicleData.transmission}
- Merk & Model: ${vehicleData.brand} ${vehicleData.model}

### PRIMARY COMPARABLE criteria:
✓ Bouwjaar ${buildYearFrom}-${buildYearTo}
✓ Kilometerstand < ${mileageMax.toLocaleString('nl-NL')} km
✓ Zelfde brandstof: ${vehicleData.fuelType}
✓ Zelfde transmissie: ${vehicleData.transmission}
✓ Vergelijkbare uitvoering/trim

### LOGISCHE AFWIJKING markeren als:
- Bouwjaar buiten ${buildYearFrom}-${buildYearTo} → deviationReason: "Bouwjaar X buiten range ${buildYearFrom}-${buildYearTo}"
- KM boven ${mileageMax.toLocaleString('nl-NL')} → deviationReason: "Te veel km: X vs max ${mileageMax.toLocaleString('nl-NL')}"
- Andere brandstof → deviationReason: "Verkeerde brandstof: X ipv ${vehicleData.fuelType}"
- Andere transmissie → deviationReason: "Verkeerde transmissie: X ipv ${vehicleData.transmission}"
- Te kaal (veel minder opties) → deviationReason: "Te kaal: mist opties X, Y, Z"
- Beschadigd → deviationReason: "Schade vermeld in advertentie"

## ZOEKOPDRACHTEN PER PORTAL

Voer deze EXACTE zoekopdrachten uit:

1. **gaspedaal.nl**: 
   Zoek: "${vehicleData.brand} ${vehicleData.model}" 
   Filters: bouwjaar ${buildYearFrom}-${buildYearTo}, max ${mileageMax} km, ${vehicleData.fuelType}, ${vehicleData.transmission}
   
2. **autoscout24.nl**: 
   Zoek: ${vehicleData.brand} ${vehicleData.model}
   Filters: Erstzulassung ${buildYearFrom}-${buildYearTo}, max ${mileageMax} km
   
3. **marktplaats.nl/auto**: 
   Zoek: "${vehicleData.brand} ${vehicleData.model}"
   Filters: bouwjaar, kilometerstand
   
4. **autotrack.nl**: 
   Zoek: ${vehicleData.brand} ${vehicleData.model}
   Filters: bouwjaar ${buildYearFrom}-${buildYearTo}

## KRITIEKE ZOEKSTRATEGIE - SORTEER OP LAAGSTE PRIJS!

**ALS INKOPER WIL IK DE ONDERKANT VAN DE MARKT ZIEN!**

1. SORTEER ALTIJD OP PRIJS VAN LAAG NAAR HOOG op elke portal:
   - Gaspedaal: voeg "srt=pr-a" toe aan URL (prijs oplopend)
   - AutoScout24: sort=price&asc=true
   - Marktplaats: sorteer op prijs laag-hoog
   - AutoTrack: sorteer op prijs

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
      "buildYear": 2021,
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
      "buildYear": 2020,
      "title": "Advertentie titel",
      "options": ["Airco"],
      "color": "Grijs",
      "matchScore": 0.60,
      "isPrimaryComparable": false,
      "isLogicalDeviation": true,
      "deviationReason": "Te veel km: 85.000 vs max ${mileageMax.toLocaleString('nl-NL')}"
    }
  ],
  "logicalDeviations": [
    "Listing X heeft te veel km (85.000 vs max ${mileageMax.toLocaleString('nl-NL')})",
    "Listing Y is bouwjaar 2019 (buiten range ${buildYearFrom}-${buildYearTo})"
  ]
}

## KRITIEKE INSTRUCTIES

1. ALLEEN ECHTE URLs die daadwerkelijk werken - geen verzonnen links!
2. De URL kan een doorverwijzing zijn (bijv. vaartland.nl via gaspedaal.nl)
3. ALLE listings moeten een werkende URL hebben
4. Als je minder dan 10 listings vindt, zoek breder maar markeer de afwijkingen
5. PRIMARY COMPARABLE = voldoet aan ALLE harde filters
6. Bereken lowestPrice en medianPrice ALLEEN op basis van primaryComparables
7. Log ELKE afwijking in logicalDeviations array
8. START ALTIJD MET DE GOEDKOOPSTE ADVERTENTIES - dit is de onderkant van de markt!
9. Als de goedkoopste advertentie NIET in je resultaten zit, heb je het VERKEERD gedaan!
`;

    console.log('📡 Calling OpenAI Responses API with web_search_preview...');
    console.log('🎯 Filters:', { buildYearFrom, buildYearTo, mileageMax, fuelType: vehicleData.fuelType, transmission: vehicleData.transmission });

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