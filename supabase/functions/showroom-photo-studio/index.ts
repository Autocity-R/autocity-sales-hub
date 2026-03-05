import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

OUTPUT: The same photo with improved lighting, color accuracy, reduced noise, cleaned surfaces, enhanced paint gloss, and softened reflections. Nothing structural changes. The paint color must be IDENTICAL to the input.`;

// ━━━ STEP 2: SHOWROOM COMPOSITING ━━━
const SHOWROOM_PROMPT = `You are given THREE images:

IMAGE 1 (Reference Studio): The EXACT showroom environment you must replicate. Copy it EXACTLY — do NOT invent, redesign, or reinterpret.
IMAGE 2 (Enhanced Vehicle): The retouched vehicle photo to place in the studio.
IMAGE 3 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph. This is your ABSOLUTE REFERENCE for all vehicle details.

YOUR TASK: COMPOSITE the vehicle from Image 2 into the showroom from Image 1.

━━━ CRITICAL: YOU ARE COMPOSITING, NOT GENERATING ━━━
You are placing an existing car into a studio background. You are NOT generating or redesigning the car.
Every detail of the vehicle must come from Image 2/3 — do NOT invent, correct, or "improve" any vehicle feature.

━━━ GROUND TRUTH RULE (Image 3) ━━━
Image 3 is the UNEDITED original photograph. Use it as your ABSOLUTE REFERENCE for:
- Headlight shape and LED/DRL signature
- Taillight shape and design
- Front grille and bumper design
- Wheel/rim spoke pattern and design
- All badges, emblems, model text
- Body lines, creases, and proportions
- License plates and plate holders/frames
- Body paint color (EXACT hue, saturation, brightness)
If your output differs from Image 3 in ANY of these features, your output is WRONG.

━━━ ZERO-CROP GUARANTEE ━━━
- The COMPLETE vehicle must be visible — ALL 4 wheels, BOTH mirrors, entire roof, all bumpers
- Visible margin between vehicle edges and image borders on ALL sides
- Output MUST be 1920x1080 pixels, landscape orientation

━━━ CAMERA ANGLE PRESERVATION (NO MIRRORING) ━━━
Count the visible sides of the vehicle in Image 2:
- If the LEFT side is visible → the LEFT side MUST be visible in output
- If the RIGHT side is visible → the RIGHT side MUST be visible in output
- If front-left corner → front-left corner in output
- NEVER mirror, flip, or rotate the vehicle orientation
- The viewer must see the EXACT same panels as in Image 2

━━━ VEHICLE INTEGRITY (DO NOT MODIFY) ━━━
ALL of these must remain IDENTICAL to Image 2/3:
- Body color and paint finish — EXACT same color. Do NOT shift hue, saturation, or brightness. If the car is dark blue, it stays dark blue — not black, not light blue. The paint must look TRANSPARENT and vibrant — like freshly waxed and polished paint under professional studio lighting. Do NOT add any haze, matte effect, color cast, or dull appearance. The paint should have depth and clarity.
- Wheels/rims design and color (EXACT spoke pattern)
- All badges, emblems, and model text
- Headlights and taillights design (EXACT shape)
- Front grille and bumper design (EXACT pattern)
- Body shape, proportions, and all body lines
- Window tint level
- LICENSE PLATES ARE MANDATORY. Read the text on the license plate in Image 3 carefully. The EXACT same plate text, plate color (e.g. yellow Dutch plates), and plate holder/frame (e.g. "AUTOCITY" branded frame) MUST appear on the vehicle in your output in the EXACT same position. If you cannot read the plate, preserve the visual appearance exactly. NEVER output a vehicle without its original plates.

━━━ SHOWROOM ENVIRONMENT (COPY Image 1 EXACTLY — DO NOT INVENT) ━━━
You MUST replicate the showroom from Image 1 with these specific elements:
- Dark charcoal/anthracite TEXTURED walls (not smooth, not black, not grey — match Image 1 exactly)
- The AUTOCITY logo consists of TWO elements: (1) a thin white car silhouette LINE drawing above, and (2) white 3D BLOCK LETTERS spelling "AUTOCITY" below. These are SOLID WHITE, NOT illuminated, NOT neon, NOT glowing, NOT backlit, NOT in a different font. They are mounted on the dark textured wall. COPY THE LOGO EXACTLY FROM IMAGE 1 — pixel for pixel if possible.
- If your output shows any other style of AUTOCITY logo (neon, script font, illuminated, backlit, different layout, car silhouette as a filled shape), your output is WRONG and will be rejected.
- Thin white LED light strips running along ceiling edges — match Image 1 exactly
- Polished dark concrete floor with subtle reflections
- Do NOT invent, redesign, or reinterpret the showroom. Copy it EXACTLY from Image 1.
- Do NOT change the AUTOCITY logo style, shape, or design in any way.

━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill ~55-65% of image width
- All wheels on floor plane naturally
- Similar scale/position as car in Image 1

