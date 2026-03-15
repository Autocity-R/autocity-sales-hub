import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const BOARD_SECTION = `═══════════════════════════════════════════════════
STEP 4 — AUTOCITY DEALER BOARD (CONDITIONAL)
═══════════════════════════════════════════════════
Determine the camera angle from the input photo. Then apply these rules:

IF front or rear bumper is visible (any angle where a license plate area is visible):
• Place an AutoCity dealer board on the bumper
• Shape: horizontal rectangle, 3:1 width-to-height ratio
• Background: solid matte black — no gradients, no texture
• Text line 1: "AUTOCITY" — uppercase, centered, bold modern sans-serif font, pure white (#FFFFFF)
• Text line 2: "AUTOCITY" — smaller, centered, same font, light grey (#AAAAAA)
• Border: thin silver/chrome border, uniform on all four sides
• Size: approximately equal to a standard European license plate (520mm × 110mm equivalent)
• Finish: subtle studio light reflection visible on the board surface
• Front bumper visible → mount board on front bumper, centered, at license plate height, overlapping original license plate
• Rear bumper visible → mount board on rear bumper, centered, at license plate height, overlapping original license plate
• The board must look physically attached to the bumper, not floating

IF side view only (90° or 270° — no bumper visible):
• DO NOT place any board or sign anywhere on the vehicle`

