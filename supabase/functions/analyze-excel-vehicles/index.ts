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
    const dataForAI = rows.slice(0, 100).map((row, idx) => {
      const rowData: Record<string, string> = {};
      headers.forEach(h => {
        const val = row[h];
        if (val !== null && val !== undefined && val !== '') {
          rowData[h] = String(val);
        }
      });
      return { rowIndex: idx, ...rowData };
    });

    const systemPrompt = `Je bent een Senior Automotive Taxatie Expert die werkt voor een Nederlands auto CRM systeem.

Het CRM systeem geeft je een bulk import in de vorm van een Excel lijst. Je taak is om per kolom en per voertuig de juiste gegevens te herkennen en te structureren.

JE EXPERTISE:
- Je herkent automatisch alle automerken, modellen, varianten en uitvoeringen
- Je begrijpt motorcodes (TFSI, TDI, TSI, CDI, etc.) en wat ze betekenen voor brandstof
- Je herkent transmissietypes (S Tronic, DSG, Tiptronic = Automaat)
- Je kan bouwjaren, kilometerstanden en prijzen uit verschillende formaten halen
- Je denkt als een mens - een automotive professional die naar data kijkt

VERMOGEN EXTRACTIE (KRITIEK VOOR JP CARS):
JP Cars heeft vermogen (PK) nodig voor nauwkeurige taxaties. Zoek ALTIJD naar vermogen:
1. Directe vermelding: "150pk", "150 pk", "150 PK", "150hp", "150 HP"
2. kW naar PK: "110 kW" = 110 * 1.36 = ~150 PK
3. Motorcodes met standaard vermogen:
   - Audi: "35 TFSI" = 150pk, "40 TFSI" = 190pk, "45 TFSI" = 245pk, "55 TFSI" = 340pk
   - Audi: "30 TDI" = 136pk, "35 TDI" = 163pk, "40 TDI" = 204pk, "50 TDI" = 286pk
   - BMW: "18i/20i" = 136-156pk, "30i" = 245pk, "40i" = 340pk, "M40i" = 340-387pk
   - BMW: "18d/20d" = 150pk, "30d" = 265pk, "40d" = 340pk
   - Mercedes: "180" = 136pk, "200" = 163-184pk, "300" = 245-258pk, "400" = 333pk
   - VW/Skoda: "1.0 TSI" = 95-115pk, "1.5 TSI" = 150pk, "2.0 TSI" = 190-245pk
   - VW/Skoda: "2.0 TDI" = 115-200pk (meestal 150pk)
   - Volvo: "T4" = 190pk, "T5" = 250pk, "T6" = 310pk, "T8" = 390pk
   - Volvo: "D3" = 150pk, "D4" = 190pk, "D5" = 235pk
4. Cilinder/motor aanduiding: "2.0" diesel vaak ~150pk, "3.0" diesel vaak ~245-286pk
5. Als je het ECHT niet kan vinden, laat null maar geef lagere confidence

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
  "power": vermogen in PK als getal (PROBEER ALTIJD te bepalen, zie motorcodes hierboven),
  "powerSource": "direct" | "kW_conversie" | "motorcode" | "geschat" | null,
  "askingPrice": prijs als getal of null,
  "color": kleur of null,
  "confidence": 0.0-1.0 betrouwbaarheidsscore (lager als vermogen geschat),
  "originalData": originele beschrijving/tekst waar je dit uit hebt gehaald
}

BELANGRIJKE REGELS:
- Wees flexibel met kolomnamen - leveranciers gebruiken allemaal verschillende namen
- PROBEER ALTIJD vermogen te bepalen - dit is cruciaal voor JP Cars taxatie
- Als je vermogen schat op basis van motorcode, geef powerSource: "motorcode"
- Als je iets niet zeker weet, geef een lagere confidence score
- Sla rijen over die geen auto's lijken te zijn (lege rijen, headers, etc.)
- Geef ALLEEN een JSON array terug, geen andere tekst`;

    const userPrompt = `KOLOMMEN IN DIT EXCEL BESTAND:
${headers.join(' | ')}

DATA (${dataForAI.length} rijen):
${JSON.stringify(dataForAI, null, 2)}

Analyseer deze data en extraheer de voertuiggegevens. Retourneer ALLEEN een JSON array.`;

    console.log('🤖 Calling AI to analyze vehicles...');

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
      }),
    });

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

    if (!content) {
      throw new Error('Geen response van AI ontvangen');
    }

    console.log('📝 AI response received, parsing JSON...');

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
      console.error('Content was:', jsonStr.substring(0, 500));
      throw new Error('Kon AI response niet parsen');
    }

    // Validate and clean the results - mileage can be 0 for new cars
    const validVehicles = vehicles.filter(v => 
      v.make && 
      v.model && 
      v.buildYear && v.buildYear > 1990 && v.buildYear <= new Date().getFullYear() + 1 &&
      (v.mileage !== undefined && v.mileage >= 0) // 0 km is valid for new cars
    );

    console.log(`✅ Successfully analyzed ${validVehicles.length} vehicles out of ${vehicles.length} parsed`);

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
