import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedVehicle {
  brand: string | null;
  model: string | null;
  variant: string | null;
  buildYear: number | null;
  fuelType: string | null;
  transmission: string | null;
  bodyType: string | null;
  power: number | null;
  confidence: number;
  originalDescription: string;
}

interface ParseRequest {
  descriptions: string[];
}

const KNOWN_BRANDS = [
  'Abarth', 'Alfa Romeo', 'Audi', 'BMW', 'Citroën', 'Cupra', 'Dacia', 'DS',
  'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jaguar', 'Jeep', 'Kia', 'Land Rover',
  'Lexus', 'Mazda', 'Mercedes-Benz', 'Mercedes', 'Mini', 'Mitsubishi', 'Nissan',
  'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Skoda', 'Škoda', 'Suzuki',
  'Tesla', 'Toyota', 'Volkswagen', 'VW', 'Volvo'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descriptions }: ParseRequest = await req.json();

    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'descriptions array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const limitedDescriptions = descriptions.slice(0, 20);
    
    console.log(`Parsing ${limitedDescriptions.length} vehicle descriptions`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      // Fallback to simple regex parsing if no API key
      console.log('No LOVABLE_API_KEY, using regex parsing');
      const results = limitedDescriptions.map(desc => parseWithRegex(desc));
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI for better parsing
    const prompt = `Je bent een expert in het herkennen van auto's uit beschrijvingen.
Analyseer de volgende voertuigbeschrijvingen en extraheer de gegevens.

Bekende merken: ${KNOWN_BRANDS.join(', ')}

Voor elke beschrijving, extraheer:
- brand: Het automerk (bijv. BMW, Volkswagen, Audi)
- model: Het model (bijv. 3 Serie, Golf, A4)
- variant: De uitvoering/variant (bijv. Touring, Sportback, M Sport)
- buildYear: Het bouwjaar (4 cijfers, bijv. 2020)
- fuelType: Brandstof (Benzine, Diesel, Hybride, Elektrisch, Plug-in Hybride)
- transmission: Versnelling (Automaat, Handgeschakeld)
- bodyType: Carrosserie (Sedan, Hatchback, SUV, Station, Coupé, Cabrio)
- power: Vermogen in PK als nummer (bijv. 150)
- confidence: Betrouwbaarheidsscore 0-1

Beschrijvingen:
${limitedDescriptions.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Retourneer ALLEEN een JSON array met objecten, geen andere tekst.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Je bent een voertuig-data parser. Antwoord alleen met valide JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      // Fallback to regex
      const results = limitedDescriptions.map(desc => parseWithRegex(desc));
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content.substring(0, 500));

    // Parse AI response
    let parsedResults: ParsedVehicle[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiResults = JSON.parse(jsonMatch[0]);
        parsedResults = limitedDescriptions.map((desc, i) => ({
          ...aiResults[i],
          originalDescription: desc,
          confidence: aiResults[i]?.confidence || 0.5,
        }));
      }
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      // Fallback to regex
      parsedResults = limitedDescriptions.map(desc => parseWithRegex(desc));
    }

    // Ensure all descriptions have results
    const results = limitedDescriptions.map((desc, i) => 
      parsedResults[i] || parseWithRegex(desc)
    );

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing vehicle descriptions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback regex parser
function parseWithRegex(description: string): ParsedVehicle {
  const desc = description.trim();
  const result: ParsedVehicle = {
    brand: null,
    model: null,
    variant: null,
    buildYear: null,
    fuelType: null,
    transmission: null,
    bodyType: null,
    power: null,
    confidence: 0.3,
    originalDescription: desc,
  };

  // Find brand
  for (const brand of KNOWN_BRANDS) {
    if (desc.toLowerCase().includes(brand.toLowerCase())) {
      result.brand = brand === 'VW' ? 'Volkswagen' : brand;
      result.confidence += 0.2;
      break;
    }
  }

  // Find year (4 digits starting with 19 or 20)
  const yearMatch = desc.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.buildYear = parseInt(yearMatch[0]);
    result.confidence += 0.1;
  }

  // Find fuel type
  const fuelPatterns = [
    { pattern: /\b(benzine|petrol)\b/i, value: 'Benzine' },
    { pattern: /\b(diesel)\b/i, value: 'Diesel' },
    { pattern: /\b(elektrisch|electric|ev|bev)\b/i, value: 'Elektrisch' },
    { pattern: /\b(hybride|hybrid|phev|plug.?in)\b/i, value: 'Hybride' },
  ];
  for (const { pattern, value } of fuelPatterns) {
    if (pattern.test(desc)) {
      result.fuelType = value;
      result.confidence += 0.1;
      break;
    }
  }

  // Find transmission
  if (/\b(automaat|automatic|aut|dsg|tiptronic|cvt)\b/i.test(desc)) {
    result.transmission = 'Automaat';
    result.confidence += 0.1;
  } else if (/\b(handgeschakeld|manual|schakelbak)\b/i.test(desc)) {
    result.transmission = 'Handgeschakeld';
    result.confidence += 0.1;
  }

  // Find body type
  const bodyPatterns = [
    { pattern: /\b(touring|wagon|station|avant|variant|break)\b/i, value: 'Station' },
    { pattern: /\b(sedan|limousine|saloon)\b/i, value: 'Sedan' },
    { pattern: /\b(hatchback|5d|3d)\b/i, value: 'Hatchback' },
    { pattern: /\b(suv|crossover|x\d|q\d)\b/i, value: 'SUV' },
    { pattern: /\b(sportback|coupe|coupé)\b/i, value: 'Coupé' },
    { pattern: /\b(cabrio|convertible|roadster)\b/i, value: 'Cabrio' },
  ];
  for (const { pattern, value } of bodyPatterns) {
    if (pattern.test(desc)) {
      result.bodyType = value;
      break;
    }
  }

  // Find power (PK/HP)
  const powerMatch = desc.match(/(\d{2,3})\s*(?:pk|hp|ps)/i);
  if (powerMatch) {
    result.power = parseInt(powerMatch[1]);
  }

  // Try to extract model (after brand, before year or fuel)
  if (result.brand) {
    const brandIndex = desc.toLowerCase().indexOf(result.brand.toLowerCase());
    const afterBrand = desc.substring(brandIndex + result.brand.length).trim();
    const modelMatch = afterBrand.match(/^([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)/);
    if (modelMatch) {
      result.model = modelMatch[1].trim();
      result.confidence += 0.1;
    }
  }

  return result;
}
