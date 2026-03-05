import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ━━━ STEP 0: ANGLE CLASSIFIER (Text-only, cheap) ━━━
const ANGLE_CLASSIFY_PROMPT = `You are a vehicle photography angle classifier. Analyze the input image and return EXACTLY ONE label describing the camera viewing angle of the vehicle.

━━━ ANGLE DEFINITIONS ━━━
- "left-front": Vehicle seen from front-left corner. Both the front AND left side are clearly visible. Typical 3/4 front view from left.
- "left-side": Vehicle seen from the left side. Both left wheels visible, front bumper barely visible or not visible. The side panel dominates the frame.
- "left-rear": Vehicle seen from rear-left corner. Both the rear AND left side are clearly visible. Typical 3/4 rear view from left.
- "rear": Vehicle seen from directly behind. Both taillights equally visible, minimal side visibility.
- "right-rear": Vehicle seen from rear-right corner. Both the rear AND right side are clearly visible.
- "right-side": Vehicle seen from the right side. Both right wheels visible, front bumper barely visible or not visible. The side panel dominates the frame.
- "right-front": Vehicle seen from front-right corner. Both the front AND right side are clearly visible. Typical 3/4 front view from right.
- "front": Vehicle seen from directly in front. Both headlights equally visible, minimal side visibility.
- "interior": Photo shows the cabin/interior of the vehicle (dashboard, seats, steering wheel, etc.)
- "unknown": The angle is ambiguous, the vehicle is partially cropped, or you cannot confidently determine the viewing angle.

━━━ CLASSIFICATION RULES ━━━
- "side" means the SIDE PANEL dominates. If you can clearly see the front bumper shape or grille, it is NOT side — it is "front" or a three-quarter angle.
- "front" or "rear" means DIRECT front/rear with minimal side visibility.
- If the image is too close (detail shot), heavily cropped, or ambiguous → return "unknown".
- If the image shows interior/cabin → return "interior".

━━━ RESPONSE FORMAT ━━━
Respond with ONLY the label, nothing else. No explanation, no quotes, no punctuation.
Example valid responses: left-side, right-front, rear, interior, unknown`;

// ━━━ STEP 1: COSMETIC RETOUCH (Identity-Locked) ━━━
const RETOUCH_PROMPT = `You are a photo RETOUCHER, not a designer. Your job is to clean and enhance this vehicle photo while keeping every pixel of the car's GEOMETRY unchanged. The vehicle may have been photographed OUTDOORS (on a street, parking lot, etc.) — your job is to make it look like it was photographed INDOORS in a professional showroom.

━━━ YOU MAY (cosmetic only) ━━━
- Remove dirt, mud, water spots, dust, bird droppings from paint surfaces
- Enhance paint gloss and recover highlights (make paint look freshly polished)
- Make paint appear freshly waxed — smooth, even gloss across ALL panels, no dull patches or uneven spots. The paint must look TRANSPARENT, vibrant, and glossy with depth and clarity — NOT hazy, matte, or dull.
- Correct white balance and color temperature (remove yellow/green warehouse cast)
- Do NOT introduce any yellow, orange, warm, or cool color cast. The paint must remain the EXACT same hue as the original.
- Reduce noise and grain
- Improve exposure and contrast subtly
- Clean glass surfaces (remove haze, smudges, water marks)
- Deepen tire black point slightly
- Subtly soften outdoor reflections (trees, buildings, sky, clouds, fences, parked cars, people) so they become indistinct blurred shapes — do NOT replace them with dark overlays or colored tints. The goal is that reflections look like soft ambient light from an indoor environment, NOT that the paint changes color. The paint must remain TRANSPARENT, vibrant, and glossy — as if freshly waxed and polished under studio lighting.
- Make chrome/piano-black trim less dull

━━━ YOU MUST NOT (identity features — GEOMETRY LOCKED) ━━━
- Do NOT change headlight SHAPE, LED signature, or DRL pattern in any way
- Do NOT alter bumper lines, grille pattern, air intake design, or front fascia
- Do NOT modify wheel/rim spoke design, pattern, or number of spokes
- Do NOT add, remove, or change any badges, emblems, or model text
- Do NOT smooth, alter, or "clean up" body character lines or creases
- Do NOT change taillight shape, design, or light signature
- Do NOT mirror or flip the vehicle orientation
- Do NOT crop, zoom, reframe, or change the camera angle
- You MAY subtly soften outdoor environment reflections so they look like soft indoor ambient light. But do NOT alter the SHAPE of reflective surfaces — only soften what is reflected in them.
- Do NOT add or remove anything from the image
- Do NOT change the background or surroundings (that happens in step 2)
- Do NOT remove or alter license plates or plate holders

━━━ CRITICAL COLOR RULE ━━━
Compare your output paint color against the input. If the hue has shifted in ANY direction (yellower, bluer, darker, lighter, warmer, cooler), your output is WRONG. The paint color must be pixel-identical to the original. Do NOT add any color cast, tint, or filter. The paint must remain vibrant and transparent with depth.

━━━ CRITICAL TEST ━━━
If you overlay input and output at 50% opacity, ONLY texture/lighting/reflections should differ — NEVER geometry, edges, or silhouette. The car's outline must be pixel-identical.

━━━ OUTPUT QUALITY ━━━
- Maximum sharpness — no added noise, no grain, no compression artifacts.
- All fine details (badge text, spoke edges, panel gaps, headlight internals) must remain tack-sharp.
- Do NOT add film grain or any texture overlay.

OUTPUT: The same photo with improved lighting, color accuracy, reduced noise, cleaned surfaces, enhanced paint gloss, and softened reflections. Nothing structural changes. The paint color must be IDENTICAL to the input.`;