function buildFirstPhotoPrompt(): string {
  return `ROLE: You are a forensic automotive photo compositor with 20 years of experience producing legally binding advertisement imagery for car dealerships. Your output will be used in official sales listings on AutoScout24, Marktplaats and AutoTrack24. Errors are not permitted.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY AND LOCK THE VEHICLE
═══════════════════════════════════════════════════
Before doing anything else, study the input photo and memorize every detail:
• Make, model, and generation (e.g. "Volvo XC40 T5 Plug-in Hybrid, 1st gen")
• Exact paint color and finish (e.g. "Fjord Blue metallic, medium blue-grey with subtle metallic flake")
• Wheel design: count every spoke precisely, note spoke geometry (straight/curved/split/Y-shape), spoke width relative to gap, center cap logo and design, rim edge finish (polished/matte/painted)
• Front grille: exact mesh or bar pattern, surround shape, brand badge position and design
• Rear design: exact tail light shape and pattern, diffuser, exhaust tips, spoiler, rear badge
• All visible manufacturer badges, trim strips, roof rails, mirror caps, door handles
• Body trim color (black cladding, chrome, body-color)
• The exact camera viewing angle of this photo in degrees: front-right ≈ 45°, side-left = 90°, rear-left ≈ 135°, rear = 180°, rear-right ≈ 225°, side-right = 270°, front-left ≈ 315°, front = 0°

This identification is your CONTRACT. You are legally bound to reproduce every item identically.

═══════════════════════════════════════════════════
STEP 2 — THE VEHICLE IS A NO-TOUCH ZONE
═══════════════════════════════════════════════════
Draw a precise pixel-level boundary around the entire vehicle — every wheel arch, every mirror, every antenna tip, every door handle.
NOTHING inside this boundary may be altered, redrawn, recolored, relit, or reinterpreted.

ZERO TOLERANCE VIOLATIONS (any of these makes the image unusable and must be rejected):
✗ Different spoke count or spoke shape than the original
✗ Different paint shade — even 5% lighter or darker is rejected
✗ Different grille mesh, surround, or badge design
✗ Different manufacturer logo or trim detail (e.g. Volvo iron mark must remain identical)
✗ Different camera angle — the output must show the car from the EXACT SAME ANGLE as the input
✗ Car appears "pasted in" or floating — it must look physically present in the room
✗ Car lighting does not match the showroom lighting direction

CRITICAL — DO NOT apply "same lighting on the car" from the original photo. Instead:
The car must receive NEW realistic lighting from the showroom spotlights above. The showroom has 3 warm spotlights pointing at the back wall. The car receives warm overhead light from these spots, creating natural highlights on the roof, hood and body panels, with soft shadows underneath the car on the floor. This makes the car look physically present in the room.

═══════════════════════════════════════════════════
STEP 3 — RECREATE THE AUTOCITY SHOWROOM EXACTLY
═══════════════════════════════════════════════════
Replace everything outside the vehicle boundary with this EXACT showroom environment. Every element below is mandatory. No creative interpretation is permitted.

CEILING:
• Color: light grey / off-white (approximately #C8C8C8) — NOT black, NOT dark grey, NOT white
• Texture: smooth plaster ceiling, no visible texture
• A single straight black metal track rail runs horizontally across the full width of the ceiling, positioned approximately 20% from the top of the image
• On this track rail: 4 to 5 black cylindrical track spotlight fixtures, evenly spaced, all pointing downward-forward toward the back wall
• The track rail and fixtures are clearly visible against the light grey ceiling

BACK WALL:
• Color: medium-dark grey with micro-cement / tadelakt texture (approximately #6B6B6B to #787878)
• NOT black, NOT charcoal, NOT light grey — medium dark grey
• Texture: subtle micro-cement plaster texture, slightly uneven surface
• Lighting on wall: EXACTLY 3 large soft warm white spotlight pools, evenly spaced horizontally across the full width of the wall
• Each spotlight pool: soft-edged circular/oval warm white glow, approximately 40% of wall height in diameter
• The pools are created by the ceiling spotlights shining down onto the wall
• Between the pools: the wall returns to its medium-dark grey base color

SIDE WALLS:
• Same medium-dark grey micro-cement texture as the back wall
• No additional lighting on side walls
• Side walls are partially visible at the left and right edges of the image

FLOOR:
• Color: dark polished concrete, approximately #3A3A3A to #454545
• Texture: smooth polished concrete with a subtle matte sheen
• Reflection: a very subtle, low-opacity reflection of the car's underside is visible directly below the car — NOT a mirror reflection, NOT a glossy floor — just a faint matte sheen that suggests a polished surface
• The floor extends naturally to the base of all walls

ROOM GEOMETRY:
• Wide rectangular room, approximately 3x the width of the car
• The car is centered horizontally in the room
• The car sits directly on the floor with natural contact — no floating, no gap between tires and floor
• Natural contact shadow under each tire and along the underside of the car

${BOARD_SECTION}

═══════════════════════════════════════════════════
STEP 5 — CLEANUP TASKS
═══════════════════════════════════════════════════
Before finalizing, perform these cleanup operations:
• Remove all original background (outdoor environment, parking lots, buildings, trees, sky, other vehicles, people)
• Remove any advertising stickers, decals, or text from the car body (e.g. dealer stickers, rental company logos)
• Remove any roof boxes, bike racks, or accessories not part of the original vehicle specification
• Remove original license plates (they will be covered by the AutoCity board)
• Do NOT remove: manufacturer badges, trim strips, roof rails, mirror caps, or any factory-fitted equipment

═══════════════════════════════════════════════════
STEP 6 — FINAL QUALITY CHECK
═══════════════════════════════════════════════════
Before delivering the output, verify:
☐ Camera angle: identical to input photo (same degrees, same perspective)
☐ Paint color: identical shade and metallic depth
☐ Wheel spoke count: identical to input
☐ Wheel spoke shape and finish: identical to input
☐ All manufacturer badges and logos: identical and sharp
☐ Ceiling: light grey with black track rail and 4-5 spotlight fixtures
☐ Wall: medium-dark grey micro-cement with EXACTLY 3 warm spotlight pools
☐ Floor: dark polished concrete with subtle matte reflection
☐ Car appears physically present in the room (not pasted/floating)
☐ Contact shadows under tires: present and natural
☐ AutoCity board: present on bumper (if bumper visible), correct design
☐ No stickers or advertising on car body
☐ Image resolution: maximum quality, no compression artifacts

If any item above fails, the image is rejected. The output must pass all checks.`
}

