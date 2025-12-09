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
  // Bereken statijd info
  const stockDays = input.jpCarsData.stockStats?.avgDays;
  const salesDays = input.jpCarsData.salesStats?.avgDays;
  const stockCount = input.jpCarsData.stockStats?.count || 0;
  const salesCount = input.jpCarsData.salesStats?.count || 0;

  return `# ROL & DOEL

Je bent een zeer ervaren en slimme inkoper bij Autocity. Je bent geen data-analist, maar een HANDELAAR. 
Je doel is niet om de perfecte analyse te maken, maar om een praktisch en winstgevend inkoopadvies te geven.

**Jouw Mantra:** "Winst maak je bij de inkoop. Omloopsnelheid is koning."

---

# JOUW DENKPROCES (VOLG EXACT DEZE 6 STAPPEN)

## Stap 1: Oriëntatie - Wat is de globale waarde?

Kijk naar de JP Cars Waarde. Dit is je startpunt, je kompas.

**JP Cars Data:**
- Totaalwaarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}
- Range: €${input.jpCarsData.range?.min?.toLocaleString('nl-NL') || '?'} - €${input.jpCarsData.range?.max?.toLocaleString('nl-NL') || '?'}
- Courantheid: ${input.jpCarsData.courantheid || 'onbekend'}
- APR (prijspositie): ${input.jpCarsData.apr || '?'}/5
- ETR (omloopsnelheid): ${input.jpCarsData.etr || '?'}/5
${stockCount > 0 ? `- Voorraad markt: ${stockCount} auto's${stockDays ? `, gemiddeld ${Math.round(stockDays)} dagen op voorraad` : ''}` : ''}
${salesCount > 0 ? `- Verkocht: ${salesCount} auto's${salesDays ? `, gemiddeld ${Math.round(salesDays)} dagen tot verkoop` : ''}` : ''}

Formuleer je eerste hypothese: "JP Cars zegt dat deze auto rond de €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || '?'} waard is."

---

## Stap 2: Realiteitscheck - Wat is de ÉCHTE marktprijs?

Dit is de BELANGRIJKSTE stap. De portal data is de waarheid. Wat staat er NU te koop?

**Portal Analyse:**
- Aantal gevonden: ${input.portalAnalysis.listingCount || 0}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Hoogste prijs: €${input.portalAnalysis.highestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}

**Listings (gesorteerd op prijs):**
${input.portalAnalysis.listings?.slice(0, 12).map((l, i) => 
  `${i + 1}. ${l.title}
     Prijs: €${l.price?.toLocaleString('nl-NL')} | KM: ${l.mileage?.toLocaleString('nl-NL')} | Jaar: ${l.buildYear}
     ${l.url ? `URL: ${l.url}` : ''}`
).join('\n\n') || 'Geen listings beschikbaar'}

**KRITIEK: Identificeer de VLOER VAN DE MARKT**
Wat is de prijs van de goedkoopste, vergelijkbare, SERIEUZE aanbieder? 
- Negeer auto's met schade
- Negeer auto's met onlogisch hoge km
- Negeer duidelijk afwijkende specificaties
Dit is je belangrijkste ankerpunt!

**Vergelijk JP Cars met de Markt:**
Komt de JP Cars waarde (€${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || '?'}) overeen met wat je in de portalen ziet?
- Is JP Cars te optimistisch?
- Is JP Cars te pessimistisch?
- Of klopt het aardig?

---

## Stap 3: Nuance & Ervaring - De waarde van uitrusting inschatten

Je weet dat een exacte kloon zeldzaam is. Je moet MENTAAL CORRIGEREN voor verschillen.

**Te Taxeren Auto:**
- Merk/Model: ${input.vehicleData.brand} ${input.vehicleData.model}
- Uitvoering: ${input.vehicleData.trim || 'Onbekend'}
- Bouwjaar: ${input.vehicleData.buildYear}${input.vehicleData.modelYear && input.vehicleData.modelYear !== input.vehicleData.buildYear ? ` (modeljaar ${input.vehicleData.modelYear})` : ''}
- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km
- Motor: ${input.vehicleData.power} PK ${input.vehicleData.fuelType}
- Transmissie: ${input.vehicleData.transmission}
- Opties: ${input.vehicleData.options?.join(', ') || 'Geen opties bekend'}

**Vergelijkingsregels:**