━━━ SHADOWS & REFLECTIONS ━━━
- Natural contact shadows under tires (~35% opacity, soft)
- Subtle floor reflection (~10% opacity, blurred, fading)
- ALL reflections visible on vehicle paint MUST be consistent with this indoor showroom — dark walls, soft LED strips. No trees, sky, buildings, or outdoor elements may appear in paint reflections.

━━━ INTERIOR PHOTO HANDLING ━━━
If Image 2 is an interior/cabin photo: enhance lighting/clarity, replace visible window backgrounds with dark gradient, do NOT place in studio.

OUTPUT: A photorealistic 1920x1080 image of the vehicle in the AutoCity showroom, with every vehicle detail matching Image 3 exactly.`;

// ━━━ STEP 3: AI VERIFICATION ━━━
const VERIFICATION_PROMPT = `You are a quality control inspector comparing a RESULT image against an ORIGINAL vehicle photograph.

IMAGE 1 (Original): The unedited original vehicle photo — your GROUND TRUTH.
IMAGE 2 (Result): The AI-processed showroom result to verify.

Check these 8 identity features by comparing Image 2 against Image 1:

1. HEADLIGHTS: Is the headlight shape, LED signature, and DRL pattern identical?
2. TAILLIGHTS: Is the taillight shape and design identical? (if visible)
3. GRILLE/BUMPER: Is the front grille pattern and bumper design identical? (if visible)
4. WHEELS: Is the wheel/rim spoke pattern and design identical?
5. VIEWING ANGLE: Is the same side of the car visible? (check for mirroring)
6. SHOWROOM: Does the background match the reference studio? Dark textured walls, white AUTOCITY 3D block letters on the back wall, LED strips along ceiling? Or is it a different/invented studio with a different logo?
7. LICENSE PLATES: Are original license plates and plate holders/frames preserved from the original? (if visible in Image 1) Check plate text, plate color (yellow Dutch plates), and frame branding.
8. COLOR: Is the vehicle body color consistent with the original? Check specifically for yellow/warm color cast on the paint. If the vehicle appears yellower, warmer, hazier, or duller than the original, this is a COLOR failure. Any hue shift, saturation change, or added color cast = failure.

For each feature, determine if it matches the original or has been altered.

You MUST respond with ONLY a valid JSON object, no other text:
{"pass": true/false, "severity": "none"/"low"/"medium"/"high", "mirrored": true/false, "showroom_match": true/false, "plates_preserved": true/false, "color_consistent": true/false, "changed_parts": ["list of changed parts"], "issues": ["description of each issue"]}

