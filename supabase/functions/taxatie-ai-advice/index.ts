import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxatieVehicleData {
  brand: string;
  model: string;
  buildYear: number;
  modelYear?: number;
  mileage: number;
  fuelType: string;
  transmission: 'Automaat' | 'Handgeschakeld';
  bodyType: string;
  power: number;
  trim: string;
  color: string;
  options: string[];
  keywords?: string[];
}

interface PortalListing {
  id: string;
  portal: string;
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
  listings: PortalListing[];
  logicalDeviations: string[];
}

interface JPCarsData {
  baseValue: number;
  optionValue: number;
  totalValue: number;
  range: { min: number; max: number };
  confidence: number;
  apr: number;
  etr: number;
  courantheid: 'hoog' | 'gemiddeld' | 'laag';
}

interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  soldB2C: number;
  soldB2B: number;
  averageDaysToSell_B2C: number | null;
  note?: string;
  similarVehicles: Array<{
    id: string;
    brand: string;
    model: string;
    buildYear: number;
    mileage: number;
    purchasePrice: number;
    sellingPrice: number;
    margin: number;
    daysToSell: number;
    channel: 'B2B' | 'B2C';
    soldAt: string;
  }>;
}

interface TaxatieRequest {
  vehicleData: TaxatieVehicleData;
  portalAnalysis: PortalAnalysis;
  jpCarsData: JPCarsData;
  internalComparison: InternalComparison;
}