function buildSequentialPrompt(photoNumber: number): string {
  return `ROLE: You are a forensic automotive photo compositor with 20 years of experience producing legally binding advertisement imagery for car dealerships. Your output will be used in official sales listings on AutoScout24, Marktplaats and AutoTrack24. Errors are not permitted.

This is photo ${photoNumber} of a set of 8. ALL photos show THE EXACT SAME VEHICLE.

═══════════════════════════════════════════════════
CONSISTENCY REFERENCE — CRITICAL
═══════════════════════════════════════════════════
The REFERENCE IMAGE (second image provided) shows the SAME vehicle already processed in the AutoCity showroom. You MUST match these details EXACTLY from the reference:
• Make, model, paint color and metallic finish — must be pixel-identical
• Wheel design: copy the exact spoke count, spoke geometry, spoke finish, center cap, and rim edge from the reference — do NOT invent a different wheel design
• All manufacturer badges, grille design, trim strips, mirror caps — must match reference exactly
• AutoCity dealer board: copy the exact design, proportions, and typography from the reference
• Showroom environment: match the exact ceiling color, track rail, spotlight fixtures, wall color, spotlight pools, and floor from the reference

A customer will view ALL 8 photos side by side. Any difference in wheels, paint, grille, board design, or showroom style between this photo and the reference is a CRITICAL FAILURE that makes the entire set unusable for advertisement.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY AND LOCK THE VEHICLE
═══════════════════════════════════════════════════
Before doing anything else, study the INPUT IMAGE (first image) and memorize every detail:
• Make, model, and generation — confirm it matches the reference
• Exact paint color and finish — confirm it matches the reference
• Wheel design: count every spoke precisely, note spoke geometry (straight/curved/split/Y-shape), spoke width relative to gap, center cap logo and design, rim edge finish (polished/matte/painted)
• Front grille: exact mesh or bar pattern, surround shape, brand badge position and design
• Rear design: exact tail light shape and pattern, diffuser, exhaust tips, spoiler, rear badge
• All visible manufacturer badges, trim strips, roof rails, mirror caps, door handles
• Body trim color (black cladding, chrome, body-color)
• The exact camera viewing angle of this photo in degrees: front-right ≈ 45°, side-left = 90°, rear-left ≈ 135°, rear = 180°, rear-right ≈ 225°, side-right = 270°, front-left ≈ 315°, front = 0°

This identification is your CONTRACT. You are legally bound to reproduce every item identically.

═══════════════════════════════════════════════════
STEP 2 — THE VEHICLE IS A NO-TOUCH ZONE
═══════════════════════════════════════════════════
Draw a precise pixel-level boundary around the entire vehicle — every wheel arch, every mirror, every antenna tip, every door handle.
NOTHING inside this boundary may be altered, redrawn, recolored, relit, or reinterpreted.

ZERO TOLERANCE VIOLATIONS (any of these makes the image unusable and must be rejected):
✗ Different spoke count or spoke shape than the original input or reference
✗ Different paint shade — even 5% lighter or darker is rejected
✗ Different grille mesh, surround, or badge design
✗ Different manufacturer logo or trim detail (e.g. Volvo iron mark must remain identical)
✗ Different camera angle — the output must show the car from the EXACT SAME ANGLE as the INPUT IMAGE (not the reference angle)
✗ Car appears "pasted in" or floating — it must look physically present in the room
✗ Car lighting does not match the showroom lighting direction

CRITICAL — DO NOT apply "same lighting on the car" from the original photo. Instead:
The car must receive NEW realistic lighting from the showroom spotlights above. The showroom has 3 warm spotlights pointing at the back wall. The car receives warm overhead light from these spots, creating natural highlights on the roof, hood and body panels, with soft shadows underneath the car on the floor. This makes the car look physically present in the room.

═══════════════════════════════════════════════════
STEP 3 — RECREATE THE AUTOCITY SHOWROOM EXACTLY
═══════════════════════════════════════════════════
Replace everything outside the vehicle boundary with this EXACT showroom environment — identical to the reference image. Every element below is mandatory. No creative interpretation is permitted.

CEILING:
• Color: light grey / off-white (approximately #C8C8C8) — NOT black, NOT dark grey, NOT white
• Texture: smooth plaster ceiling, no visible texture
• A single straight black metal track rail runs horizontally across the full width of the ceiling, positioned approximately 20% from the top of the image
• On this track rail: 4 to 5 black cylindrical track spotlight fixtures, evenly spaced, all pointing downward-forward toward the back wall
• The track rail and fixtures are clearly visible against the light grey ceiling

BACK WALL:
• Color: medium-dark grey with micro-cement / tadelakt texture (approximately #6B6B6B to #787878)
• NOT black, NOT charcoal, NOT light grey — medium dark grey
• Texture: subtle micro-cement plaster texture, slightly uneven surface
• Lighting on wall: EXACTLY 3 large soft warm white spotlight pools, evenly spaced horizontally across the full width of the wall
• Each spotlight pool: soft-edged circular/oval warm white glow, approximately 40% of wall height in diameter
• The pools are created by the ceiling spotlights shining down onto the wall
• Between the pools: the wall returns to its medium-dark grey base color

SIDE WALLS:
• Same medium-dark grey micro-cement texture as the back wall
• No additional lighting on side walls
• Side walls are partially visible at the left and right edges of the image

FLOOR:
• Color: dark polished concrete, approximately #3A3A3A to #454545
• Texture: smooth polished concrete with a subtle matte sheen
• Reflection: a very subtle, low-opacity reflection of the car's underside is visible directly below the car — NOT a mirror reflection, NOT a glossy floor — just a faint matte sheen that suggests a polished surface
• The floor extends naturally to the base of all walls

ROOM GEOMETRY:
• Wide rectangular room, approximately 3x the width of the car
• The car is centered horizontally in the room
• The car sits directly on the floor with natural contact — no floating, no gap between tires and floor
• Natural contact shadow under each tire and along the underside of the car

${BOARD_SECTION}

═══════════════════════════════════════════════════
STEP 5 — CLEANUP TASKS
═══════════════════════════════════════════════════
Before finalizing, perform these cleanup operations:
• Remove all original background (outdoor environment, parking lots, buildings, trees, sky, other vehicles, people)
• Remove any advertising stickers, decals, or text from the car body (e.g. dealer stickers, rental company logos)
• Remove any roof boxes, bike racks, or accessories not part of the original vehicle specification
• Remove original license plates (they will be covered by the AutoCity board)
• Do NOT remove: manufacturer badges, trim strips, roof rails, mirror caps, or any factory-fitted equipment

═══════════════════════════════════════════════════
STEP 6 — FINAL QUALITY CHECK
═══════════════════════════════════════════════════
Before delivering the output, verify:
☐ Camera angle: identical to INPUT IMAGE angle (NOT the reference angle)
☐ Paint color: identical shade and metallic depth — matches reference
☐ Wheel spoke count: identical to input and reference
☐ Wheel spoke shape and finish: identical to input and reference
☐ All manufacturer badges and logos: identical and sharp — matches reference
☐ Ceiling: light grey with black track rail and 4-5 spotlight fixtures — matches reference
☐ Wall: medium-dark grey micro-cement with EXACTLY 3 warm spotlight pools — matches reference
☐ Floor: dark polished concrete with subtle matte reflection — matches reference
☐ Car appears physically present in the room (not pasted/floating)
☐ Contact shadows under tires: present and natural
☐ AutoCity board: present on bumper (if bumper visible), PIXEL-PERFECT copy from reference
☐ No stickers or advertising on car body
☐ Image resolution: maximum quality, no compression artifacts

If any item above fails, the image is rejected. The output must pass all checks.`
}

