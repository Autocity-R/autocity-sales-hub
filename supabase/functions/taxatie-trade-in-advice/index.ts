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
}

interface PortalAnalysis {
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
  listingCount: number;
  listings: PortalListing[];
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
  stockStats?: { count: number; avgDays: number | null };
  salesStats?: { count: number; avgDays: number | null };
}

interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  soldB2C: number;
  soldB2B: number;
}

interface TradeInRequest {
  vehicleData: TaxatieVehicleData;
  portalAnalysis: PortalAnalysis;
  jpCarsData: JPCarsData;
  internalComparison: InternalComparison;
}

function buildTradeInPrompt(input: TradeInRequest): string {
  const stockDays = input.jpCarsData.stockStats?.avgDays;
  const stockCount = input.jpCarsData.stockStats?.count || 0;

  return `# ROL & DOEL - INRUIL TAXATIE

Je bent een ERVAREN INKOPER bij Autocity die inruil-auto's strategisch inkoopt.

**Jouw Missie:**
1. Intern: Zo laag mogelijk inkopen met minimaal €1.500 marge
2. Naar klant: Een geloofwaardig verhaal met "10% handelsmarge"
3. De extra marge zit in de correctie voor risico's en incourantheid

---

# 📊 PRIJS BEREKENING REGELS

## STAP 1: Bepaal MARKTVLOER
Laagste SERIEUZE portal prijs = je startpunt

**Portal Data:**
- Aantal gevonden: ${input.portalAnalysis.listingCount || 0}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- JP Cars waarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}

**Listings:**
${input.portalAnalysis.listings?.slice(0, 8).map((l, i) => 
  `${i + 1}. €${l.price?.toLocaleString('nl-NL')} | ${l.mileage?.toLocaleString('nl-NL')} km | ${l.buildYear} | ${l.title}`
).join('\n') || 'Geen listings beschikbaar'}

## STAP 2: Bereken INTERNE inkoopprijs

**Courantheid bepaling:**
- APR (prijspositie): ${input.jpCarsData.apr || '?'}/5
- ETR (omloopsnelheid): ${input.jpCarsData.etr || '?'}/5
${stockCount > 0 ? `- Voorraad markt: ${stockCount} auto's${stockDays ? `, gemiddeld ${Math.round(stockDays)} dagen` : ''}` : ''}

**Margeberekening:**
- COURANT (APR ≥ 4, ETR ≥ 4): Marktvloer × 0.82 = 18% marge
- GEMIDDELD (APR 2.5-4, ETR 2.5-4): Marktvloer × 0.75 = 25% marge  
- INCOURANT (APR < 2.5 of ETR < 2.5): Marktvloer × 0.70 = 30% marge

## STAP 3: Check MINIMALE MARGE
- Marge MOET minimaal €1.500 zijn
- Tenzij de auto zelf < €1.500 waard is

## STAP 4: Bereken KLANT-BOD
- Klant-bod = Interne prijs + 8% van marktvloer
- Dit is wat je MONDELING aanbiedt
- Je vertelt klant "10% handelsmarge"
- De extra marge is je interne buffer

---

# 📝 KLANT-VERHAAL OPBOUWEN

**Te Taxeren Auto:**
- Merk/Model: ${input.vehicleData.brand} ${input.vehicleData.model}
- Uitvoering: ${input.vehicleData.trim || 'Onbekend'}
- Bouwjaar: ${input.vehicleData.buildYear}
- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km
- Motor: ${input.vehicleData.power} PK ${input.vehicleData.fuelType}
- Transmissie: ${input.vehicleData.transmission}

**Verhaal structuur:**

1. **Standaard opening:**
   "We hanteren een standaard handelsmarge van 10%..."

2. **Incourantheid-argumenten** (noem indien van toepassing):
   - "Vergelijkbare auto's staan gemiddeld X dagen te koop"
   - "Er is beperkte vraag naar dit type in de huidige markt"
   - "Brandstoftype [diesel] heeft dalende vraag"
   - "Seizoenseffect: cabriolets verkopen minder in winter"

3. **Model-specifieke risico's** (ALTIJD NOEMEN - dit overtuigt klanten!):

   **BEKENDE PROBLEMEN PER MERK:**

   BMW:
   - N47/N57 diesel: Timing chain slijtage (100-150k km) - €2.000-4.000 reparatie
   - B47/B57: EGR/AGR verstoppingen
   - Elektronica/iDrive problemen bij oudere modellen

   VOLKSWAGEN/AUDI/SEAT/SKODA:
   - DSG7 (DQ200): Mechatronic failure - €2.000-3.500 reparatie
   - TSI 1.4 (CAVD/CAXA): Timing chain stretch
   - TDI 2.0 (CR): EGR/DPF problemen

   MERCEDES:
   - OM651 diesel: Injector problemen
   - 7G-Tronic: Versnellingsbakproblemen bij hoge km
   - Command systeem veroudering

   RENAULT:
   - 1.2 TCe: Bekende motorproblemen
   - EDC automaat: Koppeling slijtage

   PEUGEOT/CITROËN:
   - 1.2 PureTech: Distributieriem issues
   - EAT8 automaat: Software problemen

   FORD:
   - 1.0 EcoBoost: Koelvloeistof lekkage degazeerdop
   - PowerShift DCT: Koppeling problemen

   OPEL:
   - 1.2/1.4 Turbo: Timing chain

   ⚠️ NOEM ALLEEN problemen die ECHT bestaan voor dit specifieke model/motor!

4. **Eerlijkheid trigger:**
   "We willen u een eerlijk bod doen. We kennen de risico's van dit model 
   en calculeren die mee. Zo voorkomt u verrassingen later."

---

# 📤 OUTPUT INSTRUCTIES

Genereer via de tool:

1. **marketFloorPrice**: Laagste serieuze portal prijs (of JP Cars als geen portals)

2. **courantheid**: 'courant' | 'gemiddeld' | 'incourant'

3. **courantheidsPercentage**: 0.82 / 0.75 / 0.70

4. **internalMaxPrice**: Marktvloer × courantheidsPercentage (check min €1.500 marge)

5. **calculatedMargin**: Marktvloer - internalMaxPrice

6. **customerOfferPrice**: internalMaxPrice + (marktvloer × 0.08)

7. **customerStory**: Complete tekst voor klantgesprek (2-4 zinnen), inclusief:
   - Standaard marge vermelding
   - Incourantheid argumenten (indien van toepassing)
   - Model-specifieke risico vermelding
   - Eindbod

8. **modelRisks**: Array van ECHTE bekende problemen voor dit model/motor

9. **marketArguments**: Array van markt-argumenten (statijd, vraag, seizoen)

10. **reasoning**: Korte uitleg van je berekening`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key not configured');
    }

    const input: TradeInRequest = await req.json();
    console.log('🚗 Trade-in taxatie request:', {
      vehicle: `${input.vehicleData.brand} ${input.vehicleData.model}`,
      lowestPrice: input.portalAnalysis?.lowestPrice,
      apr: input.jpCarsData?.apr,
      etr: input.jpCarsData?.etr
    });

    const prompt = buildTradeInPrompt(input);
    console.log('🤖 Sending trade-in request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `Je bent een ervaren auto-inkoper gespecialiseerd in INRUIL deals.

Jouw kernprincipes:
- Intern: Maximale marge pakken (18-30% afhankelijk van courantheid)
- Naar klant: "10% handelsmarge" communiceren  
- Minimum marge: €1.500 (tenzij auto < €1.500 waard)
- Altijd model-risico's benoemen als onderhandeling argument
- Klant-verhaal moet geloofwaardig en eerlijk klinken

Je genereert PRAKTISCH toepasbaar advies met kopieerbare klant-teksten.`
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_trade_in_advice',
            description: 'Genereer strategisch inruil-advies met interne prijs en klant-verhaal',
            parameters: {
              type: 'object',
              properties: {
                marketFloorPrice: {
                  type: 'number',
                  description: 'Marktvloer: laagste serieuze portal prijs'
                },
                courantheid: {
                  type: 'string',
                  enum: ['courant', 'gemiddeld', 'incourant'],
                  description: 'Courantheid classificatie op basis van APR/ETR'
                },
                courantheidsPercentage: {
                  type: 'number',
                  description: 'Marge percentage: 0.82 (courant), 0.75 (gemiddeld), 0.70 (incourant)'
                },
                internalMaxPrice: {
                  type: 'number',
                  description: 'Maximale INTERNE inkoopprijs (niet aan klant zeggen)'
                },
                calculatedMargin: {
                  type: 'number',
                  description: 'Berekende marge in euros (min €1.500)'
                },
                customerOfferPrice: {
                  type: 'number',
                  description: 'Bod naar KLANT (interne prijs + 8% marktvloer)'
                },
                customerStory: {
                  type: 'string',
                  description: 'Complete tekst voor klantgesprek: opening, incourantheid, risicos, eerlijkheid trigger, eindbod'
                },
                modelRisks: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array van ECHTE bekende problemen voor dit specifieke model/motor'
                },
                marketArguments: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array van markt-argumenten: statijd, vraag, seizoen, etc.'
                },
                reasoning: {
                  type: 'string',
                  description: 'Korte uitleg van de berekening en argumentatie'
                }
              },
              required: [
                'marketFloorPrice',
                'courantheid',
                'courantheidsPercentage',
                'internalMaxPrice',
                'calculatedMargin',
                'customerOfferPrice',
                'customerStory',
                'modelRisks',
                'marketArguments',
                'reasoning'
              ]
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_trade_in_advice' } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ OpenAI response received');

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('❌ No tool call in response');
      throw new Error('No structured output from AI');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📊 Trade-in advice generated:', {
      marketFloor: advice.marketFloorPrice,
      internalMax: advice.internalMaxPrice,
      customerOffer: advice.customerOfferPrice,
      courantheid: advice.courantheid
    });

    return new Response(
      JSON.stringify({ success: true, advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Trade-in advice error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
