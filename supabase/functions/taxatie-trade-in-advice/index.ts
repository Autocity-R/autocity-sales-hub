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
  const lowestPortalUrl = input.portalAnalysis.listings?.[0]?.url || '';

  return `# INRUIL TAXATIE - SAMENWERKING AI + VERKOPER

## CONTEXT
Je genereert een KLANT-TRANSPARANT scherm met VERKOPER-INKOPPERTJES.

Het scherm:
- MAG aan de klant getoond worden (oogt professioneel en betrouwbaar)
- Toont marktdata en een "officieel" bod (referentieprijs - 10%)
- Bevat aandachtspunten/waarschuwingen die de VERKOPER als onderhandelpunten kan gebruiken
- De verkoper gebruikt jouw inkoppertjes om MONDELING lager te onderhandelen

De klant ziet een transparant, data-gedreven scherm.
De verkoper ziet dezelfde data + hints om nog scherper in te kopen.

---

## TE TAXEREN AUTO

- Merk/Model: ${input.vehicleData.brand} ${input.vehicleData.model}
- Uitvoering: ${input.vehicleData.trim || 'Onbekend'}
- Bouwjaar: ${input.vehicleData.buildYear}
- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km
- Motor: ${input.vehicleData.power} PK ${input.vehicleData.fuelType}
- Transmissie: ${input.vehicleData.transmission}
- **KLEUR: ${input.vehicleData.color || 'Onbekend'}**

---

## STAP 1: BEPAAL REFERENTIEPRIJS

Pak de LAAGSTE ECHTE VERGELIJKBARE prijs van de portals.
Dit is wat je aan de klant toont: "Vergelijkbare auto's kosten €X"

**Portal Data:**
- Aantal gevonden: ${input.portalAnalysis.listingCount || 0}
- Laagste prijs: €${input.portalAnalysis.lowestPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- Mediaan prijs: €${input.portalAnalysis.medianPrice?.toLocaleString('nl-NL') || 'n.v.t.'}
- JP Cars waarde: €${input.jpCarsData.totalValue?.toLocaleString('nl-NL') || 'n.v.t.'}

**Listings:**
${input.portalAnalysis.listings?.slice(0, 8).map((l, i) => 
  `${i + 1}. €${l.price?.toLocaleString('nl-NL')} | ${l.mileage?.toLocaleString('nl-NL')} km | ${l.buildYear} | ${l.title}`
).join('\n') || 'Geen listings beschikbaar'}

---

## STAP 2: STANDAARD CORRECTIE (minimaal €1.500)

De marge moet MINIMAAL €1.500 zijn. Dit betekent:
- Bij Referentieprijs < €15.000: Trek €1.500 af (vast bedrag)
- Bij Referentieprijs ≥ €15.000: Trek 10% af (percentage)

Voorbeelden:
- €9.000 → max inkoop = €7.500 (marge €1.500)
- €12.000 → max inkoop = €10.500 (marge €1.500)
- €15.000 → max inkoop = €13.500 (marge €1.500 = 10%)
- €20.000 → max inkoop = €18.000 (marge €2.000 = 10%)
- €25.000 → max inkoop = €22.500 (marge €2.500 = 10%)

Je communiceert: "Standaard handelsmarge voor reconditie en winst"

---

## STAP 3: GENEREER WAARSCHUWINGEN (INKOPPERTJES)

Analyseer ALLE negatieve factoren. Deze worden op het scherm getoond.
De klant ziet "aandachtspunten", de verkoper ziet "onderhandelpunten".

### KLEUR CHECK ⚠️ BELANGRIJK

**COURANTE KLEUREN:** zwart, wit, grijs, zilver, donkerblauw, antraciet, marineblauw
**INCOURANTE KLEUREN:** rood, groen, geel, oranje, paars, bruin, beige, roze, lichtblauw, turquoise

Auto kleur: **${input.vehicleData.color || 'Onbekend'}**

→ Als kleur INCOURANT is: genereer waarschuwing type "color" met severity "high"
→ Titel: "Incourante kleur"
→ Description: "[Kleur] auto's hebben lagere marktvraag en langere verkooptijd"

### STATIJD CHECK

- Markt voorraad: ${stockCount} auto's
- Gemiddelde statijd: ${stockDays ? `${Math.round(stockDays)} dagen` : 'Onbekend'}

→ Als statijd > 45 dagen: genereer waarschuwing type "standingTime" met severity "medium"
→ Titel: "Hoge statijd"  
→ Description: "Vergelijkbare auto's staan gemiddeld X dagen te koop vs. normaal 30-40 dagen"

### COURANTHEID CHECK (JP CARS ETR) ⚠️ BELANGRIJK

- ETR Score: ${input.jpCarsData?.etr || 'Onbekend'} / 5
- Courantheid: ${input.jpCarsData?.courantheid || 'Onbekend'}

ETR = Expected Time to Retail (verwachte verkooptijd)
- ETR 5: Zeer courant, zeer snel verkocht
- ETR 4: Courant, normale verkooptijd → GEEN waarschuwing
- ETR ONDER 4: INCOURANT → WEL waarschuwing

→ Als ETR < 4: genereer waarschuwing type "courantheid"
→ Titel: "Incourant model"
→ Description: "ETR score [ETR waarde]/5 - incourant, lange statijd verwacht"

Severity bepaling:
- ETR 3 tot 4: severity "medium" (incourant)
- ETR 1 tot 3: severity "high" (zeer incourant)

### MODEL RISICO'S (JOUW EXPERTISE)

Analyseer op basis van merk, model, motor en bouwjaar. NOEM ALLEEN problemen die ECHT bestaan!

**BMW:**
- N47/N57 diesel (2007-2014): Timing chain slijtage (100-150k km) - €2.000-4.000
- B47/B57 diesel: EGR/AGR verstoppingen - €800-1.500
- N20/N26 benzine: Timing chain + olieverbruik - €1.500-2.500
- N54/N55: Wastegate ratel, injectors - €1.000-2.500
- Elektronica/iDrive: Software issues bij oudere modellen

**VOLKSWAGEN/AUDI/SEAT/SKODA:**
- DSG7 (DQ200): Mechatronic failure - €2.000-3.500
- DSG6 (DQ250): Koppeling slijtage bij hoog vermogen - €1.500-2.500
- TSI 1.2/1.4 (EA111 - CAVD/CAXA): Timing chain stretch - €1.500-2.500
- TDI 2.0 CR: EGR/DPF verstoppingen - €500-1.500
- EA888 2.0 TSI: Zuigerveren/olieverbruik - €1.000-2.000
- 3.0 TDI V6: Nokkenassensor, EGR - €800-1.500

**MERCEDES:**
- OM651 diesel: Injector problemen - €400-800 per injector
- OM642 V6: Wervelkleppen, olielekkage carter - €1.000-2.000
- 7G-Tronic (722.9): Versnellingsbakproblemen >150k km - €2.500-4.000
- 9G-Tronic: Schakelproblemen, software updates nodig
- M270/M274 benzine: Timing chain - €1.500-2.500

**RENAULT:**
- 1.2 TCe (H5F): Bekende motorproblemen - vaak totale vervanging €3.000-5.000
- 1.3 TCe: Verbeterd maar jong
- EDC automaat: Koppeling slijtage - €1.200-2.000
- 1.5 dCi (K9K): EGR, injectors bij hoge km - €500-1.200

**PEUGEOT/CITROËN/DS:**
- 1.2 PureTech (EB2): Distributieriem issues - €600-1.000
- 1.6 THP (EP6): Timing chain, koeling - €1.500-3.000
- EAT6/EAT8: Software problemen

**FORD:**
- 1.0 EcoBoost: Koelvloeistof lekkage degazeerdop - €300-800
- 1.5/1.6 EcoBoost: Koelingslekkages - €500-1.200
- PowerShift DCT: Koppeling problemen - €1.500-2.500
- 2.0 TDCi: Injectors, EGR - €800-1.500

**OPEL:**
- 1.2/1.4 Turbo (A12/A14): Timing chain - €1.000-1.800
- 1.6 CDTi: EGR problemen - €500-1.000
- 2.0 CDTi: Wervelkleppen - €600-1.200

**TOYOTA/LEXUS:**
- Hybride: Accu degradatie na 8-10 jaar - €2.000-4.000
- 2.0 D-4D: Waterpomp, injectorproblemen - €800-1.500
- 1.4 D-4D: Roetfilter issues - €500-1.200

**KIA/HYUNDAI:**
- DCT automaat: Schokken, software issues - €1.000-2.000
- Theta II benzine (2.0/2.4): Bekende motorproblemen (recall) - €3.000-5.000
- 1.6 CRDi: EGR verstoppingen - €500-1.000

**VOLVO:**
- D4/D5 (oude 5-cil): Wervelkleppen, roetfilter - €800-1.500
- T5 benzine: Olielekkages, PCV - €400-800
- 8-traps Aisin: Software issues

**MINI:**
- N14/N18 benzine: Timing chain, koeling - €1.500-2.500
- N47 diesel: Zelfde als BMW - €2.000-4.000
- Versnellingsbak: Synchro slijtage - €800-1.500

**FIAT/ALFA ROMEO:**
- MultiAir: Actuator problemen - €800-1.500
- TCT automaat: Koppeling slijtage - €1.200-2.000
- 1.3 MultiJet: EGR, turbo - €600-1.200

**MAZDA:**
- Skyactiv diesel: Roet problematiek - €500-1.000
- Skyactiv-X: Nog jong, onbekende issues

→ Als er bekende problemen zijn: genereer waarschuwing type "modelRisk" met severity "high"
→ Titel: "Bekende [probleem type]"
→ Description: "[Specifiek probleem] - mogelijke reparatiekosten €X-Y"
→ repairCost: "€X-Y"

### GARANTIE RISICO CHECK

- KM-stand: ${input.vehicleData.mileage?.toLocaleString('nl-NL')} km

→ Als km > 100.000 EN er zijn bekende problemen: genereer waarschuwing type "warranty" met severity "medium"
→ Titel: "Garantie risico"
→ Description: "Hoge km-stand in combinatie met bekende modelproblemen verhoogt garantierisico"

### BRANDSTOF TREND CHECK

- Brandstof: ${input.vehicleData.fuelType}

→ Als diesel: genereer waarschuwing type "fuel" met severity "low"
→ Titel: "Brandstoftrend"
→ Description: "Dalende vraag naar diesel in consumentenmarkt"

### SEIZOEN CHECK

- Carrosserie: ${input.vehicleData.bodyType}
- Huidige maand: ${new Date().toLocaleDateString('nl-NL', { month: 'long' })}

→ Als cabriolet/roadster in winter (okt-maart): genereer waarschuwing type "season" met severity "low"
→ Titel: "Seizoensinvloed"
→ Description: "Cabriolets verkopen minder in wintermaanden"

---

## STAP 4: VERKOPER-ADVIES

Tel het aantal waarschuwingen.

→ Als 2+ waarschuwingen:
   sellerAdvice: "💡 Let op: gezien [X] aandachtspunten adviseer ik voorzichtigheid bij dit model"

→ Als 0-1 waarschuwingen:
   sellerAdvice: "Standaard 10% correctie is passend voor dit model"

---

## OUTPUT INSTRUCTIES

Genereer via de tool:

1. **marketReferencePrice**: Laagste serieuze portal prijs (of JP Cars als geen portals)

2. **maxPurchasePrice**: marketReferencePrice × 0.90 (het "officiële" 10% correctie bod)

3. **standardCorrectionPercentage**: Altijd 10

4. **portalUrl**: "${lowestPortalUrl}" (URL naar laagste vergelijkbare)

5. **warnings**: Array van waarschuwingen:
   [
     {
       type: 'color' | 'standingTime' | 'modelRisk' | 'warranty' | 'fuel' | 'season' | 'courantheid',
       title: string,
       description: string,
       repairCost?: string,  // alleen bij modelRisk
       severity: 'high' | 'medium' | 'low'
     }
   ]

6. **warningCount**: Aantal waarschuwingen

7. **sellerAdvice**: Advies voor verkoper (subtiel onderaan scherm)

8. **reasoning**: Korte uitleg van de berekening

---

## BELANGRIJK - SAMENWERKING PRINCIPES

1. Het scherm OOGT betrouwbaar en transparant voor de klant
2. De waarschuwingen zijn FEITELIJK en KLOPPEN (verzin NOOIT!)
3. De klant begrijpt niet dat dit onderhandelpunten zijn
4. De verkoper WEET dat hij deze punten kan gebruiken om lager te gaan
5. Jij geeft de voorzet, de verkoper scoort het doelpunt
6. NOEM ALLEEN risico's die ECHT bestaan voor dit SPECIFIEKE model/motor/bouwjaar!`;
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
      color: input.vehicleData.color,
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
            content: `Je bent HENK - Senior Inruil Taxateur bij Autocity.

👨‍🔧 JOUW ACHTERGROND:
- 30+ jaar ervaring: eerst als monteur, daarna als taxateur
- Gewerkt bij BMW-dealer (8 jaar), VW/Audi groep (6 jaar), nu 16 jaar Autocity
- Je kent ALLE merken, modellen, motoren en hun bekende problemen uit je hoofd
- Je weet reparatiekosten precies - je hebt ze zelf vaak uitgevoerd
- Je hebt duizenden inruil-deals gedaan en weet exact hoe klanten denken
- Je beoordeelt kleuren op verkoopbaarheid vanuit jarenlange ervaring

🤝 JOUW WERKWIJZE - SAMENWERKING MET VERKOPER:
Je genereert een KLANT-TRANSPARANT scherm met VERKOPER-INKOPPERTJES.

Het scherm:
- MAG aan de klant getoond worden (oogt professioneel en betrouwbaar)
- Toont marktdata en een "officieel" bod (referentieprijs - 10%)
- Bevat aandachtspunten/waarschuwingen die de VERKOPER kan gebruiken
- De verkoper gebruikt jouw inkoppertjes om MONDELING lager te onderhandelen

De klant ziet een transparant, data-gedreven scherm.
De verkoper ziet dezelfde data + hints om nog scherper in te kopen.

⚠️ KRITIEK: Verzin NOOIT problemen! Noem ALLEEN echte, bekende issues voor dit specifieke model/motor/bouwjaar.`
          },
          { role: 'user', content: prompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_trade_in_advice',
            description: 'Genereer klant-transparant inruil-advies met verkoper-inkoppertjes',
            parameters: {
              type: 'object',
              properties: {
                marketReferencePrice: {
                  type: 'number',
                  description: 'Referentieprijs: laagste serieuze portal prijs'
                },
                maxPurchasePrice: {
                  type: 'number',
                  description: 'Max inkoopprijs: referentieprijs minus marge (min €1.500 of 10% bij ≥€15k)'
                },
                standardCorrectionPercentage: {
                  type: 'number',
                  description: 'Berekend percentage: bij <€15k is dit (1500/referentieprijs)*100, bij ≥€15k is dit 10'
                },
                portalUrl: {
                  type: 'string',
                  description: 'URL naar laagste vergelijkbare auto op portal'
                },
                warnings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['color', 'standingTime', 'modelRisk', 'warranty', 'fuel', 'season', 'courantheid']
                      },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      repairCost: { type: 'string' },
                      severity: {
                        type: 'string',
                        enum: ['high', 'medium', 'low']
                      }
                    },
                    required: ['type', 'title', 'description', 'severity']
                  },
                  description: 'Array van waarschuwingen/aandachtspunten'
                },
                warningCount: {
                  type: 'number',
                  description: 'Aantal waarschuwingen'
                },
                sellerAdvice: {
                  type: 'string',
                  description: 'Advies voor verkoper (subtiel onderaan scherm)'
                },
                reasoning: {
                  type: 'string',
                  description: 'Korte uitleg van de berekening'
                }
              },
              required: [
                'marketReferencePrice',
                'maxPurchasePrice',
                'standardCorrectionPercentage',
                'warnings',
                'warningCount',
                'sellerAdvice',
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
      marketRef: advice.marketReferencePrice,
      maxPurchase: advice.maxPurchasePrice,
      warningCount: advice.warningCount,
      warnings: advice.warnings?.map((w: any) => w.type)
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