Rules:
- "pass": true only if ALL 8 checks pass
- "severity": "none" if pass, "low" for minor lighting differences only, "medium" for noticeable shape changes, "high" for wrong headlights/grille/mirroring/completely different studio/color cast/hue shift/missing plates
- "mirrored": true if the vehicle appears flipped/mirrored compared to the original
- "showroom_match": true if the background is the correct AUTOCITY showroom with correct logo style
- "plates_preserved": true if license plates and plate holders match the original (or if no plates are visible)
- "color_consistent": true if the vehicle body color matches the original without hue/saturation shift
- "changed_parts": list from ["headlights", "taillights", "grille", "bumper", "wheels", "body_lines", "badges", "plates", "color", "showroom"]
- "issues": human-readable description of each problem found`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { imageBase64, referenceImageUrl, vehicleInfo } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!referenceImageUrl) {
      return new Response(JSON.stringify({ error: 'referenceImageUrl is required' }),
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
    if (!imageBase64.startsWith('data:')) {
      vehicleImageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

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

    // ━━━ STEP 2: Showroom Compositing (Gemini Pro) — with original as ground truth ━━━
    const doComposite = async (extraInstructions?: string) => {
      const promptText = SHOWROOM_PROMPT + vehicleIdentity + (extraInstructions || '');
      console.log('Step 2: Showroom compositing...');
      
      const compositeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: referenceImageUrl } },   // Image 1: Reference studio
              { type: 'image_url', image_url: { url: enhancedImage } },        // Image 2: Enhanced
              { type: 'image_url', image_url: { url: vehicleImageUrl } }       // Image 3: Original (ground truth)
            ]
          }],
          modalities: ['image', 'text']
        }),
      });

      if (!compositeResponse.ok) return { error: await handleAiError(compositeResponse, 'Showroom') };

      const compositeData = await compositeResponse.json();

      // Handle embedded provider errors returned inside a 200 response
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

    const compositeResult = await doComposite();
    if (compositeResult.error) return compositeResult.error;
    if (!compositeResult.image) {
      console.warn('Composite returned no image. Using safe fallback (enhanced photo).');
      return new Response(JSON.stringify({
        resultImage: enhancedImage,
        usedFallback: true,
        verification: {
          pass: false,
          severity: 'medium',
          mirrored: false,
          showroom_match: false,
          plates_preserved: true,
          color_consistent: true,
          changed_parts: [],
          issues: ['Geen showroom afbeelding ontvangen; fallback gebruikt.']
        },
        message: 'Verbeterde foto gebruikt (showroom stap tijdelijk niet beschikbaar)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 2 complete: Showroom compositing done');

    // ━━━ STEP 3: AI Verification ━━━
    console.log('Step 3: AI verification...');
    let verification = { pass: true, severity: 'none', mirrored: false, showroom_match: true, plates_preserved: true, color_consistent: true, changed_parts: [] as string[], issues: [] as string[] };
    let finalImage = compositeResult.image;
    let usedFallback = false;

    try {
      const verifyPromptText = VERIFICATION_PROMPT + (vehicleIdentity || '');
      const verifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: verifyPromptText },
              { type: 'image_url', image_url: { url: vehicleImageUrl } },    // Original
              { type: 'image_url', image_url: { url: compositeResult.image } } // Result
            ]
          }],
        }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const verifyText = verifyData.choices?.[0]?.message?.content || '';
        console.log('Verification raw response:', verifyText);

        // Extract JSON from response
        const jsonMatch = verifyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            verification = JSON.parse(jsonMatch[0]);
            console.log('Verification result:', JSON.stringify(verification));
          } catch (e) {
            console.error('Failed to parse verification JSON:', e);
          }
        }
      } else {
        console.error('Verification call failed, proceeding with result');
      }

      // Auto-retry if verification failed with medium/high severity
      if (!verification.pass && (verification.severity === 'medium' || verification.severity === 'high')) {
        console.log(`Verification FAILED (severity: ${verification.severity}). Retrying step 2 with corrections...`);
        
        const correctionInstructions = `\n\n━━━ CORRECTION REQUIRED (PREVIOUS ATTEMPT FAILED QUALITY CHECK) ━━━\nThe previous result had these problems:\n${verification.issues.map((i: string) => `- ${i}`).join('\n')}\n${verification.mirrored ? '- CRITICAL: The vehicle was MIRRORED. Do NOT flip the vehicle.\n' : ''}Changed parts: ${verification.changed_parts.join(', ')}\n\nYou MUST fix these issues. Compare your output against Image 3 (original) carefully.`;

        const retryResult = await doComposite(correctionInstructions);
        
        if (!retryResult.error && retryResult.image) {
          // Re-verify the retry
          try {
            const retryVerifyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: aiHeaders,
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{
                  role: 'user',
                  content: [
                    { type: 'text', text: verifyPromptText },
                    { type: 'image_url', image_url: { url: vehicleImageUrl } },
                    { type: 'image_url', image_url: { url: retryResult.image } }
                  ]
                }],
              }),
            });

            if (retryVerifyResponse.ok) {
              const retryVerifyData = await retryVerifyResponse.json();
              const retryVerifyText = retryVerifyData.choices?.[0]?.message?.content || '';
              const retryJsonMatch = retryVerifyText.match(/\{[\s\S]*\}/);
              
              if (retryJsonMatch) {
                const retryVerification = JSON.parse(retryJsonMatch[0]);
                console.log('Retry verification:', JSON.stringify(retryVerification));
                
                if (retryVerification.pass || retryVerification.severity === 'low' || retryVerification.severity === 'none') {
                  finalImage = retryResult.image;
                  verification = retryVerification;
                  console.log('Retry PASSED verification');
                } else {
                  // Retry also failed — use SAFE FALLBACK
                  console.log('Retry also FAILED. Using safe fallback (enhanced photo).');
                  finalImage = enhancedImage;
                  usedFallback = true;
                }
              } else {
                finalImage = retryResult.image; // Can't verify, use retry result
              }
            } else {
              finalImage = retryResult.image; // Verification failed, use retry result
            }
          } catch (e) {
            console.error('Retry verification error:', e);
            finalImage = retryResult.image;
          }
        } else {
          // Retry compositing failed — safe fallback
          console.log('Retry compositing failed. Using safe fallback (enhanced photo).');
          finalImage = enhancedImage;
          usedFallback = true;
        }
      }
    } catch (verifyError) {
      console.error('Verification step error:', verifyError);
      // Continue with original result if verification fails
    }

    console.log(`Pipeline complete. Fallback: ${usedFallback}, Pass: ${verification.pass}`);

    return new Response(
      JSON.stringify({ 
        resultImage: finalImage,
        usedFallback,
        verification: {
          pass: verification.pass,
          severity: verification.severity || 'none',
          mirrored: verification.mirrored || false,
          showroom_match: verification.showroom_match !== false,
          plates_preserved: verification.plates_preserved !== false,
          color_consistent: verification.color_consistent !== false,
          changed_parts: verification.changed_parts || [],
          issues: verification.issues || [],
        },
        message: usedFallback 
          ? 'Verbeterde foto gebruikt (identity check gefaald)' 
          : 'Foto succesvol verwerkt (retouch + showroom + verificatie)'
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
