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

    const systemPrompt = `Je bent een Senior Automotive Taxatie Expert die werkt voor een Nederlandse autohandelaar CRM.

JE TAAK:
Je ontvangt een Excel export van een autoleverancier. Analyseer de COMPLETE dataset als een ervaren professional.

BELANGRIJK - BEKIJK ALLE KOLOMMEN:
- Je krijgt alle kolomnamen EN alle data per rij
- Het bouwjaar staat VAAK in een datum kolom zoals "Registration date", "Datum eerste toelating", "1ère immatriculation"
- Als je een datum ziet zoals "15/03/2021" → het JAAR is 2021
- Kilometerstand kan in kolommen staan als "Km", "Odometer", "Kilometerstand"
- Prijs kan in "Net Value", "Catalogprijs", "Prix" staan

WAT JE LEVERT PER VOERTUIG:
- make: Het automerk (Audi, BMW, Mercedes-Benz, Volkswagen, Citroën, Peugeot, Renault, etc.)
- model: Het model (A4, Golf, C3, 208, Berlingo, etc.)
- buildYear: Bouwjaar (4 cijfers) - haal uit Registration date kolom!
- mileage: Kilometerstand (alleen het getal)
- fuelType: Benzine / Diesel / Elektrisch / Hybride / Plug-in Hybride
- transmission: Automaat / Handgeschakeld
- bodyType: Sedan / Hatchback / Station / SUV / Coupé / Cabrio / MPV
- power: Vermogen in PK (als bekend, converteer kW × 1.36)
- askingPrice: Vraagprijs (als aanwezig)
- confidence: 0.0-1.0 betrouwbaarheidsscore
- originalData: De originele voertuigomschrijving

MERK HERKENNING (je expert kennis):
- "2008", "208", "308", "3008", "Partner", "Expert" → Peugeot
- "C3", "C4", "C5", "Berlingo", "Jumpy" → Citroën
- "Golf", "Polo", "Passat", "Caddy", "Transporter" → Volkswagen
- "A3", "A4", "Q3", "Q5" → Audi
- "Série 1", "Série 3", "X1", "X2", "X3" → BMW
- "Clio", "Megane", "Kangoo", "Trafic" → Renault
- "Focus", "Fiesta", "Transit", "Mondeo" → Ford
- "A-Klasse", "C-Klasse", "Vito", "Sprinter" → Mercedes-Benz

REGELS:
- Analyseer ALLE ${dataForAI.length} rijen
- GEEN schattingen - als je iets niet kan vinden → null
- Retourneer ALLEEN een JSON array, geen uitleg`;

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