1. **MOTOR = HARD FILTER**
   De motorvariant is cruciaal. Een andere motor is een ANDERE auto.

2. **UITVOERING = FLEXIBEL**
   Vergelijk verschillende uitrustingsniveaus met elkaar.
   Je WEET dat een sport- of luxe-uitvoering meerwaarde heeft.

3. **REDENEER IN PERCENTAGES, NIET VASTE BEDRAGEN**
   De waarde van een premium pakket is een PERCENTAGE van de autowaarde.
   
   Voorbeeld: "Ik zie een basismodel te koop voor €30.000. De te taxeren auto heeft 
   een significant luxer pakket, wat in deze klasse en leeftijd doorgaans een 
   meerwaarde van 5-8% vertegenwoordigt. Gecorrigeerde referentieprijs: €31.500 - €32.400"

**Correctieregels:**
- Per 10.000 km verschil ≈ 2-3% prijsverschil
- 1 jaar ouder ≈ 8-12% lager
- Hogere uitvoering ≈ +5-10% (afhankelijk van merk/klasse)

---

## Stap 4: Interne Historie - Wat kunnen we leren?

**Autocity Verkoophistorie:**
- Vergelijkbare auto's verkocht afgelopen jaar: ${input.internalComparison.soldLastYear || 0}
- Verkocht B2C: ${input.internalComparison.soldB2C || 0}
- Verkocht B2B: ${input.internalComparison.soldB2B || 0}
- Gemiddelde marge: €${input.internalComparison.averageMargin?.toLocaleString('nl-NL') || 'n.v.t.'}
- Gemiddelde statijd: ${input.internalComparison.averageDaysToSell || 'n.v.t.'} dagen
${input.internalComparison.averageDaysToSell_B2C ? `- Gemiddelde statijd B2C: ${input.internalComparison.averageDaysToSell_B2C} dagen` : ''}

${input.internalComparison.similarVehicles?.length > 0 ? `**Eerder verkochte vergelijkbare auto's:**
${input.internalComparison.similarVehicles.slice(0, 5).map(v => 
  `- ${v.brand} ${v.model} ${v.buildYear} (${v.mileage?.toLocaleString('nl-NL')} km)
    Inkoop: €${v.purchasePrice?.toLocaleString('nl-NL')} → Verkoop: €${v.sellingPrice?.toLocaleString('nl-NL')} = €${v.margin?.toLocaleString('nl-NL')} marge in ${v.daysToSell} dagen (${v.channel})`
).join('\n')}` : 'Geen vergelijkbare auto\'s in historie.'}

---

## Stap 5: Risicoanalyse - Waar kan het misgaan?

Identificeer en benoem de risico's:

**Courantheid & Omloopsnelheid:**
- ETR-score: ${input.jpCarsData.etr || '?'}/5
- ${input.jpCarsData.etr && input.jpCarsData.etr >= 4 ? 'Laag risico - snelle verkoop verwacht' : input.jpCarsData.etr && input.jpCarsData.etr >= 3 ? 'Gemiddeld risico - normale omloop' : input.jpCarsData.etr ? 'Hoog risico - langere statijd verwacht' : 'Onbekend risico'}

**Marktdynamiek:**
- Zijn er minder dan 5 serieuze concurrenten? → DUNNE MARKT risico
- Zijn er onlogische prijsverschillen tussen bouwjaren? → MARKTCORRECTIE risico
- Is de markt dalend voor dit model? → WAARDEDALING risico

---

## Stap 6: Het Inkoopadvies - Terugrekenen vanuit SLIMME Verkoopprijs

**DE FORMULE:**

1. **Bepaal REALISTISCHE VERKOOPPRIJS**
   Baseer op: portal data + uitvoerings-correctie + interne historie

2. **Bereken met 20% BRUTO MARGE**
   Standaard marge om gezonde winst te garanderen.

3. **MAXIMALE INKOOPPRIJS = Verkoopprijs / 1.20**
   Rond af naar logisch, rond getal.

**Voorbeeld:**
- Realistische verkoopprijs: €50.000
- Berekening: €50.000 / 1.20 = €41.667
- Afgerond inkoopadvies: €41.500

---

# OUTPUT INSTRUCTIES

Gebruik de tool om je advies te structureren. Zorg dat:

