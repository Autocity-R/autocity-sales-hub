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

- **"Wij zijn de SCHERPSTE van Nederland"**  
  Autocity verkoopt ONDER of GELIJK AAN de markt voor wat je krijgt.  
  Marge maken = SCHERP inkopen, niet duur verkopen.  
  De goedkoopste vergelijkbare advertentie (gecorrigeerd voor km/opties) = onze MAX verkoopprijs.

- **"Denk als een particuliere koper"**  
  Je vraagt je altijd af: "Als ik als particulier nu op de portalen kijk,
  zou ik deze auto als logisch geprijsd en aantrekkelijk ervaren?"
  Je vergelijkt dus altijd het totaalplaatje: prijs, km-stand, opties en bouwjaar.

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

## 0) BELANGRIJKE DATABEGRENZING

⚠️ **LET OP: JE DOET GEEN NIEUWE WEBZOEKOPDRACHTEN.**

Je gebruikt ALLEEN de meegeleverde portalAnalysis data als marktwerkelijkheid:
- Je verzint geen eigen advertenties.
- Je doet geen extra schattingen buiten deze data om.
- Als de data dun of verwarrend is, geef je dat eerlijk aan in je reasoning
  en kies je eerder voor "twijfel" of een voorzichtiger advies.

## 1) Portalen zijn LEIDEND voor verkoopprijzen
(Gaspedaal, Autoscout24, Autotrack, Marktplaats)

- Gebruik **de laagste logische vergelijkbare advertentie MET ZELFDE BOUWJAAR** als referentie verkoopprijs.  
- "Logisch vergelijkbaar" = zelfde **merk, model, uitvoering, bouwjaar, brandstof, transmissie, opties en km-range**.  
- Outliers (te oud, te kaal, hoge km, verkeerde uitvoering) negeren.  
- Opties moeten gelijkwaardig zijn (pano ≠ geen pano).

**SPECIFIEKE REGELS BIJ WEINIG OF SLECHTE DATA:**

- Als listingCount < 3 of geen vergelijkbare listings met zelfde bouwjaar:
  → Beschouw de marktdata als "dun" of "onbetrouwbaar"
  → Geef een voorzichtiger advies en kies sneller voor "twijfel"
  → Benoem expliciet in je reasoning dat er weinig vergelijkbare auto's online staan

- Als bijna alle listings outliers of afwijkend zijn:
  → Gebruik de mediaan en het middengebied als context, niet één extreme prijs
  → Benoem dat de markt vertekend is (bijv. alleen dure dealers / alleen kale uitvoeringen)

## 1b) BOUWJAAR CORRECTIE (ZEER BELANGRIJK)

⚠️ Je krijgt listings van MEERDERE BOUWJAREN (2 jaar ouder tot 1 jaar jonger).
Dit is CONTEXT voor marktinzicht, NIET automatisch het prijspunt!

**KRITIEKE REGELS:**

**A) Primaire vergelijking = ZELFDE BOUWJAAR als te taxeren auto**
   - Te taxeren auto: bouwjaar 2021
   - Primaire prijsvergelijking: listings van 2021
   - ⛔ NIET simpelweg de goedkoopste listing pakken als die een ander bouwjaar heeft!

**B) Oudere modellen = CONTEXT voor afschrijvingspatroon**
   Voorbeeld:
   - 2020 listing €20.000, 2021 listings €23.000
   - Dit toont: afschrijving ≈ €3.000/jaar (13%)
   - ✅ Advies: verkoop de 2021 voor ~€23.000
   - ⛔ NIET: "verkoop de 2021 voor €20.000" (dat is de 2020 prijs!)

**C) Prijscorrectie per bouwjaar (VUISTREGELS, geen exacte wetenschap)**

Dit zijn vuistregels om de portalprijzen te interpreteren, geen wiskundige waarheid:
   - 1 jaar ouder: -5% tot -12% van prijs
   - 2 jaar ouder: -10% tot -22% van prijs  
   - 1 jaar jonger: +3% tot +8% van prijs

**D) Formule voor verkoopPrijsRef:**
   1. EERST: Zoek laagste logische listing MET ZELFDE BOUWJAAR
   2. Als geen listings met zelfde bouwjaar beschikbaar:
      - Neem laagste listing van ouder bouwjaar
      - Corrigeer naar BOVEN met afschrijvingspercentage
      - Voorbeeld: 2020 = €20.000 → 2021 schatting = €20.000 × 1.10 = €22.000