function buildTaxatiePrompt(input: TaxatieRequest): string {
  return `# AUTOCITY TAXATIE ASSISTENT

Je bent een ervaren inkoper bij Autocity. Je geeft praktisch, realistisch inkoopadvies.

## JOUW AANPAK (SIMPEL EN EFFECTIEF)

1. **JP Cars waarde = Startpunt**
   JP Cars geeft een marktwaarde. Dit is je vertrekpunt.

2. **Portal listings = Verificatie**
   Kijk naar wat er ECHT te koop staat. Is de JP Cars waarde realistisch?

3. **Jouw kennis = Nuance**
   Gebruik je algemene kennis over uitrustingsniveaus, opties, en marktpositie.
   Je WEET dat een Black Edition duurder is dan een Plus Bright.
   Je WEET dat een M Sport pakket waarde heeft.
   Pas dit toe op de vergelijking.

4. **Advies = JP Cars + Marktverificatie + Jouw Kennis**
   Geef een realistisch advies gebaseerd op alle bronnen.

## BELANGRIJKE PRINCIPES

- **Autocity = Scherp inkopen, niet duur verkopen**
  Marge maken door slim inkopen, niet door boven de markt te verkopen.

- **Omloopsnelheid > Maximale marge**
  Liever 10 dagen + €1.000 marge dan 30 dagen + €1.500 marge.

- **Denk als particuliere koper**
  Zou een klant deze prijs als eerlijk ervaren vergeleken met wat er online staat?

## VERGELIJKINGSLOGICA

Wanneer je listings vergelijkt met de te taxeren auto:

1. **Uitrustingsniveau herkennen**
   Kijk naar de titel en opties. Herken het niveau (basis, mid, premium, special).
   Gebruik je algemene kennis - je weet wat uitrustingsniveaus betekenen per merk.

2. **Prijs mentaal corrigeren**
   Als de te taxeren auto een hogere uitvoering is dan de listings:
   → De listing prijs is te laag als referentie, corrigeer naar boven.
   
   Als de te taxeren auto een lagere uitvoering is:
   → De listing prijs is te hoog als referentie, corrigeer naar beneden.

3. **In je reasoning vermelden**
   "Ik zie [uitvoering X] te koop voor €XX.XXX. De te taxeren auto is [uitvoering Y], 
   wat een [hogere/lagere] uitvoering is. Gecorrigeerde referentieprijs: €XX.XXX"

## KILOMETER CORRECTIE (SIMPELE VUISTREGEL)

- Per 10.000 km verschil ≈ 2-3% prijsverschil
- Minder km dan concurrent = mag iets hoger
- Meer km dan concurrent = moet iets lager

## BOUWJAAR CORRECTIE

- 1 jaar ouder ≈ 8-12% lager
- Vergelijk altijd EERST met zelfde bouwjaar
- Oudere listings zijn CONTEXT, niet de directe referentie

## WAT ALS WEINIG LISTINGS?

Als er weinig of geen goede vergelijkbare listings zijn:
- Vertrouw meer op JP Cars waarde
- Geef aan dat marktdata dun is
- Wees voorzichtiger met je advies

## DATA DIE JE KRIJGT

### Te taxeren voertuig:
${JSON.stringify(input.vehicleData, null, 2)}

### JP Cars Marktwaarde:
- Basiswaarde: €${input.jpCarsData.baseValue?.toLocaleString('nl-NL') || 'n.v.t.'}
- Optiewaarde: €${input.jpCarsData.optionValue?.toLocaleString('nl-NL') || 'n.v.t.'}
- **Totaalwaarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}**
- Range: €${input.jpCarsData.range?.min?.toLocaleString('nl-NL') || 'n.v.t.'} - €${input.jpCarsData.range?.max?.toLocaleString('nl-NL') || 'n.v.t.'}
- Courantheid: ${input.jpCarsData.courantheid || 'onbekend'}
- APR (prijspositie): ${input.jpCarsData.apr || 'n.v.t.'}/5
- ETR (omloopsnelheid): ${input.jpCarsData.etr || 'n.v.t.'}/5
- Confidence: ${input.jpCarsData.confidence || 'n.v.t.'}%

### Portal Listings (wat er echt te koop staat):
- Aantal gevonden: ${input.portalAnalysis.listingCount}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Hoogste prijs: €${input.portalAnalysis.highestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}

Listings:
${input.portalAnalysis.listings?.slice(0, 10).map((l, i) => 
  `${i + 1}. ${l.title} - €${l.price?.toLocaleString('nl-NL')} - ${l.mileage?.toLocaleString('nl-NL')} km - ${l.buildYear}`
).join('\n') || 'Geen listings beschikbaar'}

### Interne Autocity Historie:
- Verkocht afgelopen jaar: ${input.internalComparison.soldLastYear || 0}
- Gemiddelde marge: €${input.internalComparison.averageMargin?.toLocaleString('nl-NL') || 'n.v.t.'}
- Gemiddelde statijd: ${input.internalComparison.averageDaysToSell || 'n.v.t.'} dagen

## JOUW TAAK

Analyseer de data en geef een taxatie-advies. Gebruik de tool om je advies te structureren.

**Belangrijk:**
- JP Cars waarde is je startpunt
- Vergelijk met wat er ECHT te koop staat
- Gebruik je kennis over uitrustingsniveaus om prijzen te corrigeren
- Geef een realistisch, praktisch advies`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key not configured');
    }

    const input: TaxatieRequest = await req.json();
    console.log('📊 Taxatie request received:', {
      vehicle: `${input.vehicleData.brand} ${input.vehicleData.model}`,
      trim: input.vehicleData.trim,
      jpCarsValue: input.jpCarsData?.totalValue,
      listingCount: input.portalAnalysis?.listingCount
    });

    const prompt = buildTaxatiePrompt(input);
    console.log('🤖 Sending to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Je bent een ervaren auto-inkoper. Geef praktisch, data-gedreven advies.' },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_taxatie_advice',
            description: 'Genereer gestructureerd taxatie-advies',
            parameters: {
              type: 'object',
              properties: {
                recommendation: {
                  type: 'string',
                  enum: ['kopen', 'niet_kopen', 'twijfel'],
                  description: 'Eindadvies: kopen, niet_kopen, of twijfel'
                },
                recommendedSellingPrice: {
                  type: 'number',
                  description: 'Geadviseerde verkoopprijs in euros'
                },
                recommendedPurchasePrice: {
                  type: 'number',
                  description: 'Geadviseerde inkoopprijs (max bod) in euros'
                },
                expectedDaysToSell: {
                  type: 'number',
                  description: 'Verwachte statijd in dagen'
                },
                targetMargin: {
                  type: 'number',
                  description: 'Doelmarge in euros'
                },
                reasoning: {
                  type: 'string',
                  description: 'Uitgebreide onderbouwing van het advies. Vermeld: JP Cars waarde, vergelijking met listings, uitrustingsniveau analyse, km/bouwjaar correcties.'
                },
                jpCarsDeviation: {
                  type: 'object',
                  properties: {
                    deviationPercent: { type: 'number' },
                    explanation: { type: 'string' }
                  },
                  description: 'Afwijking t.o.v. JP Cars waarde'
                },
                riskFactors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lijst van risicofactoren'
                },
                opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lijst van kansen/voordelen'
                }
              },
              required: ['recommendation', 'recommendedSellingPrice', 'recommendedPurchasePrice', 'expectedDaysToSell', 'targetMargin', 'reasoning']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_taxatie_advice' } },
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit bereikt. Probeer het over enkele seconden opnieuw.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_taxatie_advice') {
      console.error('❌ No valid tool call in response');
      throw new Error('Invalid response from AI');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📋 Taxatie advice generated:', {
      recommendation: advice.recommendation,
      sellingPrice: advice.recommendedSellingPrice,
      purchasePrice: advice.recommendedPurchasePrice
    });

    return new Response(JSON.stringify(advice), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in taxatie-ai-advice:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
