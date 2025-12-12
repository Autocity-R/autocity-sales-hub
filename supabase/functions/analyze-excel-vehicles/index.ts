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
Je bent een SENIOR AUTOMOTIVE TAXATIE EXPERT én EXCEL DATA SPECIALIST.

ALS EXCEL DATA SPECIALIST:
- Je ontvangt Excel lijsten van diverse leveranciers in ELKE taal en ELKE opbouw
- Je kijkt DWARS DOOR de structuur heen - kolommen, rijvolgorde, headers, taal: het maakt niet uit
- Je BEGRIJPT de data ongeacht hoe het gepresenteerd wordt
- Je focust ALLEEN op wat belangrijk is: de voertuigdata extraheren

ALS AUTOMOTIVE EXPERT (30+ jaar ervaring):
- Je KENT alle automerken, modellen, motoren en uitvoeringen WERELDWIJD
- Als je een modelnaam ziet, WEET je welk merk erbij hoort - dit is jouw dagelijkse werk
- Je herkent motorcodes, uitvoeringen, transmissies, brandstofsoorten automatisch
- Je denkt als een EXPERT die naar data kijkt, niet als een systeem dat regels volgt
- Gebruik je VOLLEDIGE kennis - je bent niet beperkt

JE DOEL:
Elk voertuig uit de Excel correct terugkoppelen met alle relevante data.

BOUWJAAR EXTRACTIE (KRITIEK - LEES DIT GOED):
Leveranciers gebruiken diverse velden voor bouwjaar/registratiedatum:
- "Registration date", "Datum eerste toelating", "Eerste registratie", "Bouwjaar", "Year", "Jaar", "Date of first registration"
- Datumformaten die je MOET herkennen:
  * "15-03-2020" → bouwjaar = 2020
  * "2020-03-15" → bouwjaar = 2020
  * "03/15/2020" → bouwjaar = 2020
  * "03/2020" → bouwjaar = 2020
  * "2020" → bouwjaar = 2020
  * Excel nummer (bijv. 44621) → bereken terug naar datum → extract jaar
- JE RETOURNEERT ALTIJD EEN 4-CIJFERIG JAAR (bijv. 2020), NOOIT een datum
- Als een kolom "date" of "datum" bevat en een jaar zichtbaar is, gebruik dat jaar

VERMOGEN EXTRACTIE (KRITIEK VOOR JP CARS):
JP Cars heeft vermogen (PK) nodig voor nauwkeurige taxaties. Zoek ALTIJD naar vermogen:
1. Directe vermelding: "150pk", "150 pk", "150 PK", "150hp", "150 HP"
2. kW naar PK: "110 kW" = 110 * 1.36 = ~150 PK
3. Motorcodes - jij kent de standaard vermogens bij motorcodes (TFSI, TDI, TSI, etc.)
4. Als je het ECHT niet kan vinden, laat null maar geef lagere confidence

RETOURNEER VOOR ELK VOERTUIG:
{
  "rowIndex": nummer,
  "make": "Automerk (standaard schrijfwijze: Audi, BMW, Mercedes-Benz, Volkswagen, etc.)",
  "model": "Model naam (bijv. A4, 3 Serie, C-Klasse, Golf)",
  "variant": "Variant/uitvoering indien bekend (bijv. Sportback, Touring, Avant)",
  "buildYear": bouwjaar als getal,
  "mileage": kilometerstand als getal (zonder punten/komma's),
  "fuelType": "Benzine" | "Diesel" | "Elektrisch" | "Hybride" | "Plug-in Hybride" | "LPG",
  "transmission": "Automaat" | "Handgeschakeld",
  "bodyType": "Sedan" | "Hatchback" | "Station" | "SUV" | "Coupé" | "Cabrio" | "MPV" | null,
  "power": vermogen in PK als getal (PROBEER ALTIJD te bepalen met je expertise),
  "powerSource": "direct" | "kW_conversie" | "motorcode" | "geschat" | null,
  "askingPrice": prijs als getal of null,
  "color": kleur of null,
  "confidence": 0.0-1.0 betrouwbaarheidsscore,
  "originalData": originele beschrijving/tekst waar je dit uit hebt gehaald
}

BELANGRIJKE REGELS:
- HERLEID HET MERK uit je automotive kennis als het niet expliciet is genoemd
- PROBEER ALTIJD vermogen te bepalen - dit is cruciaal voor JP Cars taxatie
- Als je iets niet zeker weet, geef een lagere confidence score
- Sla rijen over die geen auto's lijken te zijn (lege rijen, headers, etc.)
- Geef ALLEEN een JSON array terug, geen andere tekst

KRITIEK: Je analyseert ${dataForAI.length} voertuigen. Retourneer ALLE ${dataForAI.length} voertuigen in je response. Stop NOOIT halverwege.`;

    const userPrompt = `KOLOMMEN IN DIT EXCEL BESTAND:
${headers.join(' | ')}

DATA (${dataForAI.length} rijen):
${JSON.stringify(dataForAI, null, 2)}

Analyseer deze data en extraheer de voertuiggegevens. Retourneer ALLEEN een JSON array.`;

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
    } catch (parseError: unknown) {
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

    // Fallback: Probeer bouwjaar te extracten uit originalData als het ontbreekt
    const currentYear = new Date().getFullYear();
    const extractYearFromString = (str: string): number | null => {
      if (!str) return null;
      // Match 4-digit year between 1990-2030
      const yearMatch = str.match(/\b(19[9][0-9]|20[0-2][0-9]|2030)\b/);
      if (yearMatch) return parseInt(yearMatch[1], 10);
      // Match dd-mm-yyyy or yyyy-mm-dd patterns
      const dateMatch = str.match(/(\d{2})[.\-\/](\d{2})[.\-\/](\d{4})/);
      if (dateMatch) return parseInt(dateMatch[3], 10);
      const dateMatch2 = str.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
      if (dateMatch2) return parseInt(dateMatch2[1], 10);
      return null;
    };

    // Apply fallback for missing buildYear
    vehicles.forEach(v => {
      if (!v.buildYear || v.buildYear <= 1990 || v.buildYear > currentYear + 1) {
        const extractedYear = extractYearFromString(v.originalData || '');
        if (extractedYear && extractedYear > 1990 && extractedYear <= currentYear + 1) {
          console.log(`🔧 Fallback: Extracted year ${extractedYear} from "${String(v.originalData).substring(0, 50)}..."`);
          v.buildYear = extractedYear;
        }
      }
    });

    // Validate and clean the results - mileage can be 0 for new cars
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