// ═══════════════════════════════════════════════════
// OpenAI gpt-4.1 Responses API (for interior photos)
// ═══════════════════════════════════════════════════

async function callOpenAIImageEdit(imageBase64: string, prompt: string): Promise<string> {
  // Detect MIME type from magic bytes
  let mimeType = "image/png";
  if (imageBase64.startsWith("UklGR")) mimeType = "image/webp";
  else if (imageBase64.startsWith("/9j/")) mimeType = "image/jpeg";

  console.log(`callOpenAIImageEdit: Responses API, ${mimeType}, base64 length: ${imageBase64.length}`);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: `data:${mimeType};base64,${imageBase64}` }
        ]
      }],
      tools: [{
        type: "image_generation",
        input_fidelity: "high",
        action: "edit"
      }]
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorCode = errorBody?.error?.code;
    const errorMsg = errorBody?.error?.message ?? "unknown";
    console.error(`OpenAI Responses API error ${response.status}:`, JSON.stringify(errorBody));
    if (errorCode === "moderation_blocked") {
      throw new Error(`MODERATION_BLOCKED: ${errorMsg}`);
    }
    throw new Error(`OpenAI error (${response.status}): ${errorMsg}`);
  }

  const result = await response.json();
  console.log("Response output types:", JSON.stringify(result.output?.map((o: any) => ({ type: o.type, hasResult: !!o.result }))));

  const imageData = result.output
    ?.filter((o: any) => o.type === "image_generation_call")
    ?.map((o: any) => o.result);

  if (!imageData?.length) {
    // Fallback: probeer andere output types
    const altImage = result.output?.find((o: any) => o.type === "image");
    if (altImage?.data) {
      console.log("OpenAI Responses API edit completed (fallback image type)");
      return altImage.data;
    }
    console.error("Full response output:", JSON.stringify(result.output?.map((o: any) => ({ type: o.type, keys: Object.keys(o) }))));
    throw new Error("No image generated by Responses API");
  }

  console.log("OpenAI Responses API edit completed successfully");
  return imageData[0];
}

