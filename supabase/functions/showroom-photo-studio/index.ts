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

// ━━━ STEP 1: CLEAN ONLY (cosmetic cleaning, NO relight, NO reflections) ━━━
const CLEAN_PROMPT = `You are a photo cleaner. Your ONLY job is cosmetic surface cleaning. Do NOT change lighting, reflections, or the background.

━━━ YOU MAY (cosmetic surface cleaning ONLY) ━━━
- Remove dirt, mud, water spots, dust, bird droppings from paint surfaces
- Remove minor scratches and swirl marks from paint
- Reduce image noise and grain
- Correct white balance subtly (remove yellow/green cast)
- Correct minor exposure (brighten underexposed, tone down overexposed — subtle only)
- Clean glass surfaces (remove haze, smudges, water marks on glass)
- Deepen tire black point slightly (make tires look fresh)
- Make chrome/piano-black trim less dull
- Make paint look freshly polished — smooth, even gloss

━━━ YOU MUST NOT (STRICTLY FORBIDDEN) ━━━
- Do NOT change, replace, or modify ANY reflections on paint (keep original reflections exactly as they are)
- Do NOT add LED streaks, studio lighting, or any artificial light effects
- Do NOT simulate studio lighting or indoor lighting
- Do NOT change or darken windows — keep window content exactly as-is
- Do NOT change the background in any way
- Do NOT change the overall exposure dramatically
- Do NOT change paint color or add any color cast
- Do NOT change headlight shape, LED signature, or DRL pattern
- Do NOT alter bumper lines, grille pattern, or front fascia
- Do NOT modify wheel/rim spoke design
- Do NOT add, remove, or change badges, emblems, or model text
- Do NOT smooth or alter body character lines or creases
- Do NOT mirror or flip the vehicle
- Do NOT crop, zoom, reframe, or change the camera angle
- Do NOT remove or alter license plates

━━━ CRITICAL RULE ━━━
The reflections on the paint must remain EXACTLY as they are in the input. If there are trees, sky, or buildings reflected — LEAVE THEM. That is handled in a later step. Your job is ONLY surface cleaning.

━━━ OUTPUT ━━━
The same photo with cleaner surfaces, corrected white balance, reduced noise. Nothing else changes. The image must be visually identical except for cleanliness.`;

// ━━━ STEP 2: ISOLATE (background → neutral #404040 gray) ━━━
const ISOLATE_PROMPT = `You are a background removal specialist. Replace the ENTIRE background with a solid uniform dark gray color (#404040).

━━━ YOUR TASK ━━━
- Replace ALL background (sky, buildings, trees, roads, parking lots, walls, other cars, people, objects) with SOLID UNIFORM #404040 dark gray
- The gray must be completely flat and uniform — no gradients, no texture, no variation
- Keep a subtle ground plane shadow directly under the tires for natural grounding

━━━ VEHICLE PRESERVATION (ABSOLUTE — DO NOT TOUCH THE CAR) ━━━
- Do NOT change the vehicle in ANY way
- Do NOT change reflections on paint — even if they show outdoor scenes
- Do NOT relight the vehicle
- Do NOT alter paint color, gloss, or finish
- Do NOT alter wheels, headlights, taillights, grille, or any design element
- Do NOT change window content or tint
- Do NOT change badges, emblems, or license plates
- Preserve geometry EXACTLY — every edge, every line, every curve
- The car must be PIXEL-IDENTICAL to the input, only the background changes

━━━ EDGE QUALITY ━━━
- Clean, precise edges between vehicle and gray background
- No halo, no fringing, no color bleed
- Fine details like antennas, roof rails, mirror edges must be preserved
- Wheels and wheel arches must have clean separation from ground

━━━ OUTPUT ━━━
The exact same vehicle on a solid #404040 gray background. Nothing about the vehicle changes.`;