// ━━━ STEP 2A: SHOWROOM BACKGROUND — NORMAL (with angle lock + reference studio) ━━━
const SHOWROOM_PROMPT_NORMAL = `You are given THREE images:

IMAGE 1 (Enhanced Vehicle): The retouched vehicle photo to place in the showroom.
IMAGE 2 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph. This is your ABSOLUTE REFERENCE for all vehicle details.
IMAGE 3 (STUDIO REFERENCE — ENVIRONMENT TEMPLATE): This is the EXACT showroom environment you must use. Do NOT generate a new room. Place the vehicle INTO this studio.

YOUR TASK: Place the vehicle from Image 1 into the EXACT studio environment shown in Image 3. The studio must remain IDENTICAL — same walls, same floor, same ceiling light, same reflections, same atmosphere.

━━━ STUDIO ENVIRONMENT (MATCH IMAGE 3 EXACTLY) ━━━
- Use Image 3 as the EXACT environment template
- The walls, floor, ceiling lighting, and overall atmosphere must be IDENTICAL to Image 3
- Do NOT change the wall color, floor texture, or lighting configuration
- Do NOT add any logos, text, branding, people, props, or decorative elements
- Do NOT generate a new showroom — ONLY use the room from Image 3
- The floor reflection style must match Image 3 (same intensity, same blur, same fade)

━━━ VEHICLE INTEGRITY (CRITICAL — DO NOT MODIFY THE CAR) ━━━
The vehicle must remain PIXEL-IDENTICAL to Image 2 (original). Specifically:
- Body color and paint finish — EXACT same hue, saturation, brightness. No color cast, no warming, no cooling.
- Paint must look TRANSPARENT, vibrant, glossy with depth — like freshly waxed under studio lighting.
- Headlight shape, LED signature, DRL pattern — IDENTICAL
- Taillight shape and design — IDENTICAL
- Front grille and bumper design — IDENTICAL
- Wheel/rim spoke pattern and design — IDENTICAL
- All badges, emblems, model text — IDENTICAL
- License plates and plate holders — MUST remain exactly as in Image 2. Do NOT remove, alter, or regenerate plates.
- Body lines, creases, proportions — IDENTICAL
- Window tint level — IDENTICAL

━━━ CAMERA ANGLE PRESERVATION (CRITICAL) ━━━
The input angle category is: {ANGLE}.
You MUST preserve this EXACT angle category in the output.
- Do NOT rotate, reframe, or "improve" the viewing angle in ANY way.
- Do NOT change the perspective — {ANGLE} must remain {ANGLE}.
- A left-side photo MUST remain left-side. NOT left-front, NOT three-quarter.
- A left-front photo MUST remain left-front. NOT front, NOT left-side.
- A rear photo MUST remain rear. NOT rear-quarter.
- Only micro-straightening (±2°) is allowed. Changing the angle category is NOT acceptable.
- Do NOT rotate to improve composition.

━━━ ANTI-MIRROR RULE (CRITICAL) ━━━
Look at the LICENSE PLATE position in Image 2.
- The plate must appear on the SAME SIDE of the output image.
- If the plate is on the LEFT side of Image 2, it MUST be on the LEFT side of the output.
- If the plate is on the RIGHT side of Image 2, it MUST be on the RIGHT side of the output.
- If you can see the DRIVER SIDE (left in EU/NL), it must remain the DRIVER SIDE.
- Reversing left↔right = CRITICAL FAILURE. NEVER mirror or flip the vehicle.

━━━ CAMERA HEIGHT LOCK ━━━
- The camera height and horizon line must match Image 1 exactly.
- Do NOT raise or lower the camera viewpoint.
- Do NOT tilt the camera up or down.
- Do NOT change the horizon position.

━━━ ZERO-CROP GUARANTEE ━━━
- The COMPLETE vehicle must be visible — ALL 4 wheels, BOTH mirrors, entire roof, all bumpers
- Visible margin between vehicle edges and image borders on ALL sides
- Output MUST be 1920x1080 pixels, landscape orientation

━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill ~65-80% of image width — the vehicle must appear PROMINENT and close, not distant
- All wheels on floor plane naturally

━━━ SHADOWS & REFLECTIONS ━━━
- Natural contact shadows under tires (~35% opacity, soft)
- Floor reflection must be BARELY visible — just a faint hint, not a mirror effect (~5% opacity, heavily blurred, fading quickly)
- All reflections on vehicle paint must be consistent with the indoor studio from Image 3 — no trees, sky, buildings.

━━━ IMAGE QUALITY (CRITICAL) ━━━
- Output must be ULTRA HIGH QUALITY at 1920x1080 — maximum sharpness, zero noise.
- The showroom environment (walls, floor, ceiling) must be PERFECTLY SMOOTH — no grain, no noise, no compression artifacts, no color banding.
- Floor reflection must be crisp and clean — no pixelation.
- Lighting gradients must be smooth — no visible banding or stepping.
- The vehicle must retain ALL fine detail: paint texture, badge text, spoke edges, panel gaps, headlight internals.
- The image must look like a professional DSLR photograph — NOT like an AI render.
- NO film grain. NO noise. NO soft focus on background. Tack-sharp everywhere.

━━━ INTERIOR PHOTO HANDLING ━━━
If Image 1 is an interior/cabin photo: enhance lighting/clarity, replace visible window backgrounds with dark gradient, do NOT place in studio.

OUTPUT: A photorealistic 1920x1080 image of the vehicle placed in the EXACT studio from Image 3. Every vehicle detail must match Image 2 exactly. The viewing angle MUST be {ANGLE}. The studio environment MUST match Image 3 exactly.`;