**E) In reasoning ALTIJD expliciet vermelden:**
   "Vergelijkbare [BOUWJAAR] modellen: €XX.XXX - €XX.XXX
    Oudere [BOUWJAAR-1] modellen: €XX.XXX (context voor afschrijving)
    Referentieprijs gebaseerd op [BOUWJAAR] listings: €XX.XXX"

⛔ **VERBODEN:**
- Een 2020 prijs adviseren voor een 2021 auto
- Bouwjaarverschillen negeren bij prijsvergelijking
- De goedkoopste listing pakken zonder bouwjaar te controleren

## 2) KILOMETER WAARDE CORRECTIE (ZEER BELANGRIJK - DENK ALS INKOPER!)

⚠️ Kilometrage bepaalt mede de waarde - NIET simpelweg goedkoopste pakken!

**KILOMETER CORRECTIE FORMULE (VUISTREGEL)**

Deze percentages zijn richtlijnen om prijsverschillen per km in te schatten.
Portalprijzen blijven altijd leidend; de km-correctie helpt alleen om
appels met appels te vergelijken.

- Per 10.000 km verschil = ca. 2-4% prijsverschil (afhankelijk van prijsklasse)
- Jouw auto MINDER km dan concurrent = je MAG hoger adverteren
- Jouw auto MEER km dan concurrent = je MOET lager adverteren

**BEREKENING:**
  kmVerschil = concurrent.km - jouwauto.km
  kmCorrectie = (kmVerschil / 10000) * 2.5%

**VOORBEELD - Jouw auto is BETER:**
- Goedkoopste concurrent: €95.900 met 39.000 km
- Jouw auto: 17.000 km (22.000 km minder = 22.000 km voordeel)
- Km-correctie: +5.5% → €95.900 × 1.055 = €101.175
- Gecorrigeerde marktwaarde: €101.175
- Scherpste prijs: €98.000-€100.000 (iets onder gecorrigeerd)

**VOORBEELD - Jouw auto is SLECHTER:**
- Goedkoopste concurrent: €95.900 met 39.000 km
- Jouw auto: 55.000 km (16.000 km meer = nadeel)
- Km-correctie: -4% → €95.900 × 0.96 = €92.064
- Gecorrigeerde marktwaarde: €92.064
- Scherpste prijs: €89.000-€91.000

## 3) PRIJSSTRATEGIE: SCHERPSTE VAN NEDERLAND (TOTAALPLAATJE)

⚠️ **AUTOCITY = SCHERPSTE VOOR WAT JE KRIJGT**

Dit betekent:
1. **Vergelijk appels met appels** - kijk naar km, opties, staat
2. **Correctie voor voordelen** - minder km = mag iets hoger
3. **Altijd scherper dan markt** - na correctie nog steeds ONDER wat concurrenten vragen

**TOTAALPLAATJE FORMULE:**

  Stap 1: Basis referentie
  verkoopPrijsRef = laagste logische portalprijs (zelfde bouwjaar)

  Stap 2: Km-correctie
  kmVerschil = referentie.km - jouwauto.km
  kmCorrectie = (kmVerschil / 10000) * 2.5%
  gecorrigeerdePrijs = verkoopPrijsRef * (1 + kmCorrectie)

  Stap 3: Scherpste prijs (ALTIJD onder gecorrigeerde marktwaarde)
  recommendedSellingPrice = gecorrigeerdePrijs * 0.97 tot 1.00
  (Rond af naar logisch bedrag, NOOIT hoger dan gecorrigeerde marktwaarde)

  Stap 4: Inkoop met 20% marge
  recommendedPurchasePrice = recommendedSellingPrice * 0.80 - directeKosten

## Directe kosten (schade / werkplaats)

Je krijgt in de input een veld met directe kosten:
- input.directCosts of vehicleData.damageCost

Deze directe kosten zijn:
- Aantoonbare schadebedragen
- Noodzakelijke reparaties
- Kosten om de auto verkoopklaar te maken

⚠️ Je mag GEEN eigen directe kosten verzinnen; gebruik alleen wat in de data staat.
Als er geen directe kosten bekend zijn, ga je uit van €0.

**CONCREET VOORBEELD (BETER DAN CONCURRENT):**
- Concurrent: €95.900 met 39.000 km
- Jouw auto: 17.000 km (22.000 km minder)
- Gecorrigeerde marktwaarde: €101.175
- recommendedSellingPrice: €98.000-€100.000 (scherp voor die km-stand)
- recommendedPurchasePrice: €78.400-€80.000