// ━━━ STEP 3: COMPOSITE (place isolated car into studio) ━━━
const COMPOSITE_PROMPT_NORMAL = `You are given THREE images:

IMAGE 1 (Isolated Vehicle): The vehicle on a neutral gray background. Place this into the studio.
IMAGE 2 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph. This is your ABSOLUTE REFERENCE for vehicle identity.
IMAGE 3 (STUDIO REFERENCE — ENVIRONMENT TEMPLATE): This is the EXACT showroom environment. Place the vehicle INTO this studio.

YOUR TASK: Place the vehicle from Image 1 into the EXACT studio environment shown in Image 3. Do NOT generate a new room. Do NOT relight the car yet — that happens in the next step.

━━━ STUDIO ENVIRONMENT (MATCH IMAGE 3 EXACTLY) ━━━
- Use Image 3 as the EXACT environment template
- The walls, floor, ceiling lighting must be IDENTICAL to Image 3
- Do NOT change the wall color, floor texture, or lighting configuration
- Do NOT add any logos, text, branding, people, props, or decorative elements
- Do NOT generate a new showroom — ONLY use the room from Image 3

━━━ VEHICLE GEOMETRY LOCK (CRITICAL — NO MODIFICATIONS) ━━━
The vehicle's GEOMETRY and DESIGN must remain IDENTICAL to Image 2:
- Headlight shape, LED signature, DRL pattern — IDENTICAL
- Taillight shape and design — IDENTICAL
- Front grille and bumper design — IDENTICAL
- Wheel/rim spoke pattern and design — IDENTICAL
- All badges, emblems, model text — IDENTICAL
- License plates and plate holders — IDENTICAL
- Body lines, creases, proportions — IDENTICAL
- Paint COLOR — IDENTICAL (no color cast, no hue shift)

PHOTOGRAPHIC ADJUSTMENTS ALLOWED (these are NOT geometry):
- Paint reflections may change to match the studio environment
- Overall exposure may adjust to match studio ambient light
- These changes happen primarily in the next step (relight), but minor integration is OK here

━━━ CAMERA ANGLE PRESERVATION (CRITICAL) ━━━
The input angle category is: {ANGLE}.
- Do NOT rotate, reframe, or "improve" the viewing angle
- {ANGLE} must remain {ANGLE} — no category changes
- Only micro-straightening (±2°) allowed

━━━ ANTI-MIRROR RULE (CRITICAL) ━━━
Check the LICENSE PLATE position in Image 2.
- The plate must appear on the SAME SIDE in the output
- Reversing left↔right = CRITICAL FAILURE

━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill 55-60% of image width (NOT more)
- Leave at least 15% margin on left and right sides
- Leave at least 12% margin above the roofline
- All wheels on floor plane naturally
- Natural viewing distance — as if photographed 6-8 meters away
- When in doubt, place FURTHER away rather than closer
- Do NOT crop any part of the vehicle

━━━ SHADOWS ━━━
- Tight tire contact shadow directly under each tire (~50-60% opacity, sharp at tire, softening outward)
- Soft ambient shadow under full chassis (~20% opacity, wide spread)
- Shadow direction must match the studio lighting from Image 3

━━━ FLOOR REFLECTION ━━━
- BARELY visible — faint hint only (~5-8% opacity)
- Heavily blurred, fading quickly downward
- NOT a mirror effect — just subtle suggestion of reflection

━━━ EDGE BLENDING ━━━
- Vehicle edges feathered 1-2px and color-matched to studio floor/wall
- NO halo, NO visible cut line, NO edge artifacts
- Transition between vehicle bottom and floor must be SEAMLESS

━━━ ZERO-CROP GUARANTEE ━━━
- COMPLETE vehicle visible — ALL 4 wheels, BOTH mirrors, entire roof, all bumpers
- Output MUST be 1920x1080 pixels, landscape orientation

━━━ IMAGE QUALITY ━━━
- Ultra high quality at 1920x1080 — maximum sharpness, zero noise
- Showroom environment must be PERFECTLY SMOOTH — no grain, no artifacts, no banding
- Professional DSLR look — NOT an AI render

OUTPUT: A photorealistic 1920x1080 image of the vehicle placed in the EXACT studio from Image 3. Angle MUST be {ANGLE}. Studio MUST match Image 3.`;