// ━━━ STEP 2B: SHOWROOM BACKGROUND — STRICT (zero rotation, for retry & unknown) ━━━
const SHOWROOM_PROMPT_STRICT = `You are given THREE images:

IMAGE 1 (Enhanced Vehicle): The retouched vehicle photo to place in the showroom.
IMAGE 2 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph. This is your ABSOLUTE REFERENCE for all vehicle details.
IMAGE 3 (STUDIO REFERENCE — ENVIRONMENT TEMPLATE): This is the EXACT showroom environment you must use. Do NOT generate a new room.

YOUR TASK: Place the vehicle from Image 1 into the EXACT studio environment shown in Image 3.

━━━ STUDIO ENVIRONMENT (MATCH IMAGE 3 EXACTLY) ━━━
- Use Image 3 as the EXACT environment template
- The walls, floor, ceiling lighting must be IDENTICAL to Image 3
- Do NOT generate a new showroom — ONLY use the room from Image 3
- Do NOT add logos, text, branding, people, props, or decorative elements

━━━ VEHICLE INTEGRITY (DO NOT MODIFY THE CAR) ━━━
The vehicle must remain PIXEL-IDENTICAL to Image 2 (original). All features — color, headlights, taillights, grille, wheels, badges, plates, body lines, proportions — IDENTICAL.

━━━ ZERO ROTATION / ZERO REFRAME (ABSOLUTE RULE) ━━━
This is a STRICT MODE output. The following rules are ABSOLUTE and NON-NEGOTIABLE:
- ZERO rotation. Do NOT rotate the vehicle even 1 degree.
- ZERO reframe. Do NOT change the camera angle, perspective, or viewpoint.
- ZERO perspective change. The car must appear from the EXACT same angle as in Image 1.
- Do NOT "improve" composition, do NOT "correct" the angle, do NOT make it "more dramatic".
- Keep the car position and size as close to the input as possible.
- Only replace the background and adjust lighting. Nothing else.

━━━ ANTI-MIRROR RULE (CRITICAL) ━━━
Look at the LICENSE PLATE position in Image 2.
- The plate must appear on the SAME SIDE of the output image.
- If the plate is on the LEFT side of Image 2, it MUST be on the LEFT side of the output.
- Reversing left↔right = CRITICAL FAILURE. NEVER mirror or flip the vehicle.

━━━ CAMERA HEIGHT LOCK ━━━
- The camera height and horizon line must match Image 1 exactly.
- Do NOT raise or lower the camera viewpoint.
- Do NOT tilt. Do NOT change the horizon.

━━━ ZERO-CROP GUARANTEE ━━━
- The COMPLETE vehicle must be visible — ALL 4 wheels, BOTH mirrors, entire roof, all bumpers
- Output MUST be 1920x1080 pixels, landscape orientation

━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill ~65-80% of image width — the vehicle must appear PROMINENT and close, not distant
- All wheels on floor plane naturally

━━━ SHADOWS & REFLECTIONS ━━━
- Natural contact shadows under tires (~35% opacity, soft)
- Floor reflection must be BARELY visible — just a faint hint, not a mirror effect (~5% opacity, heavily blurred, fading quickly)

━━━ IMAGE QUALITY (CRITICAL) ━━━
- Output must be ULTRA HIGH QUALITY at 1920x1080 — maximum sharpness, zero noise.
- The showroom environment (walls, floor, ceiling) must be PERFECTLY SMOOTH — no grain, no noise, no compression artifacts, no color banding.
- Floor reflection must be crisp and clean — no pixelation.
- Lighting gradients must be smooth — no visible banding or stepping.
- The vehicle must retain ALL fine detail: paint texture, badge text, spoke edges, panel gaps, headlight internals.
- The image must look like a professional DSLR photograph — NOT like an AI render.
- NO film grain. NO noise. NO soft focus on background. Tack-sharp everywhere.

OUTPUT: A photorealistic 1920x1080 image of the vehicle placed in the EXACT studio from Image 3. The viewing angle must be IDENTICAL to the input. ZERO rotation allowed.`;

