import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Robust JSON extraction for Claude responses
function parseClaudeResponse(text: string): any {
  try {
    let clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const f = clean.indexOf("["); const l = clean.lastIndexOf("]");
    if (f !== -1 && l !== -1) clean = clean.substring(f, l + 1);
    return JSON.parse(clean);
  } catch (e) {
    console.warn("❌ parseClaudeResponse error:", e);
    return null;
  }
}
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
  options: string[];  // Gedetecteerde opties voor JP Cars
}

const parseExcelVehiclesTool = {
  name: 'parse_excel_vehicles',
  description: 'Parseer voertuigen uit een Excel-export en retourneer een gestructureerde array.',
  input_schema: {
    type: 'object',
    properties: {
      vehicles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rowIndex: { type: 'number' },
            make: { type: 'string' },
            model: { type: 'string' },
            variant: { type: ['string', 'null'] },
            buildYear: { type: 'number' },
            mileage: { type: 'number' },
            fuelType: { type: 'string' },
            transmission: { type: 'string' },
            bodyType: { type: ['string', 'null'] },
            power: { type: ['number', 'null'] },
            powerSource: { type: ['string', 'null'] },
            askingPrice: { type: ['number', 'null'] },
            color: { type: ['string', 'null'] },
            confidence: { type: 'number' },
            originalData: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } }
          },
          required: ['rowIndex', 'make', 'model', 'buildYear', 'mileage', 'fuelType', 'transmission', 'confidence', 'originalData', 'options']
        }
      }
    },
    required: ['vehicles']
  }
};

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

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
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
  "originalData": originele beschrijving/tekst waar je dit uit hebt gehaald,
  "options": ["optie1", "optie2"]
}

OPTIES DETECTIE (CRUCIAAL - ALLEEN JP CARS WHITELIST):
Je bent een automotive expert met kennis van auto-opties in ALLE talen (NL, EN, DE, FR, IT, ES, PL, etc.).
Detecteer opties uit ALLE kolommen, maar retourneer ALLEEN waarden uit deze EXACTE JP Cars whitelist:

**JP CARS TOEGESTANE OPTIES (gebruik EXACT deze schrijfwijze):**
"panorama roof", "sunroof", "harman kardon", "bose", "bang olufsen", "burmester", "meridian", "jbl", "focal", "premium audio",
"leather", "alcantara", "heated seats", "ventilated seats", "electric seats", "sport seats", "massage seats",
"navigation", "head up display", "360 camera", "rear camera", "adaptive cruise control", "lane assist", "blind spot monitor",
"LED", "matrix LED", "laser lights", "adaptive lights", "night vision",
"S-Line", "M sport", "AMG", "R-Line", "GT Line", "RS Line", "N Line", "F Sport", "FR", "GTI", "GTD", "GTE",
"alloy wheels", "19 inch wheels", "20 inch wheels", "21 inch wheels",
"tow bar", "air suspension", "keyless entry", "electric tailgate", "privacy glass",
"heated steering wheel", "wireless charging", "apple carplay", "android auto", "digital cockpit", "7 seater", "long range"

**MEERTALIGE DETECTIE REGELS:**
- Detecteer in ELKE taal en vertaal naar bovenstaande Engelse whitelist
- Voorbeelden: "Schiebedach"/"toit panoramique"/"panoramadak" → "panorama roof"
- "Leder"/"cuir"/"leer" → "leather", "Sitzheizung"/"sièges chauffants"/"stoelverwarming" → "heated seats"
- "Anhängerkupplung"/"attelage"/"trekhaak" → "tow bar"
- Kijk OOK in model/variant namen (bijv. "A4 S-Line" → "S-Line", "320i M Sport" → "M sport")
- RETOURNEER ALLEEN opties die EXACT in de whitelist staan - GEEN custom waarden!
- Als een gedetecteerde optie NIET in de whitelist staat, NEGEER deze volledig

BELANGRIJKE REGELS:
- HERLEID HET MERK uit je automotive kennis als het niet expliciet is genoemd
- PROBEER ALTIJD vermogen te bepalen - dit is cruciaal voor JP Cars taxatie
- DETECTEER ALTIJD opties uit beschrijvingen EN variant namen (bijv. "A4 S-Line" → options: ["S-Line"])
- Als je iets niet zeker weet, geef een lagere confidence score
- Sla rijen over die geen auto's lijken te zijn (lege rijen, headers, etc.)
- Geef ALLEEN een JSON array terug, geen andere tekst

KRITIEK: Je analyseert ${dataForAI.length} voertuigen. Retourneer ALLE ${dataForAI.length} voertuigen in je response. Stop NOOIT halverwege.`;

    const userPrompt = `KOLOMMEN IN DIT EXCEL BESTAND:
${headers.join(' | ')}

DATA (${dataForAI.length} rijen):
${JSON.stringify(dataForAI, null, 2)}

Analyseer deze data en extraheer de voertuiggegevens. Retourneer ALLEEN een JSON array.`;

    console.log(`🤖 Calling Claude Sonnet to analyze ${dataForAI.length} vehicles...`);
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [parseExcelVehiclesTool],
        tool_choice: { type: 'tool', name: 'parse_excel_vehicles' },
      }),
    });

    console.log(`⏱️ Claude API response in ${Date.now() - startTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt, probeer het later opnieuw' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Claude response received');

    // Extract tool_use block
    const toolUse = (data.content || []).find((b: any) => b.type === 'tool_use' && b.name === 'parse_excel_vehicles');
    let vehicles: AnalyzedVehicle[];

    if (toolUse && toolUse.input && Array.isArray(toolUse.input.vehicles)) {
      vehicles = toolUse.input.vehicles;
    } else {
      // Fallback: parse text blocks as JSON
      const textBlocks = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
      console.warn('⚠️ No tool_use found, attempting text parse');
      const parsed = parseClaudeResponse(textBlocks);
      if (Array.isArray(parsed)) {
        vehicles = parsed;
      } else if (parsed && Array.isArray(parsed.vehicles)) {
        vehicles = parsed.vehicles;
      } else {
        throw new Error('Geen geldige voertuigen van AI ontvangen');
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