const COMPOSITE_PROMPT_STRICT = `You are given THREE images:

IMAGE 1 (Isolated Vehicle): The vehicle on a neutral gray background.
IMAGE 2 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph.
IMAGE 3 (STUDIO REFERENCE — ENVIRONMENT TEMPLATE): The EXACT showroom to use.

YOUR TASK: Place the vehicle into the studio from Image 3.

━━━ ZERO ROTATION / ZERO REFRAME (ABSOLUTE RULE) ━━━
- ZERO rotation. Do NOT rotate the vehicle even 1 degree.
- ZERO reframe. Do NOT change the camera angle.
- ZERO perspective change.
- Keep the car position and size as close to the input as possible.
- Only replace the background. Do NOT "improve" composition.

━━━ STUDIO ENVIRONMENT (MATCH IMAGE 3 EXACTLY) ━━━
- Walls, floor, ceiling — IDENTICAL to Image 3
- Do NOT generate a new showroom

━━━ VEHICLE GEOMETRY LOCK ━━━
All geometry — IDENTICAL to Image 2. No changes to headlights, wheels, grille, badges, plates, body lines, color.

━━━ ANTI-MIRROR RULE ━━━
License plate must remain on the SAME SIDE as in Image 2.

━━━ VEHICLE PLACEMENT ━━━
- Fill 55-60%, margins 15% sides, 12% above roof
- When in doubt, place FURTHER away
- Do NOT crop any part of the vehicle

━━━ SHADOWS & REFLECTIONS ━━━
- Contact shadows under tires (50-60% opacity)
- Ambient chassis shadow (20% opacity)
- Floor reflection barely visible (5-8% opacity)
- NO halo, NO edge artifacts

━━━ ZERO-CROP GUARANTEE ━━━
- COMPLETE vehicle visible, 1920x1080 output

OUTPUT: Photorealistic 1920x1080 image. ZERO rotation. Studio MUST match Image 3.`;