// ━━━ STEP 3: AI VERIFICATION (with angle check) ━━━
const VERIFICATION_PROMPT = `You are a quality control inspector comparing a RESULT image against an ORIGINAL vehicle photograph.

IMAGE 1 (Original): The unedited original vehicle photo — your GROUND TRUTH.
IMAGE 2 (Result): The AI-processed showroom result to verify.

The input was classified as angle category: "{ANGLE}".

Check these 6 critical identity features by comparing Image 2 against Image 1:

1. HEADLIGHTS: Is the headlight shape, LED signature, and DRL pattern identical?
2. WHEELS: Is the wheel/rim spoke pattern and design identical?
3. CAMERA ANGLE: Is the viewing angle the same as the original? The input was classified as "{ANGLE}".
   - A left-side photo must remain left-side, NOT left-front or three-quarter.
   - A rear photo must remain rear, NOT rear-quarter.
   - A front photo must remain front, NOT front-quarter.
   - If the angle CATEGORY has changed (e.g. side became three-quarter, or rear became rear-quarter), this is a HIGH SEVERITY failure.
   - Minor angle adjustment (±2°) within the SAME category is acceptable.
   - Mirroring (left↔right flip) = automatic high severity.
4. COLOR: Is the vehicle body color consistent with the original? Check for yellow/warm color cast. Any hue shift = failure.
5. OVERALL IDENTITY: Does the result still look like the same car? (same model, same features, same proportions)
6. MIRRORING: Is the same side of the car visible? (check for left/right flip)

You MUST respond with ONLY a valid JSON object, no other text:
{"pass": true/false, "severity": "none"/"low"/"medium"/"high", "mirrored": true/false, "color_consistent": true/false, "angle_preserved": true/false, "detected_angle": "label", "changed_parts": ["list of changed parts"], "issues": ["description of each issue"]}

Rules:
- "pass": true if the car identity AND angle are preserved (minor background/lighting differences are OK)
- "severity": "none" if pass, "low" for minor lighting differences, "medium" for noticeable feature changes, "high" for mirroring, angle category change, or completely wrong car
- "mirrored": true if the vehicle appears flipped compared to the original
- "color_consistent": true if body color matches without hue/saturation shift
- "angle_preserved": true if the viewing angle category matches "{ANGLE}". false if the category changed.
- "detected_angle": the angle category you detect in the result image (use same labels: left-front, left-side, left-rear, rear, right-rear, right-side, right-front, front)
- "changed_parts": list from ["headlights", "taillights", "grille", "bumper", "wheels", "body_lines", "badges", "color", "angle"]
- "issues": human-readable description of each problem found

IMPORTANT: Be LENIENT on background/showroom details. Focus ONLY on the vehicle itself and its viewing angle. Minor lighting or reflection differences are acceptable and should NOT cause failure. But angle category changes MUST cause failure.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { imageBase64, vehicleInfo, studioReferenceBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build vehicle identity block
    let vehicleIdentity = '';
    if (vehicleInfo?.brand && vehicleInfo?.model) {
      const desc = `${vehicleInfo.year || ''} ${vehicleInfo.brand} ${vehicleInfo.model}`.trim();
      const color = vehicleInfo.color || 'unknown color';
      vehicleIdentity = `\n\nVEHICLE IDENTITY (DO NOT ALTER): This is a ${desc} in ${color}. Do NOT "correct" any features to match what you think this model should look like. Trust the photograph ONLY.`;
      console.log(`Vehicle identity: ${desc} in ${color}`);
    }

    // Ensure proper data URI
    let vehicleImageUrl = imageBase64;
    let studioRefUrl = studioReferenceBase64 || null;
    if (!imageBase64.startsWith('data:')) {
      vehicleImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }
    if (studioRefUrl && !studioRefUrl.startsWith('data:')) {
      studioRefUrl = `data:image/jpeg;base64,${studioRefUrl}`;
    }
    
    console.log(`Studio reference image: ${studioRefUrl ? 'provided' : 'NOT provided (will use text-only description)'}`);

    const aiHeaders = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // Helper for error responses
    const handleAiError = async (response: Response, step: string) => {
      const errorText = await response.text();
      console.error(`${step} AI error [${response.status}]:`, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit bereikt. Probeer het later opnieuw.', step }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits zijn op. Voeg credits toe aan je workspace.', step }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: `${step} mislukt (${response.status})`, step }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    const VALID_ANGLES = ['left-front', 'left-side', 'left-rear', 'rear', 'right-rear', 'right-side', 'right-front', 'front', 'interior', 'unknown'];

    // ━━━ STEP 0: Angle Classification (text-only, Flash Lite) ━━━
    console.log('Step 0: Classifying vehicle angle...');
    let angleLabel = 'unknown';
    try {
      const classifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: ANGLE_CLASSIFY_PROMPT },
              { type: 'image_url', image_url: { url: vehicleImageUrl } }
            ]
          }],
        }),
      });

      if (classifyResponse.ok) {
        const classifyData = await classifyResponse.json();
        const rawLabel = (classifyData.choices?.[0]?.message?.content || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
        if (VALID_ANGLES.includes(rawLabel)) {
          angleLabel = rawLabel;
        } else {
          console.warn(`Classifier returned invalid label: "${rawLabel}", defaulting to unknown`);
        }
      } else {
        console.error('Angle classification failed, defaulting to unknown');
      }
    } catch (classifyError) {
      console.error('Angle classification error:', classifyError);
    }
    console.log(`Step 0 complete: Angle classified as "${angleLabel}"`);

    // Interior photos: skip showroom pipeline
    if (angleLabel === 'interior') {
      console.log('Interior photo detected — skipping showroom, doing retouch only.');
      // Still do retouch for interior
      const retouchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: RETOUCH_PROMPT + vehicleIdentity },
              { type: 'image_url', image_url: { url: vehicleImageUrl } }
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!retouchResponse.ok) return await handleAiError(retouchResponse, 'Retouch');
      const retouchData = await retouchResponse.json();
      const enhancedImage = retouchData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(JSON.stringify({
        resultImage: enhancedImage || vehicleImageUrl,
        usedFallback: !enhancedImage,
        angleLabel: 'interior',
        verification: { pass: true, severity: 'none', mirrored: false, color_consistent: true, angle_preserved: true, detected_angle: 'interior', changed_parts: [], issues: [] },
        message: 'Interieur foto verbeterd (geen showroom)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Determine which showroom prompt to use
    const useStrictForInitial = angleLabel === 'unknown';

    // ━━━ STEP 1: Cosmetic Retouch (Gemini Flash) ━━━
    console.log('Step 1: Cosmetic retouch (identity-locked)...');
    const retouchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: RETOUCH_PROMPT + vehicleIdentity },
            { type: 'image_url', image_url: { url: vehicleImageUrl } }
          ]
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!retouchResponse.ok) return await handleAiError(retouchResponse, 'Retouch');

    const retouchData = await retouchResponse.json();
    const enhancedImage = retouchData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImage) {
      console.error('No image from retouch:', JSON.stringify(retouchData).substring(0, 500));
      return new Response(JSON.stringify({ error: 'Geen verbeterde afbeelding ontvangen.', step: 'retouch' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 1 complete: Cosmetic retouch done');

    // ━━━ STEP 2: Background Replacement (Gemini Pro) ━━━
    const doComposite = async (useStrict: boolean, extraInstructions?: string) => {
      const basePrompt = useStrict ? SHOWROOM_PROMPT_STRICT : SHOWROOM_PROMPT_NORMAL;
      // Inject angle label into prompt
      const promptWithAngle = basePrompt.replace(/\{ANGLE\}/g, angleLabel);
      const promptText = promptWithAngle + vehicleIdentity + (extraInstructions || '');
      
      console.log(`Step 2: Background replacement (${useStrict ? 'STRICT' : 'NORMAL'} mode, angle: ${angleLabel})...`);
      
      const compositeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: enhancedImage } },
              { type: 'image_url', image_url: { url: vehicleImageUrl } },
              ...(studioRefUrl ? [{ type: 'image_url', image_url: { url: studioRefUrl } }] : [])
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!compositeResponse.ok) return { error: await handleAiError(compositeResponse, 'Showroom') };

      const compositeData = await compositeResponse.json();

      const embeddedError = compositeData?.error
        || compositeData?.choices?.[0]?.error
        || compositeData?.choices?.find?.((c: any) => c?.error)?.error;

      if (embeddedError) {
        const code = Number(embeddedError.code || 500);
        const errorType = embeddedError?.metadata?.error_type || '';
        console.error(`Compositing embedded error [${code}]: ${errorType} - ${embeddedError.message}`);

        if (code === 429 || errorType === 'rate_limit_exceeded') {
          return {
            error: new Response(
              JSON.stringify({ error: 'Rate limit bereikt bij showroom stap. Probeer het later opnieuw.', step: 'composite' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          };
        }
        return { error: null, image: null };
      }

      const resultImage = compositeData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!resultImage) {
        console.error('No image from compositing:', JSON.stringify(compositeData).substring(0, 800));
        return { error: null, image: null };
      }

      return { error: null, image: resultImage };
    };

    // Initial composite: STRICT if unknown, NORMAL otherwise
    const compositeResult = await doComposite(useStrictForInitial);
    if (compositeResult.error) return compositeResult.error;
    if (!compositeResult.image) {
      console.warn('Composite returned no image. Using safe fallback (enhanced photo).');
      return new Response(JSON.stringify({
        resultImage: enhancedImage,
        usedFallback: true,
        angleLabel,
        verification: { pass: false, severity: 'medium', mirrored: false, color_consistent: true, angle_preserved: false, detected_angle: 'unknown', changed_parts: [], issues: ['Geen showroom afbeelding ontvangen; fallback gebruikt.'] },
        message: 'Verbeterde foto gebruikt (showroom stap tijdelijk niet beschikbaar)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 2 complete: Background replacement done');

    // ━━━ STEP 3: AI Verification (with angle check) ━━━
    console.log('Step 3: AI verification...');
    let verification = { pass: true, severity: 'none', mirrored: false, color_consistent: true, angle_preserved: true, detected_angle: angleLabel, changed_parts: [] as string[], issues: [] as string[] };
    let finalImage = compositeResult.image;
    let usedFallback = false;

    try {
      const verifyPromptText = VERIFICATION_PROMPT.replace(/\{ANGLE\}/g, angleLabel) + (vehicleIdentity || '');
      
      const doVerify = async (imageToVerify: string) => {
        const verifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: aiHeaders,
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: verifyPromptText },
                { type: 'image_url', image_url: { url: vehicleImageUrl } },
                { type: 'image_url', image_url: { url: imageToVerify } }
              ]
            }],
          }),
        });

        if (!verifyResponse.ok) {
          console.error('Verification call failed');
          return null;
        }

        const verifyData = await verifyResponse.json();
        const verifyText = verifyData.choices?.[0]?.message?.content || '';
        console.log('Verification raw response:', verifyText);

        const jsonMatch = verifyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse verification JSON:', e);
          }
        }
        return null;
      };

      const initialVerification = await doVerify(compositeResult.image);
      if (initialVerification) {
        verification = initialVerification;
        console.log('Verification result:', JSON.stringify(verification));
      }

      // Check for failures requiring retry
      const needsRetry = !verification.pass && (
        verification.severity === 'high' || 
        verification.angle_preserved === false
      );

      if (needsRetry) {
        console.log(`Verification FAILED (severity: ${verification.severity}, angle_preserved: ${verification.angle_preserved}). Retrying with STRICT prompt...`);
        
        const correctionInstructions = `\n\n━━━ CORRECTION REQUIRED ━━━\nThe previous result had critical problems:\n${verification.issues?.map((i: string) => `- ${i}`).join('\n') || '- Unknown issues'}\n${verification.mirrored ? '- CRITICAL: The vehicle was MIRRORED. Do NOT flip the vehicle.\n' : ''}${!verification.angle_preserved ? `- CRITICAL: The viewing angle changed. It MUST be "${angleLabel}". Do NOT rotate.\n` : ''}\nFix these issues. ZERO rotation allowed.`;

        const retryResult = await doComposite(true, correctionInstructions);
        
        if (!retryResult.error && retryResult.image) {
          // Re-verify the retry
          const retryVerification = await doVerify(retryResult.image);
          
          if (retryVerification) {
            console.log('Retry verification:', JSON.stringify(retryVerification));
            
            if (retryVerification.pass || (retryVerification.severity !== 'high' && retryVerification.angle_preserved !== false)) {
              finalImage = retryResult.image;
              verification = retryVerification;
              console.log('Retry PASSED verification');
            } else {
              // Retry also failed — fallback to enhanced photo
              console.log('Retry also FAILED. Using enhanced photo fallback.');
              finalImage = enhancedImage;
              usedFallback = true;
            }
          } else {
            // Couldn't verify retry — use retry result anyway
            finalImage = retryResult.image;
          }
        } else {
          console.log('Retry compositing failed. Using enhanced photo fallback.');
          finalImage = enhancedImage;
          usedFallback = true;
        }
      }
      // Medium severity without angle issues: accept with warning
      else if (!verification.pass && verification.severity === 'medium') {
        console.log('Verification medium severity — accepting result with warning.');
      }
    } catch (verifyError) {
      console.error('Verification step error:', verifyError);
    }

    console.log(`Pipeline complete. Angle: ${angleLabel}, Fallback: ${usedFallback}, Pass: ${verification.pass}, Severity: ${verification.severity}, AnglePreserved: ${verification.angle_preserved}`);

    return new Response(
      JSON.stringify({ 
        resultImage: finalImage,
        usedFallback,
        angleLabel,
        verification: {
          pass: verification.pass,
          severity: verification.severity || 'none',
          mirrored: verification.mirrored || false,
          color_consistent: verification.color_consistent !== false,
          angle_preserved: verification.angle_preserved !== false,
          detected_angle: verification.detected_angle || angleLabel,
          changed_parts: verification.changed_parts || [],
          issues: verification.issues || [],
        },
        message: usedFallback 
          ? 'Verbeterde foto gebruikt (identity/angle check gefaald)' 
          : 'Foto succesvol verwerkt (classificatie + retouch + showroom + verificatie)'
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
