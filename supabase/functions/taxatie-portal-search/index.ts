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
}

interface JPCarsPortalUrls {
  gaspedaal?: string | null;
  autoscout24?: string | null;
  marktplaats?: string | null;
  jpCarsWindow?: string | null;
}

interface PortalListing {
  title: string;
  price: number;
  mileage: number;
  buildYear: number;
  url: string;
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

    // Gebruik JP Cars URLs - deze hebben al de juiste filters!
    const gaspedaalUrl = jpCarsUrls?.gaspedaal || null;
    const autoscoutUrl = jpCarsUrls?.autoscout24 || null;
    const marktplaatsUrl = jpCarsUrls?.marktplaats || null;
    const jpCarsWindowUrl = jpCarsUrls?.jpCarsWindow || null;
    
    // Fallback als geen URLs
    const fallbackUrl = gaspedaalUrl || autoscoutUrl || marktplaatsUrl;
    if (!fallbackUrl) {
      console.log('⚠️ No JP Cars URLs provided - returning empty');
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          listingCount: 0,
          listings: [],
          directSearchUrls: {},
          message: 'Geen JP Cars URLs beschikbaar'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const directSearchUrls = {
      gaspedaal: gaspedaalUrl,
      autoscout24: autoscoutUrl,
      marktplaats: marktplaatsUrl,
      jpCarsWindow: jpCarsWindowUrl,
    };

    // === SIMPEL PROMPT - GEEN COMPLEXE FILTERING ===
    const searchPrompt = `
# OPDRACHT: Zoek vergelijkbare auto's

## TE TAXEREN AUTO
${vehicleData.brand} ${vehicleData.model} ${vehicleData.trim || ''}
Bouwjaar: ${vehicleData.buildYear}
KM-stand: ${vehicleData.mileage.toLocaleString('nl-NL')} km
Brandstof: ${vehicleData.fuelType}

## ZOEK OP DEZE LINK
${gaspedaalUrl || autoscoutUrl || marktplaatsUrl}

## WAT JE MOET DOEN
1. Open de link hierboven
2. Bekijk de eerste 10-15 auto's (gesorteerd op prijs, laag naar hoog)
3. Geef per auto: titel, prijs, km-stand, bouwjaar, URL

## RETURN DIT JSON FORMAT (alleen JSON, geen tekst ervoor of erna)
{
  "listingCount": 15,
  "lowestPrice": 45000,
  "medianPrice": 52000,
  "listings": [
    {
      "title": "BMW 3-serie 320i M Sport",
      "price": 45000,
      "mileage": 35000,
      "buildYear": 2023,
      "url": "https://www.gaspedaal.nl/..."
    }
  ]
}

BELANGRIJK:
- Geen filtering nodig - de zoek-URL heeft al de juiste filters!
- Geef ECHTE listings met WERKENDE URLs
- Sorteer op prijs (laagste eerst)
- Maximaal 15 listings
`;

    console.log('📡 Calling OpenAI with simplified prompt...');

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
          listingCount: 0,
          listings: [],
          directSearchUrls,
          message: 'Geen response van AI'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📝 Output length:', outputText.length);
    console.log('📝 First 300 chars:', outputText.substring(0, 300));

    // Extract JSON
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
          listingCount: 0,
          listings: [],
          directSearchUrls,
          message: 'Kon JSON niet parsen - check handmatig via links'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simpele validatie
    const listings = (analysisData.listings || []).filter((l: PortalListing) => 
      l.url && l.price && typeof l.price === 'number'
    );

    // Bereken statistieken
    const prices = listings.map((l: PortalListing) => l.price).sort((a: number, b: number) => a - b);
    const lowestPrice = prices.length > 0 ? prices[0] : 0;
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;

    console.log('✅ Portal search complete:', {
      listingCount: listings.length,
      lowestPrice,
      medianPrice
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        lowestPrice,
        medianPrice,
        listingCount: listings.length,
        listings,
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
