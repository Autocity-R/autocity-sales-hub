import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHOWROOM_PROMPT = `You are an expert automotive photography post-production specialist. Your task is to take the uploaded vehicle photo and produce a photorealistic dealership studio image.

CRITICAL RULES — DO NOT MODIFY THE VEHICLE:
- Do NOT change the vehicle color, wheels, badges, trim, headlights, body shape, proportions, or license plate holders.
- The vehicle must remain IDENTICAL to the uploaded photo in every detail.
- Any existing AutoCity license plate holders or branding on the car must be preserved exactly.

STEP 1 — IMAGE QUALITY ENHANCEMENT:
- Correct white balance (remove green/yellow warehouse lighting cast).
- Reduce noise and improve clarity.
- Increase contrast slightly.
- Sharpen subtly.
- Recover paint reflections while keeping vehicle color accurate.

STEP 2 — BACKGROUND REPLACEMENT & STUDIO COMPOSITING:
Remove the original background entirely and place the vehicle inside a fixed AutoCity showroom studio with these EXACT specifications:

WALLS: Dark charcoal matte wall with subtle texture.
LOGO: Centered on the back wall, an illuminated LED sign reading "AUTOCITY" in white/cream LED letters. Above the text is a minimal car silhouette line logo. The logo emits soft WHITE LED light.
CEILING: A thin LED light strip runs along the upper wall edges. The strip emits neutral WHITE light (not yellow).
FLOOR: Smooth polished dark concrete floor.

STEP 3 — LIGHTING:
- Apply realistic professional studio lighting: soft overhead light, balanced reflections on paint, natural highlights on body contours.
- Add subtle rim lighting (opacity ~10%) to prevent dark vehicles from blending into the dark background.

STEP 4 — SHADOWS & REFLECTIONS:
- Add natural contact shadows under the tires (blur radius ~25px, opacity ~35%).
- Add a subtle floor reflection of the vehicle (opacity ~10%, blur ~40px, vertically flipped and slightly faded).

STEP 5 — VEHICLE SCALING & PERSPECTIVE:
- Scale the vehicle so it sits naturally on the floor plane with consistent visual size.
- If the camera angle is slightly off, apply minimal perspective correction to improve composition. Never distort vehicle proportions.

STEP 6 — INTERIOR PHOTO HANDLING:
If the uploaded image is an interior/cabin photo (not an exterior shot):
- Do NOT place it inside the exterior studio.
- Instead: enhance lighting and clarity, keep interior materials unchanged, replace any visible outside window background with a subtle dark AutoCity-branded gradient.

OUTPUT: A single photorealistic dealership studio image that looks like it was photographed inside a real AutoCity showroom. Suitable for website listings, AutoScout, Marktplaats, and marketing materials.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, vehicleId } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing showroom photo for vehicle: ${vehicleId}`);

    // Determine mime type from base64 header or default to jpeg
    let imageUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageBase64}`;
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
              { type: 'image_url', image_url: { url: imageUrl } }
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