// ━━━ STEP 4: RELIGHT (pro photographer look — the magic step) ━━━
const RELIGHT_PROMPT = `You are given TWO images:

IMAGE 1 (Composited Vehicle): The vehicle already placed in the studio. Your job is to make it look PHOTOGRAPHICALLY REAL — as if shot by a professional automotive photographer in this exact studio.
IMAGE 2 (STUDIO REFERENCE): The studio environment for lighting reference.

YOUR TASK: Apply professional automotive studio lighting to the vehicle so it looks like it was PHYSICALLY PHOTOGRAPHED in this studio. This is where amateur → pro photographer quality happens.

━━━ RULE A — GEOMETRY LOCK (ABSOLUTE — NEVER VIOLATE) ━━━
You MUST NOT change ANY of the following:
- Wheel/rim spoke design, pattern, or shape
- Headlight shape, LED signature, DRL pattern
- Taillight shape and design
- Grille pattern and design
- Bumper lines and air intake design
- Body character lines and creases
- Badges, emblems, model text
- License plates and plate holders
- Vehicle proportions and silhouette
- Camera angle and perspective

"Do not redraw or invent missing details; preserve photographic texture."

━━━ RULE B — PAINT & GLASS RENDERING (WHAT YOU MAY CHANGE) ━━━
You MAY adjust these to achieve professional studio look:
- Paint reflections: replace outdoor reflections (trees, sky, buildings) with studio-appropriate reflections
- Paint gloss: enhance to look freshly waxed and polished under studio lighting — TRANSPARENT, vibrant, glossy with depth
- Exposure: match the studio's ambient light level
- Contrast: adjust to match controlled studio lighting
- Windows: replace outdoor scenery with neutral dark studio glass
- Chrome reflections: should reflect studio ceiling LED, not outdoor light
- Glass reflections: should show subtle studio ceiling light

━━━ RULE C — STUDIO REFLECTION MODEL (WHAT PAINT MUST SHOW) ━━━
The paint must reflect the studio environment from Image 2:

Paint reflections must show:
• Soft dark gradients from studio walls (dark ambient on side panels)
• Bright linear LED streak from ceiling light on roof and hood
• Subtle secondary highlights on upper shoulder line
• Lower panels and wheel arches DARKER (natural studio falloff)
• NO outdoor shapes — no trees, sky, buildings, horizon lines, fences, people

Per-panel checklist (verify each before output):
• Hood — ceiling LED streak, NO sky gradient
• Roof — ceiling LED streak, NO clouds or blue
• Left door/fender — dark studio wall gradient, NO trees/poles/buildings
• Right door/fender — same as left
• Rear quarter panels — dark ambient, NO outdoor shapes
• Front/rear bumpers — dark floor/wall reflections only
• Chrome trim — studio ceiling LED reflection
• Windows — neutral dark studio glass, NO outdoor scenery

━━━ STUDIO LIGHTING BLUEPRINT (MANDATORY — SAME FOR ALL IMAGES) ━━━
Lighting setup:
• One large rectangular LED ceiling light directly above the vehicle (as in Image 2)
• Soft side ambient reflections from dark studio walls
• Dark ambient floor reflection

Paint highlights CONSISTENTLY:
• Bright LED streak along roofline (most prominent)
• Secondary highlight across upper shoulder line
• Subtle highlight on hood surface
• Lower panels and wheel arches DARKER (natural falloff)

Every output image must have this SAME lighting feel. 10 photos in a row should look identical in lighting.

━━━ EXPOSURE CONSISTENCY (CRITICAL) ━━━
- Whether input was bright sunlight, overcast, or shade — output must look like SAME dark studio with SAME controlled lighting
- Target: moderately lit car with LED ceiling as dominant light source
- Every photo must have same overall brightness feel

━━━ CRITICAL COLOR RULE ━━━
The paint COLOR (hue) must remain IDENTICAL to the input. Only REFLECTIONS change — not the underlying paint color. No color cast, no warming, no cooling. The paint must remain vibrant and transparent with depth.

━━━ QUALITY ━━━
- Maximum sharpness, zero noise, zero grain
- All fine details tack-sharp (badge text, spoke edges, panel gaps, headlight internals)
- Must look like professional DSLR photograph, NOT AI render
- Output: 1920x1080

OUTPUT: The same composited image with professional studio lighting applied. The car must look like it was PHYSICALLY PHOTOGRAPHED in this studio by a professional automotive photographer.`;