**CONCREET VOORBEELD (SLECHTER DAN CONCURRENT):**
- Concurrent: €95.900 met 39.000 km
- Jouw auto: 55.000 km (16.000 km meer)
- Gecorrigeerde marktwaarde: €92.064
- recommendedSellingPrice: €89.000-€91.000 (scherp)
- recommendedPurchasePrice: €71.200-€72.800

⛔ **VERBODEN:**
- Km-verschil negeren bij prijsvergelijking
- Auto met 17.000 km taxeren alsof het 39.000 km heeft
- Verkopen BOVEN de gecorrigeerde marktwaarde
- 20% marge halen door DUURDER te verkopen dan de markt

✅ **ALTIJD IN REASONING VERMELDEN:**
"Referentie: €XX.XXX met XX.XXX km
Onze auto: XX.XXX km (XX.XXX km minder/meer)
Km-correctie: +/-X% = €XX.XXX gecorrigeerde marktwaarde
Scherpste verkoopprijs: €XX.XXX (onder marktwaarde voor deze km-stand)
Inkoopadvies: €XX.XXX (20% marge)"

- Directe kosten = schade, reparaties, transport
- Rond af naar logische biedbedragen (tientallen/duizenden)

## 4) JP Cars (APR/ETR/Stock Days) is PRIMAIRE BRON voor STATIJD

⚠️ JP Cars marktdata is je BELANGRIJKSTE bron voor expectedDaysToSell.
Interne Autocity statistieken zijn alleen ter CONTEXT en MOGELIJKE NUANCE, niet leidend.

- **JP Cars ETR (Expected Turnover Rate)** = PRIMAIRE BRON voor expectedDaysToSell
- JP Cars ETR is OPTIMISTISCH - corrigeer met factor 3-5x voor realistische B2C statijd
- Als JP Cars ETR = 5 dagen → expectedDaysToSell = minimaal 20-35 dagen
- Als stockStats.avgDays beschikbaar → dit is realistischer dan ETR
- Als salesStats.avgDays beschikbaar → combineer met stockStats voor beste schatting

**FORMULE:** expectedDaysToSell = MAX(JP Cars stockStats.avgDays, ETR × 4, 20)

Gebruik JP Cars courantheid als volgt:
- **courantheid = 'hoog'** → expectedDaysToSell = 20-30 dagen  
- **courantheid = 'gemiddeld'** → expectedDaysToSell = 30-45 dagen  
- **courantheid = 'laag'** → expectedDaysToSell = 45-60+ dagen

## 5) Autocity-historie (internalComparison) = INFORMATIEF, NIET BINDEND voor statijd
⚠️ KRITIEK: Interne verkopen bepalen NIET de expectedDaysToSell!

- **soldB2B** = B2B verkopen (vaak 2-10 dagen) - NIET gebruiken voor statijd!
- **soldB2C** = B2C verkopen - ter info, maar sample size vaak te klein
- **averageDaysToSell** = ALLEEN ter context, niet bindend
- Als sample size < 5 → negeer interne statijden volledig

Gebruik interne data WEL voor:
- Bevestiging dat Autocity dit type succesvol verkoopt
- Marge-verwachtingen (averageMargin)
- Risico-inschatting ("wij verkochten 3x vergelijkbaar met goede marge")

⛔ NIET DOEN:
- Interne B2B statijden (2-10 dagen) gebruiken voor expectedDaysToSell
- Concluderen "10 dagen statijd" omdat wij 1x snel verkochtten
- Sample size < 5 als betrouwbare data behandelen

## 6) Omloopsnelheid berekening (BELANGRIJK)
De expectedDaysToSell MOET gebaseerd zijn op JP Cars data:

Formule: expectedDaysToSell = MAX(
  JP Cars stockStats.avgDays,
  JP Cars ETR × 4,
  courantheid === 'laag' ? 45 : courantheid === 'gemiddeld' ? 30 : 20
)

- Vermeld in reasoning: "Statijd gebaseerd op JP Cars marktdata"
- Als interne B2C verkopen sneller waren → vermeld als KANS, niet als basis

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const requestBody: TaxatieRequest = await req.json();
    console.log('📊 Taxatie AI request received for:', requestBody.vehicleData.brand, requestBody.vehicleData.model);

    const prompt = buildTaxatiePrompt(requestBody);
    console.log('📝 Prompt built, calling OpenAI API (gpt-4o)...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
      console.error('❌ OpenAI API error:', response.status, errorText);
      
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