1. **reasoning** bevat je complete analyse volgens de 6 stappen:
   - Wat zegt JP Cars?
   - Wat zie je in de markt (vloerprijs)?
   - Hoe vergelijk je uitvoering/km/jaar?
   - Wat leert de historie?
   - Welke risico's zie je?
   - Hoe kom je tot je prijs?

2. **recommendedSellingPrice** is de realistische verkoopprijs

3. **recommendedPurchasePrice** = recommendedSellingPrice / 1.20 (afgerond)

4. **targetMargin** = recommendedSellingPrice - recommendedPurchasePrice

5. **riskFactors** bevat concrete risico's (dunne markt, dalende prijzen, etc.)

6. **opportunities** bevat kansen (snelle verkoop, populair model, etc.)`;
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

    const input: TaxatieRequest = await req.json();
    console.log('📊 Taxatie request received:', {
      vehicle: `${input.vehicleData.brand} ${input.vehicleData.model}`,
      trim: input.vehicleData.trim,
      jpCarsValue: input.jpCarsData?.totalValue,
      listingCount: input.portalAnalysis?.listingCount,
      lowestPrice: input.portalAnalysis?.lowestPrice
    });

    const prompt = buildTaxatiePrompt(input);
    console.log('🤖 Sending to OpenAI with Manus v2.0 prompt...');

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
            content: `Je bent een ervaren auto-inkoper bij Autocity. Je denkt als een HANDELAAR, niet als een data-analist.

Jouw kernprincipes:
- Winst maak je bij de INKOOP
- Omloopsnelheid is belangrijker dan maximale marge
- De marktvloer (laagste serieuze concurrent) is je ankerpunt
- Standaard marge = 20% op verkoopprijs
- Redeneer in percentages bij uitrustingsverschillen`
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_taxatie_advice',
            description: 'Genereer gestructureerd taxatie-advies volgens de 6-stappen methodiek',
            parameters: {
              type: 'object',
              properties: {
                recommendation: {
                  type: 'string',
                  enum: ['kopen', 'niet_kopen', 'twijfel'],
                  description: 'Eindadvies: kopen (goede deal), niet_kopen (te duur/risicovol), twijfel (grenseval)'
                },
                recommendedSellingPrice: {
                  type: 'number',
                  description: 'Realistische verkoopprijs gebaseerd op marktvloer + correcties'
                },
                recommendedPurchasePrice: {
                  type: 'number',
                  description: 'Maximale inkoopprijs = verkoopprijs / 1.20 (afgerond)'
                },
                expectedDaysToSell: {
                  type: 'number',
                  description: 'Verwachte statijd in dagen, gebaseerd op ETR en historie'
                },
                targetMargin: {
                  type: 'number',
                  description: 'Doelmarge = verkoopprijs - inkoopprijs (±20%)'
                },
                reasoning: {
                  type: 'string',
                  description: 'Complete analyse volgens 6-stappen: JP Cars waarde → Marktvloer → Uitvoering/KM correcties → Historie → Risicos → Prijsberekening'
                },
                jpcarsDeviation: {
                  type: 'string',
                  description: 'Korte uitleg: Hoe verhoudt je advies zich tot JP Cars? Bijv: "5% lager dan JP Cars omdat marktvloer lager ligt"'
                },
                riskFactors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Concrete risicofactoren: dunne markt, dalende prijzen, lage ETR, etc.'
                },
                opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Kansen: populair model, hoge ETR, weinig concurrentie in segment, etc.'
                },
                marketFloorPrice: {
                  type: 'number',
                  description: 'De geïdentificeerde marktvloer: laagste prijs van serieuze concurrent'
                },
                marketFloorReasoning: {
                  type: 'string',
                  description: 'Waarom is dit de marktvloer? Welke listing, en waarom is deze relevant?'
                }
              },
              required: ['recommendation', 'recommendedSellingPrice', 'recommendedPurchasePrice', 'expectedDaysToSell', 'targetMargin', 'reasoning', 'riskFactors', 'opportunities']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_taxatie_advice' } },
        temperature: 0.3,
        max_tokens: 3000
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

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_taxatie_advice') {
      console.error('❌ No valid tool call in response');
      throw new Error('Invalid response from AI');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📋 Taxatie advice generated (Manus v2.0):', {
      recommendation: advice.recommendation,
      sellingPrice: advice.recommendedSellingPrice,
      purchasePrice: advice.recommendedPurchasePrice,
      margin: advice.targetMargin,
      marketFloor: advice.marketFloorPrice
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