// ═══════════════════════════════════════════════════
// INTERIOR PROMPTS — Completely separate from exterior
// ═══════════════════════════════════════════════════

function buildInteriorPrompt(): string {
  return `You are EDITING an existing car interior photo. You are NOT generating a new image.

This is a PHOTO EDITING task, not a generation task.

══════════════════════════════════════════════════════════
RULE #0 — ABSOLUTE PRIORITY: PIXEL-LOCK COMPOSITION
══════════════════════════════════════════════════════════

Think of this as a transparent overlay: the entire car interior stays pixel-locked.
Only the environment visible THROUGH the windows changes.

The EXACT pixel position of every interior object must remain unchanged:
- If the steering wheel is at position X,Y in the input, it must be at X,Y in the output
- If the dashboard fills the lower 60% of the frame, it must fill the lower 60% in the output
- Do NOT correct lens distortion, do NOT straighten lines, do NOT "improve" composition
- If the photo is slightly tilted: KEEP IT TILTED
- If one side has more space than the other: KEEP IT THAT WAY
- Do NOT zoom in or out even 1%
- Do NOT shift the camera angle even 1 degree

FORBIDDEN: Changing the shooting angle in any way
FORBIDDEN: Zooming in or out
FORBIDDEN: Reframing or recomposing the shot
FORBIDDEN: "Improving" the composition — preserve it exactly as shot

CRITICAL — CLOSE-UP AND DETAIL PHOTOS:
- If the photo is a close-up of a specific interior element (steering wheel, gear shifter, seat detail, badge, controls), the output MUST remain a close-up with the EXACT same framing
- Do NOT zoom out to reveal more of the interior
- Do NOT add or hallucinate interior elements (door panels, windows, seats, pillars) that are NOT visible in the original photo
- If only a small sliver of window or blurred background is visible behind the subject, replace ONLY that small visible area — do NOT expand it
- The edges and boundaries of the output image must contain the SAME content as the edges of the input image — never generate new content at the borders
- If no window is clearly visible in the photo: do NOT add any showroom environment — only apply retouching (Rule #5) and lighting correction (Rule #4)

══════════════════════════════════════════════════════════
RULE #1 — VEHICLE INTERIOR 100% UNCHANGED
══════════════════════════════════════════════════════════

Every single element inside the car MUST be preserved exactly:

BADGES AND LOGOS (CRITICAL):
- Every badge, emblem, and logo on seats, headrests, steering wheel, dashboard, and door panels MUST remain exactly as in the input
- The exact letter shapes, spacing, and chrome finish MUST be preserved pixel-perfect
- FORBIDDEN: Changing any badge text (e.g. LYNK&CO must remain LYNK&CO — not LYMK&CO, not LINAGCO, not any variation)
- FORBIDDEN: Inventing new text or logos anywhere

STEERING WHEEL:
- Shape, logo, button layout, stitching color and pattern — all identical
- FORBIDDEN: Changing the steering wheel design in any way

DASHBOARD AND INFOTAINMENT:
- Dashboard layout, gauge cluster design, and all physical controls — identical
- Infotainment screen: preserve the exact screen UI, icons, and layout visible in the input
- FORBIDDEN: Changing the dashboard shape or layout

SEATS AND UPHOLSTERY:
- Seat shape, headrest design, stitching pattern, material texture, and color — all identical
- FORBIDDEN: Changing seat color, material, or stitching

INTERIOR DETAILS:
- Center console, gear shifter shape, door panels, ambient lighting strips — all identical
- FORBIDDEN: Adding, removing, or altering any physical component inside the car

══════════════════════════════════════════════════════════
RULE #2 — VIRTUAL SHOWROOM THROUGH WINDOWS ONLY
══════════════════════════════════════════════════════════

The virtual photo booth environment appears ONLY through the car's glass surfaces.
The interior of the car itself is NEVER part of the showroom.

SHOWROOM SPECIFICATION (identical to exterior showroom):
- Space: 10 meters wide × 8 meters deep × 4.5 meters high
- Car positioned in the center, approximately 3 meters from each side wall

WALLS (visible through side windows and rear window):
- Color: medium-dark grey micro-cement / tadelakt texture (#6B6B6B to #787878)
- NOT black, NOT charcoal, NOT light grey — medium dark grey
- Subtle micro-cement plaster texture, slightly uneven surface
- 2 to 3 large soft warm white spotlight pools visible on the wall
- Each spotlight pool: soft-edged circular/oval warm white glow (3200K)
- Between pools: wall returns to medium-dark grey base color

CEILING (visible through windshield top edge and sunroof if present):
- Color: light grey / off-white (#C8C8C8) — NOT black, NOT dark grey
- A single straight black metal track rail with 4 to 5 black cylindrical spotlights
- Track rail and fixtures clearly visible against light grey ceiling

FLOOR (visible at bottom edge of side windows):
- Dark polished concrete (#3A3A3A to #454545)
- Smooth polished concrete with subtle matte sheen
- Completely empty — no objects, no reflections of other cars

SHOWROOM IS COMPLETELY EMPTY:
- No other cars, no people, no furniture, no equipment
- No logos, no text, no signs, no branding of any kind
- No outdoor environment, no sky, no buildings visible

WINDOW VIEWS — PERSPECTIVE RULES:
Through SIDE WINDOWS: flat showroom wall fills most of the window, wall runs parallel to the car, 1 to 2 warm spotlight pools visible
Through WINDSHIELD: flat showroom wall fills the majority, thin strip of light grey ceiling at the absolute top edge only
Through REAR WINDOW: flat showroom rear wall fills the majority

INTERIOR MIRROR: reflects the rear showroom wall with subtle warm spotlight
EXTERIOR SIDE MIRRORS (if visible from inside): reflect the side showroom wall

══════════════════════════════════════════════════════════
RULE #3 — CAMERA AND DISPLAY SCREENS
══════════════════════════════════════════════════════════

If the infotainment screen shows a REVERSE CAMERA, 360° SURROUND VIEW, or any other camera feed:

PRESERVE ALL screen UI elements:
- Overlay graphics, guidelines, distance markers, text labels (e.g. "ACHTERZIJDE")
- Status bar, time display, icons, screen frame, and all UI elements
- The yellow parking guidelines and distance markers MUST remain exactly as in the input
- Keep the camera's lens distortion, fisheye effect, and perspective IDENTICAL

REPLACE ONLY the background environment in the camera feed:
- Replace outdoor/parking scenery with the EMPTY showroom floor and walls
- Camera feed shows ONLY: dark polished concrete floor (#3A3A3A) and grey micro-cement walls (#6B6B6B to #787878) with warm spotlight pools
- For bird's-eye / 360° top-down view: show the car silhouette from above on the dark concrete floor, same as original but floor and surrounding walls replaced with showroom

ABSOLUTELY FORBIDDEN:
- Rendering a separate or different car in the camera feed
- Showing outdoor scenery, parking lots, brick walls, or any non-showroom environment in the camera feed
- Changing the screen UI, icons, frame, or overlay graphics

══════════════════════════════════════════════════════════
RULE #4 — LIGHTING AND EXPOSURE
══════════════════════════════════════════════════════════

REPLACE all outdoor, parking lot, or harsh lighting with soft professional studio lighting:
- Color temperature: 3200K warm white
- No overexposed (blown-out white) areas anywhere in the image
- No harsh direct sunlight or bright outdoor glare
- Soft, even illumination across all interior surfaces
- Subtle shadow depth preserved — do NOT flatten all shadows to grey
- The showroom light pools visible through windows create a warm glow that softly illuminates the interior surfaces near the windows

FORBIDDEN: Overblown white sky or outdoor light visible through windows
FORBIDDEN: Harsh shadows from direct sunlight inside the car

══════════════════════════════════════════════════════════
RULE #5 — PROFESSIONAL RETOUCHING
══════════════════════════════════════════════════════════

Apply professional automotive photography retouching to ALL interior surfaces:

SEATS AND UPHOLSTERY:
- Remove all dust, lint, and debris from seat surfaces
- Remove all stains, scuff marks, and wear patterns
- Restore fabric and leather to fresh, new-condition texture
- Stitching must appear sharp, clean, and evenly spaced

DASHBOARD AND HARD SURFACES:
- Remove all fingerprints, smudges, and dust
- Restore matte surfaces to their original matte finish
- Restore gloss surfaces to their original gloss finish
- No visible scratches or wear marks

GLASS SURFACES (windows, mirrors, screens):
- Remove all smudges, fingerprints, and water spots from glass
- Screen glass: neutral dark reflection (#1A1A1A to #2A2A2A), no showroom visible in screen glass reflection

FLOOR AND CARPETS:
- Remove all dirt, scuff marks, and debris
- Restore carpet pile to fresh, uniform texture

CEILING AND PILLARS:
- Remove any stains or marks
- Restore to original clean finish

FINAL QUALITY STANDARD:
The result must look like this car was delivered to its first owner today, photographed by a professional automotive photographer in a premium showroom. Zero-kilometer showroom quality.

══════════════════════════════════════════════════════════
RULE #6 — ABSOLUTE PROHIBITIONS
══════════════════════════════════════════════════════════

FORBIDDEN: Adding any text, logo, brand name, or signage anywhere in the image
FORBIDDEN: Adding any dealership name or branding anywhere
FORBIDDEN: Showing any outdoor environment, street, building, or sky through any window
FORBIDDEN: Adding any other vehicle inside or outside the showroom
FORBIDDEN: Adding any person, reflection of a person, or shadow of a person
FORBIDDEN: Changing the color of any interior element
FORBIDDEN: Changing the model or make of the vehicle
FORBIDDEN: Making the image look like a rendering or illustration — it must remain photorealistic

══════════════════════════════════════════════════════════
OUTPUT SPECIFICATION
══════════════════════════════════════════════════════════

- Maximum resolution, identical to input dimensions and aspect ratio
- Exact same composition, crop, and framing as input — pixel-locked
- Photorealistic result — indistinguishable from a real professional photograph
- Suitable for use in automotive advertisement listings`
}



