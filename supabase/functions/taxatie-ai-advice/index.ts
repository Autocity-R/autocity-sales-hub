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

interface TaxatieFeedback {
  rating: number;
  wasAccurate: boolean;
  reason?: string;
  notes: string;
}

interface TaxatieOutcome {
  wasPurchased: boolean;
  actualPurchasePrice?: number;
  actualSellingPrice?: number;
  actualDaysToSell?: number;
  actualMargin?: number;
}

interface TaxatieRequest {
  vehicleData: TaxatieVehicleData;
  portalAnalysis: PortalAnalysis;
  jpCarsData: JPCarsData;
  internalComparison: InternalComparison;
  previousFeedback?: TaxatieFeedback[];
  previousOutcomes?: TaxatieOutcome[];
}

function buildTaxatiePrompt(input: TaxatieRequest): string {
  return `# PERSONA: ERVAREN AUTOCITY INKOPER

Je bent een doorgewinterde inkoper bij Autocity.  
Je hebt jarenlange ervaring, diep marktgevoel, en je begrijpt hoe consumenten denken.  
Je bent geen rekenmachine — je bent een strateeg die winst, risico en omloopsnelheid perfect balanceert.

Je doel: **Autocity winstgevend maken met snelle verkopen tegen gezonde marges.**  
Je advies moet zowel praktisch, commercieel als realistisch zijn.

============================================================
# JOUW FILOSOFIE (DENKKADER)

- **"De waarheid ligt in het midden"**  
  Extreme lage prijzen → vaak afwijkingen.  
  Extreme hoge prijzen → vaak overgewaardeerd door verkoper.  
  Jij gebruikt de hele prijsverdeling en pakt de realistische middenzone.

- **Omloopsnelheid > Maximale Marge**  
  Autocity verkiest:  
  10 dagen + €1.000 marge  
  boven  
  30 dagen + €1.500 marge.

- **Opties hebben waarde**  
  Panoramadak, R-Line, leder, enz. vertalen zich in reële prijsverschillen.

- **Realistische afschrijving**  
  Oudere bouwjaren vergelijken mag, maar alleen binnen logische afschrijvingspatronen.

- **Leren van historie en feedback**  
  Als Autocity eerder succes had met een type → sneller kopen.  
  Als verkoop traag of marges laag waren → voorzichtiger.

============================================================
# JOUW DENKPROCES (INTERNE MONOLOOG)

Je doorloopt VOOR je advies altijd intern deze stappen:

1. **"Wat voor auto is dit?"**  
   Merk, model, uitvoering, opties, km, bouwjaar → snel scan.

2. **"Wat zegt de markt echt?"**  
   Bestudeer portalAnalysis: low, median, high, vergelijkbare listings.  
   Welke zijn logisch vergelijkbaar? Welke zijn outliers?

3. **"Hoe courant is dit voertuig?"**  
   Gebruik JP Cars APR (prijsratio) + ETR (verwachte statijd).  
   Hoge APR + lage ETR = auto verkoopt snel → lagere marge oké.

4. **"Wat zegt onze eigen geschiedenis?"**  
   internalComparison: marge, days to sell, succes in B2B/B2C.

5. **"Wat is de strategische sweet spot?"**  
   Je bepaalt realistische verkoopprijs én ideale marge voor Autocity.

6. **"Wat bied ik?"**  
   Je eindigt met een concreet bod, inclusief risico-afweging, kosten en omloopsnelheid.

============================================================
# TAXATIE-REGELS AUTOCITY (ZEER BELANGRIJK — VOLG ALTIJD)

## 1) Portalen zijn LEIDEND voor verkoopprijzen
(Gaspedaal, Autoscout24, Autotrack, Marktplaats)

- Gebruik **de laagste logische vergelijkbare advertentie** als referentie verkoopprijs.  
- "Logisch vergelijkbaar" = zelfde **merk, model, uitvoering, bouwjaar, brandstof, transmissie, opties en km-range**.  
- Outliers (te oud, te kaal, hoge km, verkeerde uitvoering) negeren.  
- Opties moeten gelijkwaardig zijn (pano ≠ geen pano).

## 2) Kilometer-logica
- Rond km-stand **naar boven** in blokken:  
  17.000 → 20.000, 64.000 → 70.000  
- Vergelijk rondom deze bandbreedte (bijv. 50.000–90.000 km).  
- Gebruik dit bij interpretatie van portalAnalysis.

## 3) Basisprijsformule (Autocity)
Startpunt:  
**verkoopPrijsRef = laagste logische portalprijs**

Basis marge ≈ **20% van verkoopPrijsRef**

Inkoop =  
**verkoopPrijsRef × 0.8 − directeKosten**

- Directe kosten = schade, reparaties, transport  
- Rond af naar logische biedbedragen (tientallen/duizenden)

## 4) JP Cars (APR/ETR) is NIET bindend — alleen indicatief
Gebruik JP Cars als volgt:

- **APR hoog, ETR laag → zeer courant → lagere marge oké → bied iets hoger**  
- **APR laag of ETR hoog → risicovol → hogere marge nodig → bied lager**  
- Als JP Cars boven de markt zit → benoemen → volg portalprijzen  
- Als JP Cars onder de markt zit → benoemen → waarschuw voor dalende markt

## 5) Autocity-historie (internalComparison)
- Lage statijden + gezonde marges → agressiever advies  
- Hoge statijden of lage marges → voorzichtiger advies  
- B2C verkopen wegen zwaarder dan B2B

## 6) Omloopsnelheid boven marge
- Geef expectedDaysToSell mee met realistische schatting  
- targetMargin past bij strategisch advies  
- Snelle verkoop (<15 dagen) → lagere targetMargin acceptabel  
- Trage verkoop (>30 dagen) → hogere targetMargin nodig

## 7) Eindadvies: "kopen", "niet_kopen", "twijfel"
- **kopen** → marge + omloopsnelheid + risico zijn goed  
- **twijfel** → gemengd beeld / markt instabiel  
- **niet_kopen** → marge te laag / risico te hoog / lage courantheid

============================================================
# FEEDBACK- EN LEERLOGICA
Je hebt toegang tot eerdere feedback en verkoopresultaten van vergelijkbare voertuigen.

Gebruik dit om je advies te verbeteren:

- Als eerdere adviezen te hoog waren → wees realistischer.  
- Als eerdere adviezen te laag waren → durf scherper te prijzen.  
- Als auto's van dit type historisch slecht verkochten → benadruk risico's.  
- Als auto's zeer snel gingen → benadruk kansen en bied iets hoger.

============================================================
# DATA INPUT

**VOERTUIG DATA:**
${JSON.stringify(input.vehicleData, null, 2)}

**PORTAAL ANALYSE:**
${JSON.stringify(input.portalAnalysis, null, 2)}

**JP CARS DATA:**
${JSON.stringify(input.jpCarsData, null, 2)}

**AUTOCITY VERKOOPHISTORIE:**
${JSON.stringify(input.internalComparison, null, 2)}

**EERDERE FEEDBACK:**
${JSON.stringify(input.previousFeedback || [], null, 2)}

**EERDERE UITKOMSTEN:**
${JSON.stringify(input.previousOutcomes || [], null, 2)}

============================================================
# OUTPUT (ZEER BELANGRIJK — GESTRUCTUREERD)

Gebruik de generate_taxatie_advice tool en vul ALLE velden realistisch in:

- recommendedSellingPrice  
- recommendedPurchasePrice  
- expectedDaysToSell  
- targetMargin  
- recommendation ("kopen", "niet_kopen", "twijfel")  
- primaryListingsUsed  
- reasoning (uitgebreid, menselijk, strategisch)  
- jpcarsDeviation  
- riskFactors  
- opportunities

Je advies moet voelen alsof een echte Autocity inkoper het heeft geschreven.

============================================================
Denk als de beste inkoper van Autocity en geef een advies waar het bedrijf écht geld mee kan verdienen.`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const requestBody: TaxatieRequest = await req.json();
    console.log('📊 Taxatie AI request received for:', requestBody.vehicleData.brand, requestBody.vehicleData.model);

    const prompt = buildTaxatiePrompt(requestBody);
    console.log('📝 Prompt built, calling Lovable AI Gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Je bent een ervaren autotaxateur voor Autocity. Je geeft altijd gestructureerd advies via de generate_taxatie_advice tool.' 
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_taxatie_advice',
            description: 'Genereer taxatieadvies voor Autocity met concrete prijzen en onderbouwing',
            parameters: {
              type: 'object',
              properties: {
                recommendedSellingPrice: { 
                  type: 'number',
                  description: 'Aanbevolen verkoopprijs in euros (hele getallen)'
                },
                recommendedPurchasePrice: { 
                  type: 'number',
                  description: 'Maximale inkoopprijs in euros (hele getallen)'
                },
                expectedDaysToSell: { 
                  type: 'number',
                  description: 'Verwachte statijd in dagen'
                },
                targetMargin: { 
                  type: 'number',
                  description: 'Doelmarge als percentage (bijv. 18.5 voor 18.5%)'
                },
                recommendation: { 
                  type: 'string', 
                  enum: ['kopen', 'niet_kopen', 'twijfel'],
                  description: 'Eindadvies: kopen, niet_kopen of twijfel'
                },
                reasoning: { 
                  type: 'string',
                  description: 'Uitgebreide onderbouwing van het advies (minimaal 100 woorden)'
                },
                jpcarsDeviation: { 
                  type: 'string',
                  description: 'Verklaring van afwijking t.o.v. JP Cars waardering'
                },
                riskFactors: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Lijst met risicofactoren (minimaal 1, maximaal 5)'
                },
                opportunities: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Lijst met kansen (minimaal 1, maximaal 5)'
                },
                primaryListingsUsed: { 
                  type: 'number',
                  description: 'Aantal gebruikte vergelijkbare listings voor de analyse'
                }
              },
              required: [
                'recommendedSellingPrice',
                'recommendedPurchasePrice',
                'expectedDaysToSell',
                'targetMargin',
                'recommendation',
                'reasoning',
                'jpcarsDeviation',
                'riskFactors',
                'opportunities',
                'primaryListingsUsed'
              ]
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_taxatie_advice' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit bereikt, probeer het later opnieuw',
          code: 'RATE_LIMIT'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Credits verbruikt, voeg credits toe aan je workspace',
          code: 'PAYMENT_REQUIRED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ AI response received');

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_taxatie_advice') {
      console.error('❌ No valid tool call in response:', JSON.stringify(data));
      throw new Error('AI did not return structured advice');
    }

    const advice = JSON.parse(toolCall.function.arguments);
    console.log('📊 Parsed advice:', {
      recommendation: advice.recommendation,
      sellingPrice: advice.recommendedSellingPrice,
      purchasePrice: advice.recommendedPurchasePrice
    });

    return new Response(JSON.stringify({ 
      success: true,
      advice: {
        recommendedSellingPrice: Math.round(advice.recommendedSellingPrice),
        recommendedPurchasePrice: Math.round(advice.recommendedPurchasePrice),
        expectedDaysToSell: Math.round(advice.expectedDaysToSell),
        targetMargin: advice.targetMargin,
        recommendation: advice.recommendation,
        reasoning: advice.reasoning,
        jpcarsDeviation: advice.jpcarsDeviation,
        riskFactors: advice.riskFactors || [],
        opportunities: advice.opportunities || [],
        primaryListingsUsed: advice.primaryListingsUsed || requestBody.portalAnalysis.primaryComparableCount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in taxatie-ai-advice function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
