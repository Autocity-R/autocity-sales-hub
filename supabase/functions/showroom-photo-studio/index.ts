import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ENHANCE_PROMPT = `You are a professional automotive photo editor. Your ONLY task is to enhance the image quality of this vehicle photo.

WHAT TO DO:
- Correct white balance: remove any yellow/green warehouse lighting cast
- Reduce noise and grain
- Increase clarity and sharpness subtly
- Improve contrast slightly
- Recover paint reflections while keeping vehicle color 100% accurate
- Make colors more vibrant and true-to-life

ABSOLUTE RULES — DO NOT VIOLATE:
- Do NOT crop, zoom, reframe, or change the camera angle in ANY way
- Do NOT change the vehicle's color, wheels, badges, trim, or any physical detail
- Do NOT add or remove anything from the image
- Do NOT change the background or surroundings
- Do NOT alter the composition or framing whatsoever
- The output image must have the EXACT same framing, angle, and composition as the input

OUTPUT: The same photo with improved lighting, color accuracy, sharpness, and reduced noise. Nothing else changes.`;

const SHOWROOM_PROMPT = `You are given TWO images:

IMAGE 1 (Reference Studio): This is the EXACT showroom environment you must replicate. Study every detail carefully.

IMAGE 2 (Vehicle Photo): This is the vehicle you must place into the studio.

YOUR TASK: Place the vehicle from Image 2 into the EXACT same showroom environment as Image 1.

━━━ OUTPUT REQUIREMENTS ━━━
- Output MUST be exactly 1920x1080 pixels, landscape orientation
- The image must look like a real photograph taken inside this showroom

━━━ ZERO-CROP GUARANTEE (CRITICAL) ━━━
- The COMPLETE vehicle must be visible in the final image
- ALL 4 wheels must be fully visible — no wheel may be cut off even partially
- BOTH side mirrors must be fully visible
- The entire roof, all bumpers, and all body panels must be fully in frame
- There must be visible space/margin between the vehicle edges and the image borders on ALL sides
- Do NOT crop, cut, or hide ANY part of the vehicle

━━━ VEHICLE INTEGRITY (DO NOT MODIFY) ━━━
The following must remain IDENTICAL to Image 2:
- Body color and paint finish
- Wheels/rims design and color
- All badges, emblems, and model text
- AutoCity license plate holders (if present)
- Headlights and taillights design
- Body shape, proportions, and all body lines
- Window tint level
- Any existing damage or imperfections
- Camera angle and perspective of the vehicle — keep the EXACT same viewing angle

━━━ SHOWROOM ENVIRONMENT (match Image 1 exactly) ━━━
- Dark charcoal/anthracite walls
- White LED "AUTOCITY" logo on the back wall — match the exact text, font, and illumination style from Image 1
- White/warm LED light strips along ceiling edges — match position and glow from Image 1
- Polished dark floor with subtle reflections
- Overall warm, professional automotive showroom lighting

━━━ VEHICLE PLACEMENT ━━━
- Center the vehicle horizontally in the frame
- The vehicle should fill approximately 55-65% of the image width
- All wheels must sit naturally on the floor plane
- The vehicle should be at a similar scale and position as the car shown in Image 1

━━━ SHADOWS & REFLECTIONS ━━━
- Add natural contact shadows under all tires (approximately 35% opacity, soft edges)
- Add a subtle floor reflection of the vehicle (approximately 10% opacity, blurred, fading away from the vehicle)
- Shadows must match the lighting direction visible in Image 1

━━━ INTERIOR PHOTO HANDLING ━━━
If Image 2 is an interior/cabin photo (dashboard, seats, steering wheel — not an exterior shot):
- Do NOT place it inside the studio
- Instead: enhance lighting and clarity of the interior
- Keep all interior materials, colors, and textures unchanged
- Replace any visible outside-window background with a subtle dark gradient
- Return the enhanced interior photo

OUTPUT: A single photorealistic 1920x1080 image that looks like the vehicle was professionally photographed inside this AutoCity showroom.`;

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

    // Ensure proper data URI format
    let vehicleImageUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      vehicleImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    // ━━━ STEP 1: Enhancement (Gemini Flash) ━━━
    console.log('Step 1: Enhancing vehicle photo...');
    const enhanceResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              { type: 'text', text: ENHANCE_PROMPT },
              { type: 'image_url', image_url: { url: vehicleImageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!enhanceResponse.ok) {
      const errorText = await enhanceResponse.text();
      console.error(`Enhancement AI error [${enhanceResponse.status}]:`, errorText);
      
      if (enhanceResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit bereikt. Probeer het later opnieuw.', step: 'enhance' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (enhanceResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits zijn op. Voeg credits toe aan je workspace.', step: 'enhance' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Foto verbetering mislukt (${enhanceResponse.status})`, step: 'enhance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enhanceData = await enhanceResponse.json();
    const enhancedImage = enhanceData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImage) {
      console.error('No image from enhancement step:', JSON.stringify(enhanceData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Geen verbeterde afbeelding ontvangen. Probeer opnieuw.', step: 'enhance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step 1 complete: Photo enhanced successfully');

    // ━━━ STEP 2: Showroom Compositing (Gemini Pro) ━━━
    console.log('Step 2: Placing vehicle in showroom...');
    const compositeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: SHOWROOM_PROMPT },
              { type: 'image_url', image_url: { url: referenceImageUrl } },
              { type: 'image_url', image_url: { url: enhancedImage } }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!compositeResponse.ok) {
      const errorText = await compositeResponse.text();
      console.error(`Compositing AI error [${compositeResponse.status}]:`, errorText);

      if (compositeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit bereikt. Probeer het later opnieuw.', step: 'composite' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (compositeResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits zijn op. Voeg credits toe aan je workspace.', step: 'composite' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Showroom plaatsing mislukt (${compositeResponse.status})`, step: 'composite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const compositeData = await compositeResponse.json();
    const resultImage = compositeData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImage) {
      console.error('No image from compositing step:', JSON.stringify(compositeData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Geen showroom afbeelding ontvangen. Probeer opnieuw.', step: 'composite' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step 2 complete: Vehicle placed in showroom successfully');

    return new Response(
      JSON.stringify({ 
        resultImage,
        message: 'Foto succesvol verwerkt (verbeterd + showroom)' 
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
