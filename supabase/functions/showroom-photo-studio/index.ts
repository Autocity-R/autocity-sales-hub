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

// ━━━ STEP 2: SHOWROOM BACKGROUND REPLACEMENT (SIMPLIFIED — AI does LESS) ━━━
const SHOWROOM_PROMPT = `You are given TWO images:

IMAGE 1 (Enhanced Vehicle): The retouched vehicle photo to place in a showroom.
IMAGE 2 (Original Vehicle — GROUND TRUTH): The UNEDITED original photograph. This is your ABSOLUTE REFERENCE for all vehicle details.

YOUR TASK: Replace the background around the vehicle with a dark, professional car dealership showroom environment.

━━━ SHOWROOM ENVIRONMENT (SIMPLE — DO NOT OVER-DESIGN) ━━━
- Dark charcoal/anthracite walls — smooth or subtly textured
- Polished dark floor with subtle vehicle reflection
- Soft, even overhead LED lighting — no harsh spots
- Clean, minimal, professional atmosphere
- Do NOT add any logos, text, branding, or specific architectural details
- Do NOT add any people, props, or decorative elements
- Keep it SIMPLE: dark walls, dark floor, soft light. Nothing else.

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

━━━ CAMERA ANGLE PRESERVATION (NO MIRRORING) ━━━
- If the LEFT side is visible in Image 1 → LEFT side visible in output
- If the RIGHT side is visible → RIGHT side in output
- NEVER mirror, flip, or rotate the vehicle orientation

━━━ ZERO-CROP GUARANTEE ━━━
- The COMPLETE vehicle must be visible — ALL 4 wheels, BOTH mirrors, entire roof, all bumpers
- Visible margin between vehicle edges and image borders on ALL sides
- Output MUST be 1920x1080 pixels, landscape orientation

━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill ~55-65% of image width
- All wheels on floor plane naturally

━━━ SHADOWS & REFLECTIONS ━━━
- Natural contact shadows under tires (~35% opacity, soft)
- Subtle floor reflection (~10% opacity, blurred, fading)
- All reflections on vehicle paint must be consistent with indoor showroom — no trees, sky, buildings.

━━━ INTERIOR PHOTO HANDLING ━━━
If Image 1 is an interior/cabin photo: enhance lighting/clarity, replace visible window backgrounds with dark gradient, do NOT place in studio.

OUTPUT: A photorealistic 1920x1080 image of the vehicle in a clean, dark showroom. Every vehicle detail must match Image 2 exactly.`;

// ━━━ STEP 3: AI VERIFICATION (SIMPLIFIED — fewer checks, less strict) ━━━
const VERIFICATION_PROMPT = `You are a quality control inspector comparing a RESULT image against an ORIGINAL vehicle photograph.

IMAGE 1 (Original): The unedited original vehicle photo — your GROUND TRUTH.
IMAGE 2 (Result): The AI-processed showroom result to verify.

Check these 5 critical identity features by comparing Image 2 against Image 1:

1. HEADLIGHTS: Is the headlight shape, LED signature, and DRL pattern identical?
2. WHEELS: Is the wheel/rim spoke pattern and design identical?
3. MIRRORING: Is the same side of the car visible? (check for left/right flip)
4. COLOR: Is the vehicle body color consistent with the original? Check for yellow/warm color cast. Any hue shift = failure.
5. OVERALL IDENTITY: Does the result still look like the same car? (same model, same features, same proportions)

You MUST respond with ONLY a valid JSON object, no other text:
{"pass": true/false, "severity": "none"/"low"/"medium"/"high", "mirrored": true/false, "color_consistent": true/false, "changed_parts": ["list of changed parts"], "issues": ["description of each issue"]}

Rules:
- "pass": true if the car identity is preserved (minor background/lighting differences are OK)
- "severity": "none" if pass, "low" for minor lighting differences, "medium" for noticeable feature changes, "high" ONLY for mirroring or completely wrong car
- "mirrored": true if the vehicle appears flipped compared to the original
- "color_consistent": true if body color matches without hue/saturation shift
- "changed_parts": list from ["headlights", "taillights", "grille", "bumper", "wheels", "body_lines", "badges", "color"]
- "issues": human-readable description of each problem found

IMPORTANT: Be LENIENT on background/showroom details. Focus ONLY on the vehicle itself. Minor lighting or reflection differences are acceptable and should NOT cause failure.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { imageBase64, vehicleInfo } = await req.json();
    
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

    // ━━━ STEP 2: Background Replacement (Gemini Pro) — only 2 images now ━━━
    const doComposite = async (extraInstructions?: string) => {
      const promptText = SHOWROOM_PROMPT + vehicleIdentity + (extraInstructions || '');
      console.log('Step 2: Background replacement...');
      
      const compositeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders,
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: enhancedImage } },        // Image 1: Enhanced
              { type: 'image_url', image_url: { url: vehicleImageUrl } }       // Image 2: Original (ground truth)
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
          color_consistent: true,
          changed_parts: [],
          issues: ['Geen showroom afbeelding ontvangen; fallback gebruikt.']
        },
        message: 'Verbeterde foto gebruikt (showroom stap tijdelijk niet beschikbaar)'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Step 2 complete: Background replacement done');

    // ━━━ STEP 3: AI Verification (simplified) ━━━
    console.log('Step 3: AI verification...');
    let verification = { pass: true, severity: 'none', mirrored: false, color_consistent: true, changed_parts: [] as string[], issues: [] as string[] };
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

      // Auto-retry ONLY for high severity (mirroring or completely wrong car)
      if (!verification.pass && verification.severity === 'high') {
        console.log(`Verification FAILED (severity: high). Retrying step 2...`);
        
        const correctionInstructions = `\n\n━━━ CORRECTION REQUIRED ━━━\nThe previous result had critical problems:\n${verification.issues.map((i: string) => `- ${i}`).join('\n')}\n${verification.mirrored ? '- CRITICAL: The vehicle was MIRRORED. Do NOT flip the vehicle.\n' : ''}\nYou MUST fix these issues. Compare against Image 2 (original) carefully.`;

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
                
                if (retryVerification.pass || retryVerification.severity !== 'high') {
                  finalImage = retryResult.image;
                  verification = retryVerification;
                  console.log('Retry PASSED verification');
                } else {
                  // Retry also failed with high severity — use SAFE FALLBACK
                  console.log('Retry also FAILED with high severity. Using safe fallback.');
                  finalImage = enhancedImage;
                  usedFallback = true;
                }
              } else {
                finalImage = retryResult.image;
              }
            } else {
              finalImage = retryResult.image;
            }
          } catch (e) {
            console.error('Retry verification error:', e);
            finalImage = retryResult.image;
          }
        } else {
          console.log('Retry compositing failed. Using safe fallback.');
          finalImage = enhancedImage;
          usedFallback = true;
        }
      }
      // Medium severity: accept the result with a warning (NO fallback)
      else if (!verification.pass && verification.severity === 'medium') {
        console.log('Verification medium severity — accepting result with warning.');
        // Keep finalImage as-is, don't fallback
      }
    } catch (verifyError) {
      console.error('Verification step error:', verifyError);
    }

    console.log(`Pipeline complete. Fallback: ${usedFallback}, Pass: ${verification.pass}, Severity: ${verification.severity}`);

    return new Response(
      JSON.stringify({ 
        resultImage: finalImage,
        usedFallback,
        verification: {
          pass: verification.pass,
          severity: verification.severity || 'none',
          mirrored: verification.mirrored || false,
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
