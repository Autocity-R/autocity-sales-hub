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

    // Build search filters (zoals een inkoper)
    const buildYearFrom = vehicleData.buildYear - 1;
    const buildYearTo = vehicleData.buildYear + 1;
    const mileageMax = Math.ceil((vehicleData.mileage + 20000) / 10000) * 10000;

    // Volledige inkoper-prompt met web search instructies
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

## ZOEKSTRATEGIE (zoals een echte inkoper)

### Zoekfilters toepassen:
- Bouwjaar: ${buildYearFrom} tot ${buildYearTo}
- Max kilometerstand: ${mileageMax.toLocaleString('nl-NL')} km (afgerond naar boven)
- Exacte match op: merk, model, brandstof, transmissie

### Portalen om te doorzoeken:
1. **Gaspedaal.nl** - zoek naar "${vehicleData.brand} ${vehicleData.model}" ${vehicleData.trim || ''} ${vehicleData.fuelType} ${vehicleData.transmission}
2. **AutoScout24.nl** - zoek naar "${vehicleData.brand} ${vehicleData.model}" bouwjaar ${buildYearFrom}-${buildYearTo}
3. **Marktplaats.nl/auto** - zoek naar "${vehicleData.brand} ${vehicleData.model}" 
4. **Autotrack.nl** - zoek naar "${vehicleData.brand} ${vehicleData.model}"

### Wat zoek je per listing:
- De ECHTE, WERKENDE URL naar de advertentie
- De vraagprijs in euro's
- De exacte kilometerstand
- Het bouwjaar
- De titel/kop van de advertentie
- Welke opties/uitvoering (pano, leder, R-Line, etc.)
- Of het een LOGISCHE VERGELIJKING is (primary comparable)

### Logische vergelijkbaarheid bepalen (zoals een inkoper):
PRIMARY COMPARABLE als:
✓ Zelfde merk, model, uitvoering
✓ Bouwjaar binnen ${buildYearFrom}-${buildYearTo}
✓ Kilometerstand onder ${mileageMax.toLocaleString('nl-NL')} km
✓ Zelfde brandstof en transmissie
✓ Vergelijkbare opties

LOGISCHE AFWIJKING als:
- Te kaal (veel minder opties)
- Te veel km (>30% meer)
- Verkeerd bouwjaar
- Andere uitvoering (bijv. R-Line vs basis)
- Beschadigd/ongevalvrij vermelding

## VEREISTE OUTPUT

Zoek 6-10 ECHTE listings en retourneer ALLEEN dit JSON object (geen andere tekst):
{
  "lowestPrice": getal (laagste primary comparable prijs),
  "medianPrice": getal (mediaan van primary comparables),
  "highestPrice": getal (hoogste prijs),
  "listingCount": getal (totaal gevonden),
  "primaryComparableCount": getal (aantal echte vergelijkingen),
  "listings": [
    {
      "id": "unieke id",
      "portal": "gaspedaal" | "autoscout24" | "marktplaats" | "autotrack",
      "url": "ECHTE URL naar de advertentie",
      "price": getal,
      "mileage": getal,
      "buildYear": getal,
      "title": "advertentie titel",
      "options": ["gevonden opties"],
      "color": "kleur indien vermeld",
      "matchScore": 0-1 (hoe vergelijkbaar),
      "isPrimaryComparable": true/false,
      "isLogicalDeviation": true/false,
      "deviationReason": "reden als afwijking of null"
    }
  ],
  "logicalDeviations": ["uitleg per afwijking"]
}

BELANGRIJK: Alleen ECHTE URLs die werken. Geen verzonnen data!
`;

    console.log('📡 Calling OpenAI Responses API with web_search_preview...');

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
    const hasRealUrls = analysisData.listings?.some((l: PortalListing) => 
      l.url && (
        l.url.includes('gaspedaal.nl') || 
        l.url.includes('autoscout24.nl') ||
        l.url.includes('autoscout24.be') ||
        l.url.includes('marktplaats.nl') ||
        l.url.includes('autotrack.nl')
      )
    );

    if (!hasRealUrls) {
      console.warn('⚠️ Geen echte portal URLs gevonden in response - web search mogelijk niet volledig succesvol');
    } else {
      console.log('✅ Echte portal URLs gevonden in listings');
    }

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
      primaryComparableCount: portalAnalysis.primaryComparableCount,
      priceRange: `€${portalAnalysis.lowestPrice} - €€${portalAnalysis.highestPrice}`,
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
