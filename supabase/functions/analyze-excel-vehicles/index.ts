import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExcelRow {
  [key: string]: unknown;
}

interface AnalyzedVehicle {
  rowIndex: number;
  make: string;
  model: string;
  variant: string | null;
  buildYear: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string | null;
  power: number | null;
  askingPrice: number | null;
  color: string | null;
  confidence: number;
  originalData: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headers, rows } = await req.json() as { headers: string[]; rows: ExcelRow[] };

    if (!headers || !rows || rows.length === 0) {
      throw new Error('Headers en rows zijn verplicht');
    }

    console.log(`📊 Analyzing ${rows.length} rows with ${headers.length} columns`);
    console.log(`📋 Headers: ${headers.join(', ')}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the data representation for AI
    // Support up to 150 vehicles per batch
    const dataForAI = rows.slice(0, 150).map((row, idx) => {
      const rowData: Record<string, string> = {};
      headers.forEach(h => {
        const val = row[h];
        if (val !== null && val !== undefined && val !== '') {
          rowData[h] = String(val);
        }
      });
      return { rowIndex: idx, ...rowData };
    });

    const systemPrompt = `JE IDENTITEIT:
Je bent een SENIOR AUTOMOTIVE TAXATIE EXPERT én EXCEL DATA SPECIALIST met 30+ jaar ervaring.

⚠️ KRITIEKE REGEL - GEEN SCHATTINGEN:
WIJ TAXEREN AUTO'S - ELKE FOUT KOST GELD.
- Als je iets NIET 100% ZEKER kan vinden → retourneer NULL
- NOOIT schatten, gokken of invullen op basis van aannames
- Alleen EXACTE data uit de bron extraheren

════════════════════════════════════════════════════════════════
FASE 1: STRUCTUUR ANALYSE (DOE DIT EERST!)
════════════════════════════════════════════════════════════════

VOORDAT je data extraheert, analyseer je de STRUCTUUR van de Excel:

1. BEKIJK ALLE KOLOMNAMEN (headers) die je krijgt
2. BEKIJK DE EERSTE 3-5 RIJEN om patronen te herkennen
3. MAAK EEN EXPLICIETE MAPPING - bepaal voor ELKE kolom:

   Voorbeelden van je gedachteproces:
   - "Kolom 'Registration date' bevat datums zoals '15/03/2021' → Hieruit haal ik het JAAR: 2021"
   - "Kolom 'Commercial Name' bevat 'Berlingo Fourgon Club L1' → Dit is model info"
   - "Kolom 'Km' bevat '45.231' → Dit is de kilometerstand"
   - "Er is GEEN aparte merkkolom, maar 'Berlingo' is altijd Citroën (dit weet ik als expert)"
   - "Kolom 'kW' bevat '110' → 110 * 1.36 = 150 PK"

4. IDENTIFICEER waar elk veld staat:
   - MERK: In welke kolom? Of impliciet in modelnaam? (Berlingo=Citroën, Golf=VW)
   - MODEL: Welke kolom bevat de modelnaam?
   - BOUWJAAR: Welke kolom? Is het een datum waaruit je het jaar haalt?
   - KILOMETERSTAND: Welke kolom? Let op decimaalformat (punt of komma)
   - BRANDSTOF: Welke kolom? Of in de voertuignaam?
   - VERMOGEN: In kW of PK? Welke kolom?
   - PRIJS: Welke kolom?

════════════════════════════════════════════════════════════════
FASE 2: EXACTE DATA EXTRACTIE
════════════════════════════════════════════════════════════════

Nu je WEET waar elk veld staat, extraheer je de data EXACT:

VOOR ELK VOERTUIG RETOURNEER:
{
  "rowIndex": nummer,
  "make": "Automerk - alleen als je 100% zeker bent, anders null",
  "model": "Model naam - exact zoals gevonden",
  "variant": "Variant/uitvoering of null",
  "buildYear": bouwjaar als getal - EXACT uit de data, NIET geschat,
  "mileage": kilometerstand als getal,
  "fuelType": "Benzine" | "Diesel" | "Elektrisch" | "Hybride" | "Plug-in Hybride" | "LPG" | null,
  "transmission": "Automaat" | "Handgeschakeld" | null,
  "bodyType": "Sedan" | "Hatchback" | "Station" | "SUV" | "Coupé" | "Cabrio" | "MPV" | null,
  "power": vermogen in PK (exact gevonden of berekend uit kW) of null,
  "powerSource": "direct" | "kW_conversie" | null,
  "askingPrice": prijs als getal of null,
  "color": kleur of null,
  "confidence": 0.0-1.0 (hoe zeker ben je van de COMPLETE extractie?),
  "originalData": de originele tekst/rij waaruit je dit hebt gehaald,
  "structureNotes": "Korte notitie over welke kolommen je hebt gebruikt"
}

BOUWJAAR EXTRACTIE (KRITIEK):
- Zoek in DATUM kolommen: "Registration date", "Datum eerste toelating", "1ère immatriculation", "First registration", "Erstzulassung"
- Datumformaten herkennen: "15/03/2021", "2021-03-15", "15-03-2021", "15.03.2021", "March 2021"
- Als je een datum vindt zoals "15/03/2021" → jaar = 2021
- Zoek ook in kolommen: "Year", "Jaar", "Année", "Baujahr", "Anno", "Bouwjaar"
- Als GEEN datum of jaar te vinden → buildYear = null (NIET SCHATTEN!)

MERK HERKENNING (als expert):
Je KENT deze associaties uit ervaring:
- Berlingo, C3, C4, C5, DS → Citroën/DS
- Golf, Polo, Passat, Tiguan, Caddy → Volkswagen
- A3, A4, A6, Q3, Q5 → Audi
- 1 Serie, 3 Serie, 5 Serie, X1, X3 → BMW
- A-Klasse, C-Klasse, E-Klasse, Vito, Sprinter → Mercedes-Benz
- Focus, Fiesta, Transit, Mondeo → Ford
- 308, 3008, Expert, Partner → Peugeot
- Clio, Megane, Kangoo, Trafic → Renault

Als je een model NIET 100% zeker aan een merk kan koppelen → make = null

REGELS:
- GEEN SCHATTINGEN - alleen exacte data
- Als iets ontbreekt → null (niet invullen met aannames)
- Sla lege rijen en headers over
- Retourneer ALLEEN een JSON array
- Analyseer ALLE ${dataForAI.length} voertuigen`;

    const userPrompt = `════════════════════════════════════════════════════════════════
EXCEL STRUCTUUR - ANALYSEER DIT EERST:
════════════════════════════════════════════════════════════════

KOLOMNAMEN: ${headers.join(' | ')}

════════════════════════════════════════════════════════════════
DATA (${dataForAI.length} rijen):
════════════════════════════════════════════════════════════════
${JSON.stringify(dataForAI, null, 2)}

OPDRACHT:
1. Analyseer EERST de structuur - welke kolom bevat welke info?
2. Extraheer daarna EXACT de voertuiggegevens
3. Geen schattingen - alleen wat je 100% zeker kan vinden
4. Retourneer ALLEEN een JSON array`;

    console.log(`🤖 Calling Gemini 2.5 Flash to analyze ${dataForAI.length} vehicles...`);
    const startTime = Date.now();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 65536,
      }),
    });

    console.log(`⏱️ AI API response in ${Date.now() - startTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer het later opnieuw' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Geen tegoed meer, voeg credits toe' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    const finishReason = aiResponse.choices?.[0]?.finish_reason;

    if (!content) {
      throw new Error('Geen response van AI ontvangen');
    }

    console.log(`📝 AI response received, finish_reason: ${finishReason}, content length: ${content.length}`);

    // Check if response was truncated
    if (finishReason === 'length') {
      console.warn('⚠️ AI response was truncated due to max_tokens limit');
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Clean up the string
    jsonStr = jsonStr.trim();
    if (!jsonStr.startsWith('[')) {
      const arrayStart = jsonStr.indexOf('[');
      if (arrayStart !== -1) {
        jsonStr = jsonStr.substring(arrayStart);
      }
    }

    let vehicles: AnalyzedVehicle[];
    try {
      vehicles = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('🔧 Attempting to recover partial JSON...');
      
      // Try to recover partial JSON by finding the last complete object
      const lastCompleteObject = jsonStr.lastIndexOf('},');
      if (lastCompleteObject > 0) {
        const recoveredJson = jsonStr.substring(0, lastCompleteObject + 1) + ']';
        try {
          vehicles = JSON.parse(recoveredJson);
          console.log(`✅ Recovered ${vehicles.length} vehicles from partial JSON`);
        } catch {
          // Try finding last complete object without comma
          const lastObject = jsonStr.lastIndexOf('}');
          if (lastObject > 0) {
            const recovered2 = jsonStr.substring(0, lastObject + 1) + ']';
            try {
              vehicles = JSON.parse(recovered2);
              console.log(`✅ Recovered ${vehicles.length} vehicles from partial JSON (method 2)`);
            } catch {
              console.error('Content preview:', jsonStr.substring(0, 1000));
              throw new Error('Kon AI response niet parsen, ook niet na recovery poging');
            }
          } else {
            throw new Error('Kon AI response niet parsen');
          }
        }
      } else {
        console.error('Content preview:', jsonStr.substring(0, 1000));
        throw new Error('Kon AI response niet parsen');
      }
    }

    // Debug: Log alle voertuigen VOOR validatie om te zien wat er mis gaat
    console.log(`\n🔍 DEBUG - Eerste 5 voertuigen RAW van AI:`);
    vehicles.slice(0, 5).forEach((v, i) => {
      console.log(`  ${i+1}. make="${v.make}" | model="${v.model}" | year=${v.buildYear} | km=${v.mileage} | fuel="${v.fuelType}"`);
      console.log(`     original: "${String(v.originalData || '').substring(0, 100)}"`);
    });

    // Validate and clean the results - mileage can be 0 for new cars
    const currentYear = new Date().getFullYear();
    const validVehicles = vehicles.filter(v => 
      v.make && 
      v.model && 
      v.buildYear && v.buildYear > 1990 && v.buildYear <= currentYear + 1 &&
      (v.mileage !== undefined && v.mileage >= 0) // 0 km is valid for new cars
    );

    // Debug: Log gefaalde voertuigen met reden
    const failedVehicles = vehicles.filter(v => 
      !v.make || 
      !v.model || 
      !v.buildYear || v.buildYear <= 1990 || v.buildYear > currentYear + 1 ||
      v.mileage === undefined || v.mileage < 0
    );

    if (failedVehicles.length > 0) {
      console.log(`\n❌ DEBUG - ${failedVehicles.length} voertuigen GEFAALD:`);
      failedVehicles.slice(0, 15).forEach((v, i) => {
        const reasons: string[] = [];
        if (!v.make) reasons.push('GEEN MAKE');
        if (!v.model) reasons.push('GEEN MODEL');
        if (!v.buildYear) reasons.push('GEEN JAAR');
        else if (v.buildYear <= 1990) reasons.push(`JAAR TE OUD: ${v.buildYear}`);
        else if (v.buildYear > currentYear + 1) reasons.push(`JAAR TOEKOMST: ${v.buildYear}`);
        if (v.mileage === undefined) reasons.push('GEEN KM');
        else if (v.mileage < 0) reasons.push(`KM NEGATIEF: ${v.mileage}`);
        
        console.log(`  ${i+1}. [${reasons.join(' | ')}]`);
        console.log(`     make="${v.make}", model="${v.model}", year=${v.buildYear}, km=${v.mileage}`);
        console.log(`     original: "${String(v.originalData || '').substring(0, 80)}..."`);
      });
    }

    console.log(`\n📤 Verzonden: ${dataForAI.length} rijen naar AI`);
    console.log(`📥 Ontvangen: ${vehicles.length} voertuigen van AI`);
    console.log(`✅ Geldig: ${validVehicles.length} voertuigen na validatie`);
    console.log(`❌ Gefaald: ${failedVehicles.length} voertuigen\n`);

    return new Response(JSON.stringify({ 
      vehicles: validVehicles,
      totalParsed: vehicles.length,
      totalValid: validVehicles.length,
      skipped: vehicles.length - validVehicles.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-excel-vehicles:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Onbekende fout bij analyse' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
