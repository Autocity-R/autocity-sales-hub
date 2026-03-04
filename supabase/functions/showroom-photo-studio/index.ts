import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOWROOM_PROMPT = `You are given TWO images:

IMAGE 1 (Reference Studio): This is the EXACT showroom environment you must replicate. Study every detail: the dark charcoal walls, the warm gold/cream LED light strips along the ceiling edges, the illuminated "AUTOCITY" logo on the back wall, the polished dark floor with reflections, and the overall lighting atmosphere.

IMAGE 2 (Vehicle Photo): This is the vehicle you must place into the studio.

YOUR TASK: Place the vehicle from Image 2 into the EXACT same showroom environment as Image 1.

CRITICAL RULES — VEHICLE INTEGRITY:
- Do NOT change the vehicle color, wheels, badges, trim, headlights, body shape, proportions, or license plate holders.
- The vehicle must remain IDENTICAL to Image 2 in every detail.
- Any existing AutoCity license plate holders or branding on the car must be preserved exactly.
- Do NOT apply any perspective correction or angle change. Keep the vehicle at the EXACT same camera angle as in Image 2.
- Do NOT reframe, zoom, or crop the vehicle differently than it appears in Image 2.

CRITICAL RULES — STUDIO CONSISTENCY:
- The showroom must look EXACTLY like Image 1. Same wall color, same floor, same LED strips, same logo.
- The "AUTOCITY" logo text and style must match Image 1 precisely. Do NOT redesign or reimagine the logo.
- The warm gold/cream colored LED light strips must match Image 1 exactly.
- The floor finish and reflectiveness must match Image 1.

IMAGE QUALITY ENHANCEMENT (apply to the vehicle):
- Correct white balance (remove any green/yellow warehouse lighting cast from the original photo).
- Reduce noise and improve clarity.
- Increase contrast slightly.
- Sharpen subtly.
- Recover paint reflections while keeping vehicle color accurate.

SHADOWS & REFLECTIONS:
- Add natural contact shadows under the tires matching the shadow style in Image 1.
- Add a subtle floor reflection of the vehicle matching the reflection style in Image 1 (low opacity, blurred, faded).

VEHICLE PLACEMENT:
- Place the vehicle naturally on the floor plane at a similar position and scale as the car in Image 1.
- The vehicle should be centered and fill a similar proportion of the frame as in Image 1.

INTERIOR PHOTO HANDLING:
If Image 2 is an interior/cabin photo (not an exterior shot):
- Do NOT place it inside the studio.
- Instead: enhance lighting and clarity, keep interior materials unchanged, replace any visible outside window background with a subtle dark gradient.
- Return the enhanced interior photo.

OUTPUT: A single photorealistic image that looks like the vehicle was photographed inside the AutoCity showroom shown in Image 1.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, referenceImageUrl, vehicleId } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!referenceImageUrl) {
      return new Response(
        JSON.stringify({ error: 'referenceImageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing showroom photo for vehicle: ${vehicleId}`);

    // Determine mime type from base64 header or default to jpeg
    let vehicleImageUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      vehicleImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SHOWROOM_PROMPT },
              { type: 'image_url', image_url: { url: referenceImageUrl } },
              { type: 'image_url', image_url: { url: vehicleImageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Gateway error [${response.status}]:`, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit bereikt. Probeer het later opnieuw.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits zijn op. Voeg credits toe aan je workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI verwerking mislukt (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImage) {
      console.error('No image in AI response:', JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Geen afbeelding ontvangen van AI. Probeer opnieuw.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully processed showroom photo');

    return new Response(
      JSON.stringify({ 
        resultImage,
        message: 'Foto succesvol verwerkt' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('showroom-photo-studio error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Onbekende fout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