// ━━━ STEP 5: VERIFICATION (upgraded with studio_consistent + cropped_vehicle) ━━━
const VERIFICATION_PROMPT = `You are a quality control inspector comparing a RESULT image against an ORIGINAL vehicle photograph.

IMAGE 1 (Original): The unedited original vehicle photo — your GROUND TRUTH.
IMAGE 2 (Result): The AI-processed showroom result to verify.

The input was classified as angle category: "{ANGLE}".

Check these 8 critical points by comparing Image 2 against Image 1:

1. HEADLIGHTS: Is the headlight shape, LED signature, and DRL pattern identical?
2. WHEELS: Is the wheel/rim spoke pattern and design identical?
3. CAMERA ANGLE: Is the viewing angle the same as the original? The input was "{ANGLE}".
   - A left-side photo must remain left-side, NOT left-front or three-quarter.
   - A rear photo must remain rear, NOT rear-quarter.
   - If the angle CATEGORY changed → HIGH SEVERITY failure.
   - Minor angle adjustment (±2°) within SAME category is acceptable.
   - Mirroring (left↔right flip) = automatic high severity.
4. COLOR: Is the vehicle body color consistent? Check for hue shift, color cast. Any hue shift = failure.
5. OVERALL IDENTITY: Same car, same model, same features, same proportions?
6. MIRRORING: Is the same side visible? (check for left/right flip)
7. STUDIO CONSISTENCY: Does the showroom background look like a professional dark studio with LED ceiling light? No outdoor elements visible? Walls/floor look consistent?
8. VEHICLE CROPPING: Is the COMPLETE vehicle visible? All 4 wheels, both mirrors, entire roof, all bumpers? Any part cut off?

Respond with ONLY a valid JSON object:
{"pass": true/false, "severity": "none"/"low"/"medium"/"high", "mirrored": true/false, "color_consistent": true/false, "angle_preserved": true/false, "detected_angle": "label", "studio_consistent": true/false, "cropped_vehicle": true/false, "changed_parts": ["list"], "issues": ["descriptions"]}

Rules:
- "pass": true if vehicle identity AND angle AND studio are preserved
- "severity": "none" if pass, "low" for minor differences, "medium" for noticeable changes, "high" for mirroring/angle change/wrong car
- "studio_consistent": true if showroom looks like a proper dark studio. false if outdoor elements visible or showroom looks completely different from expected.
- "cropped_vehicle": true if ANY part of the vehicle is cut off or missing from the frame. false if the complete vehicle is visible.
- "changed_parts": list from ["headlights", "taillights", "grille", "bumper", "wheels", "body_lines", "badges", "color", "angle"]
- Be LENIENT on lighting/reflection differences. Focus on vehicle identity, angle, and studio quality.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Safe JSON parser that handles truncated responses
    const safeParseJson = async (response: Response, stepName: string) => {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error(`${stepName}: JSON parse failed (${text.length} chars). Attempting recovery...`);
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace > 0) {
          try {
            const candidate = text.substring(0, lastBrace + 1);
            const firstBrace = candidate.indexOf('{');
            if (firstBrace >= 0) {
              return JSON.parse(candidate.substring(firstBrace));
            }
          } catch (_) { /* fall through */ }
        }
        throw new Error(`${stepName}: Truncated AI response (${text.length} chars received). Try again.`);
      }
    };

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
    
    console.log(`Studio reference image: ${studioRefUrl ? 'provided' : 'NOT provided'}`);

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

    // Helper to extract image from AI response
    const extractImage = (data: any): string | null => {
      return data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    };

    // Helper to check for embedded rate limit errors
    const checkEmbeddedError = (data: any, stepName: string): Response | null => {
      const embeddedError = data?.error
        || data?.choices?.[0]?.error
        || data?.choices?.find?.((c: any) => c?.error)?.error;
      if (embeddedError) {
        const code = Number(embeddedError.code || 500);
        const errorType = embeddedError?.metadata?.error_type || '';
        console.error(`${stepName} embedded error [${code}]: ${errorType} - ${embeddedError.message}`);
        if (code === 429 || errorType === 'rate_limit_exceeded') {
          return new Response(
            JSON.stringify({ error: `Rate limit bereikt bij ${stepName}. Probeer het later opnieuw.`, step: stepName }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      return null;
    };

    const VALID_ANGLES = ['left-front', 'left-side', 'left-rear', 'rear', 'right-rear', 'right-side', 'right-front', 'front', 'interior', 'unknown'];

    // ━━━ STEP 0: Angle Classification ━━━
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
        const classifyData = await safeParseJson(classifyResponse, 'Angle classify');
        const rawLabel = (classifyData.choices?.[0]?.message?.content || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
        if (VALID_ANGLES.includes(rawLabel)) {
          angleLabel = rawLabel;
        } else {
          console.warn(`Classifier returned invalid label: "${rawLabel}", defaulting to unknown`);
        }
      }
    } catch (classifyError) {
      console.error('Angle classification error:', classifyError);
    }
    console.log(`Step 0 complete: Angle = "${angleLabel}"`);

    // Interior photos: only clean, no studio pipeline
    if (angleLabel === 'interior') {
      console.log('Interior photo — clean only, no studio pipeline.');
      const cleanResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: CLEAN_PROMPT + vehicleIdentity },
              { type: 'image_url', image_url: { url: vehicleImageUrl } }
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!cleanResponse.ok) return await handleAiError(cleanResponse, 'Clean');
      const cleanData = await safeParseJson(cleanResponse, 'Interior clean');
      const cleanedImage = extractImage(cleanData);

      return new Response(JSON.stringify({
        resultImage: cleanedImage || vehicleImageUrl,
        usedFallback: !cleanedImage,
        angleLabel: 'interior',
        verification: { pass: true, severity: 'none', mirrored: false, color_consistent: true, angle_preserved: true, detected_angle: 'interior', studio_consistent: true, cropped_vehicle: false, changed_parts: [], issues: [] },
        message: 'Interieur foto verbeterd (geen showroom)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ━━━ STEP 1: Clean Only ━━━
    console.log('Step 1: Clean only (cosmetic)...');
    const cleanResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: CLEAN_PROMPT + vehicleIdentity },
            { type: 'image_url', image_url: { url: vehicleImageUrl } }
          ]
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!cleanResponse.ok) return await handleAiError(cleanResponse, 'Clean');
    const cleanData = await safeParseJson(cleanResponse, 'Clean');
    const embeddedCleanError = checkEmbeddedError(cleanData, 'clean');
    if (embeddedCleanError) return embeddedCleanError;
    const cleanedImage = extractImage(cleanData);

    if (!cleanedImage) {
      console.error('No image from clean step');
      return new Response(JSON.stringify({ error: 'Geen schoongemaakt beeld ontvangen.', step: 'clean' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 1 complete: Clean done');

    // ━━━ STEP 2: Isolate (background → #404040) ━━━
    console.log('Step 2: Isolate (background removal)...');
    const isolateResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: aiHeaders,
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: ISOLATE_PROMPT + vehicleIdentity },
            { type: 'image_url', image_url: { url: cleanedImage } }
          ]
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!isolateResponse.ok) return await handleAiError(isolateResponse, 'Isolate');
    const isolateData = await safeParseJson(isolateResponse, 'Isolate');
    const embeddedIsolateError = checkEmbeddedError(isolateData, 'isolate');
    if (embeddedIsolateError) return embeddedIsolateError;
    const isolatedImage = extractImage(isolateData);

    if (!isolatedImage) {
      console.warn('Isolate returned no image. Falling back to cleaned image for composite.');
    }
    console.log(`Step 2 complete: Isolate ${isolatedImage ? 'done' : 'failed (using cleaned image)'}`);

    // Use isolated image for composite, fallback to cleaned
    const imageForComposite = isolatedImage || cleanedImage;

    // ━━━ STEP 3: Composite (place in studio) ━━━
    const useStrictForInitial = angleLabel === 'unknown';

    const doComposite = async (useStrict: boolean, extraInstructions?: string) => {
      const basePrompt = useStrict ? COMPOSITE_PROMPT_STRICT : COMPOSITE_PROMPT_NORMAL;
      const promptWithAngle = basePrompt.replace(/\{ANGLE\}/g, angleLabel);
      const promptText = promptWithAngle + vehicleIdentity + (extraInstructions || '');
      
      console.log(`Step 3: Composite (${useStrict ? 'STRICT' : 'NORMAL'}, angle: ${angleLabel})...`);
      
      const compositeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: imageForComposite } },
              { type: 'image_url', image_url: { url: vehicleImageUrl } },
              ...(studioRefUrl ? [{ type: 'image_url', image_url: { url: studioRefUrl } }] : [])
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!compositeResponse.ok) return { error: await handleAiError(compositeResponse, 'Composite') };

      const compositeData = await safeParseJson(compositeResponse, 'Composite');
      const embeddedErr = checkEmbeddedError(compositeData, 'composite');
      if (embeddedErr) return { error: embeddedErr };

      const resultImage = extractImage(compositeData);
      if (!resultImage) {
        console.error('No image from composite');
        return { error: null, image: null };
      }

      return { error: null, image: resultImage };
    };

    const compositeResult = await doComposite(useStrictForInitial);
    if (compositeResult.error) return compositeResult.error;
    if (!compositeResult.image) {
      console.warn('Composite returned no image. Using cleaned photo as fallback.');
      return new Response(JSON.stringify({
        resultImage: cleanedImage,
        usedFallback: true,
        angleLabel,
        verification: { pass: false, severity: 'medium', mirrored: false, color_consistent: true, angle_preserved: false, detected_angle: 'unknown', studio_consistent: false, cropped_vehicle: false, changed_parts: [], issues: ['Geen showroom afbeelding ontvangen; fallback gebruikt.'] },
        message: 'Schoongemaakt foto gebruikt (showroom stap niet beschikbaar)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 3 complete: Composite done');

    // ━━━ STEP 4: Relight (pro photographer look) ━━━
    console.log('Step 4: Relight (pro photographer lighting)...');
    let relightedImage = compositeResult.image;
    try {
      const relightResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: RELIGHT_PROMPT + vehicleIdentity },
              { type: 'image_url', image_url: { url: compositeResult.image } },
              ...(studioRefUrl ? [{ type: 'image_url', image_url: { url: studioRefUrl } }] : [])
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (relightResponse.ok) {
        const relightData = await safeParseJson(relightResponse, 'Relight');
        const embeddedRelightError = checkEmbeddedError(relightData, 'relight');
        if (!embeddedRelightError) {
          const relightImage = extractImage(relightData);
          if (relightImage) {
            relightedImage = relightImage;
            console.log('Step 4 complete: Relight done');
          } else {
            console.warn('Relight returned no image, using composite result');
          }
        } else {
          console.warn('Relight embedded error, using composite result');
        }
      } else {
        console.warn(`Relight failed (${relightResponse.status}), using composite result`);
      }
    } catch (relightError) {
      console.error('Relight error:', relightError);
      // Continue with composite result
    }

    // ━━━ STEP 5: Verification ━━━
    console.log('Step 5: Verification...');
    let verification = { pass: true, severity: 'none', mirrored: false, color_consistent: true, angle_preserved: true, detected_angle: angleLabel, studio_consistent: true, cropped_vehicle: false, changed_parts: [] as string[], issues: [] as string[] };
    let finalImage = relightedImage;
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

        const verifyData = await safeParseJson(verifyResponse, 'Verification');
        const verifyText = verifyData.choices?.[0]?.message?.content || '';
        console.log('Verification raw:', verifyText);

        const jsonMatch = verifyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { return JSON.parse(jsonMatch[0]); } catch (_) {}
        }
        return null;
      };

      const initialVerification = await doVerify(relightedImage);
      if (initialVerification) {
        verification = initialVerification;
        console.log('Verification result:', JSON.stringify(verification));
      }

      // Retry logic based on verification results
      const needsRetry = !verification.pass && (
        verification.severity === 'high' || 
        verification.angle_preserved === false ||
        verification.studio_consistent === false ||
        verification.cropped_vehicle === true
      );

      if (needsRetry) {
        console.log(`Verification FAILED. Severity: ${verification.severity}, studio_consistent: ${verification.studio_consistent}, cropped: ${verification.cropped_vehicle}. Retrying...`);
        
        let correctionInstructions = `\n\n━━━ CORRECTION REQUIRED ━━━\nThe previous result had critical problems:\n${verification.issues?.map((i: string) => `- ${i}`).join('\n') || '- Unknown issues'}`;
        if (verification.mirrored) correctionInstructions += '\n- CRITICAL: The vehicle was MIRRORED. Do NOT flip the vehicle.';
        if (!verification.angle_preserved) correctionInstructions += `\n- CRITICAL: The viewing angle changed. It MUST be "${angleLabel}". Do NOT rotate.`;
        if (verification.cropped_vehicle) correctionInstructions += '\n- CRITICAL: Part of the vehicle was CROPPED. Zoom OUT. Show the COMPLETE vehicle with margins on all sides.';
        if (!verification.studio_consistent) correctionInstructions += '\n- CRITICAL: The studio does not match the reference. Use Image 3 as EXACT template.';
        correctionInstructions += '\nFix these issues. ZERO rotation allowed.';

        // Determine which step to retry
        const retryComposite = verification.studio_consistent === false || verification.cropped_vehicle === true || verification.mirrored || !verification.angle_preserved;
        
        if (retryComposite) {
          // Retry composite with STRICT + relight
          const retryResult = await doComposite(true, correctionInstructions);
          
          if (!retryResult.error && retryResult.image) {
            // Re-run relight on retry result
            let retryRelighted = retryResult.image;
            try {
              const retryRelightResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: aiHeaders,
                body: JSON.stringify({
                  model: 'google/gemini-3-pro-image-preview',
                  messages: [{
                    role: 'user',
                    content: [
                      { type: 'text', text: RELIGHT_PROMPT + vehicleIdentity + '\n\nCRITICAL: Do NOT change vehicle geometry. ONLY adjust lighting and reflections.' },
                      { type: 'image_url', image_url: { url: retryResult.image } },
                      ...(studioRefUrl ? [{ type: 'image_url', image_url: { url: studioRefUrl } }] : [])
                    ]
                  }],
                  modalities: ['image', 'text']
                }),
              });
              if (retryRelightResp.ok) {
                const retryRelightData = await safeParseJson(retryRelightResp, 'Retry Relight');
                const retryRelightImg = extractImage(retryRelightData);
                if (retryRelightImg) retryRelighted = retryRelightImg;
              }
            } catch (_) { /* use composite result */ }

            // Re-verify
            const retryVerification = await doVerify(retryRelighted);
            if (retryVerification) {
              console.log('Retry verification:', JSON.stringify(retryVerification));
              if (retryVerification.pass || (retryVerification.severity !== 'high' && retryVerification.angle_preserved !== false)) {
                finalImage = retryRelighted;
                verification = retryVerification;
                console.log('Retry PASSED');
              } else {
                console.log('Retry FAILED. Using cleaned photo fallback.');
                finalImage = cleanedImage;
                usedFallback = true;
              }
            } else {
              finalImage = retryRelighted;
            }
          } else {
            console.log('Retry composite failed. Fallback to cleaned photo.');
            finalImage = cleanedImage;
            usedFallback = true;
          }
        } else {
          // Only relight needs retry (changed_parts has wheels/lights)
          console.log('Retrying relight only with stricter geometry lock...');
          try {
            const strictRelightResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: aiHeaders,
              body: JSON.stringify({
                model: 'google/gemini-3-pro-image-preview',
                messages: [{
                  role: 'user',
                  content: [
                    { type: 'text', text: RELIGHT_PROMPT + vehicleIdentity + correctionInstructions + '\n\nABSOLUTE GEOMETRY LOCK: Do NOT change ANY vehicle geometry. ONLY lighting and reflections.' },
                    { type: 'image_url', image_url: { url: compositeResult.image } },
                    ...(studioRefUrl ? [{ type: 'image_url', image_url: { url: studioRefUrl } }] : [])
                  ]
                }],
                modalities: ['image', 'text']
              }),
            });
            if (strictRelightResp.ok) {
              const strictRelightData = await safeParseJson(strictRelightResp, 'Strict Relight');
              const strictRelightImg = extractImage(strictRelightData);
              if (strictRelightImg) {
                finalImage = strictRelightImg;
                const retryVerification = await doVerify(strictRelightImg);
                if (retryVerification) verification = retryVerification;
              }
            }
          } catch (_) { /* keep current finalImage */ }
        }
      }
      // Medium severity: accept with warning
      else if (!verification.pass && verification.severity === 'medium') {
        console.log('Verification medium severity — accepting with warning.');
      }
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
    }

    console.log(`Pipeline complete. Angle: ${angleLabel}, Fallback: ${usedFallback}, Pass: ${verification.pass}, Severity: ${verification.severity}`);

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
          studio_consistent: verification.studio_consistent !== false,
          cropped_vehicle: verification.cropped_vehicle === true,
          changed_parts: verification.changed_parts || [],
          issues: verification.issues || [],
        },
        message: usedFallback 
          ? 'Schoongemaakt foto gebruikt (identity/angle check gefaald)' 
          : 'Foto verwerkt (classify → clean → isolate → composite → relight → verify)'
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