async function saveToStorage(base64: string, path: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const { error } = await supabase.storage
    .from("car-photos")
    .upload(path, buffer, { contentType: "image/png", upsert: true })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: urlData } = supabase.storage.from("car-photos").getPublicUrl(path)
  return urlData.publicUrl
}

async function callGeminiSingleImage(imageBase64: string, prompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: "text", text: prompt }
        ]
      }],
      modalities: ["image", "text"]
    })
  })
  const data = await response.json()
  if (!response.ok) {
    console.error("Gemini API error:", data)
    if (response.status === 429) throw new Error("Rate limit bereikt. Probeer het over een minuut opnieuw.")
    if (response.status === 402) throw new Error("AI credits op. Voeg credits toe in je Lovable workspace.")
    throw new Error(`Gemini API fout: ${data.error?.message || JSON.stringify(data)}`)
  }
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!imageUrl) throw new Error("No image data received from Gemini")
  return imageUrl.includes(",") ? imageUrl.split(",")[1] : imageUrl
}

async function callGeminiWithReference(inputBase64: string, referenceBase64: string, prompt: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/png;base64,${inputBase64}` } },
          { type: "image_url", image_url: { url: `data:image/png;base64,${referenceBase64}` } },
          { type: "text", text: prompt }
        ]
      }],
      modalities: ["image", "text"]
    })
  })
  const data = await response.json()
  if (!response.ok) {
    console.error("Gemini API error:", data)
    if (response.status === 429) throw new Error("Rate limit bereikt. Probeer het over een minuut opnieuw.")
    if (response.status === 402) throw new Error("AI credits op. Voeg credits toe in je Lovable workspace.")
    throw new Error(`Gemini API fout: ${data.error?.message || JSON.stringify(data)}`)
  }
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!imageUrl) throw new Error("No image data received from Gemini")
  return imageUrl.includes(",") ? imageUrl.split(",")[1] : imageUrl
}


async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`)
  const buf = await resp.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ""
  const chunkSize2 = 8192
  for (let i = 0; i < bytes.length; i += chunkSize2) {
    const chunk = bytes.subarray(i, i + chunkSize2)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  try {
    const { imageBase64, referenceImageBase64, photoNumber, vehicleId, photoIndex, mode, originalFileName } = await req.json()
    if (!imageBase64) throw new Error("imageBase64 is required")
    
    const studioMode = mode || 'exterieur'
    
    // Build CC filename from original
    const getBaseFileName = (name?: string) => {
      if (!name) return null
      const lastDot = name.lastIndexOf('.')
      return lastDot > 0 ? name.substring(0, lastDot) : name
    }
    const ccBaseName = getBaseFileName(originalFileName)
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
    const num = photoNumber || 1
    const isFirstPhoto = num === 1 || !referenceImageBase64

    let resultB64: string

    if (studioMode === 'interieur') {
      console.log(`Processing interieur photo ${num} via Gemini Pro Image`)
      const prompt = buildInteriorPrompt()
      console.log("INTERIOR PROMPT (first 600 chars):", prompt.substring(0, 600))
      resultB64 = await callGeminiSingleImage(rawBase64, prompt)
    } else if (isFirstPhoto) {
      console.log(`Processing exterieur photo ${num} (first/standalone)`)
      const prompt = buildFirstPhotoPrompt()
      resultB64 = await callGeminiSingleImage(rawBase64, prompt)
    } else {
      console.log(`Processing exterieur photo ${num} (sequential with reference)`)
      const refBase64 = referenceImageBase64.includes(",") ? referenceImageBase64.split(",")[1] : referenceImageBase64
      const prompt = buildSequentialPrompt(num)
      resultB64 = await callGeminiWithReference(rawBase64, refBase64, prompt)
    }

    // Save to storage
    const idx = photoIndex ?? (num - 1)
    const storagePath = vehicleId 
      ? `showroom/vehicle_${vehicleId}/${ccBaseName ? `${ccBaseName} CC` : `photo_${idx}_${Date.now()}`}.png`
      : `showroom/standalone/${ccBaseName ? `${ccBaseName} CC_${Date.now()}` : `photo_${idx}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`}.png`
    
    const publicUrl = await saveToStorage(resultB64, storagePath)

    // Update vehicle record if vehicleId provided and this is photo 1
    if (vehicleId && num === 1) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from("vehicles").update({
        showroom_photo_url: publicUrl,
        showroom_photo_generated_at: new Date().toISOString()
      }).eq("id", vehicleId)
    }

    // Save to vehicle_showroom_photos if vehicleId provided
    if (vehicleId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from("vehicle_showroom_photos").upsert({
        vehicle_id: vehicleId,
        photo_url: publicUrl,
        photo_index: idx,
        generated_at: new Date().toISOString()
      }, { onConflict: 'vehicle_id,photo_index' })
    }

    return new Response(JSON.stringify({
      success: true,
      publicUrl,
      resultImage: `data:image/png;base64,${resultB64}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
