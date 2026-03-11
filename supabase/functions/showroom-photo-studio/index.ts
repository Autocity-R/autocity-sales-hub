import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!
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
// INTERIOR PROMPTS — Completely separate from exterior
// ═══════════════════════════════════════════════════

function buildInteriorFirstPrompt(): string {
  return `ROLE: You are a forensic automotive interior photo specialist with 20 years of experience producing legally binding advertisement imagery for premium car dealerships. Your output will be used in official sales listings on AutoScout24, Marktplaats and AutoTrack24. Errors are not permitted. You work as a professional automotive photographer using the best camera equipment and studio lighting setups.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY AND LOCK THE INTERIOR
═══════════════════════════════════════════════════
Before doing anything else, study the input photo and memorize every single detail:
• Seat material, color, texture, and stitching pattern (leather grain direction, perforations, contrast stitching color and spacing)
• Dashboard layout: every button, knob, vent, trim piece, and their exact positions
• Steering wheel: exact shape, button layout, logo, material, stitching
• All displays/screens: exact content shown (text, icons, colors, brightness, graphics) — these are SACRED and must be pixel-identical in output
• All button labels, symbols, and text anywhere in the cabin — SACRED
• Center console: gear lever/selector design, cupholder layout, armrest, storage compartments
• Ventilation grilles: exact slat angle, surround shape, chrome/matte finish
• Trim materials: wood grain pattern and color, brushed aluminum direction, carbon fiber weave pattern, piano black surfaces
• Floor mats: OEM pattern, color, branded logos
• Headliner material and color
• Door panel design: handle shape, speaker grilles, window controls, pocket layout
• All badges, logos, model designations visible anywhere in the cabin

This identification is your CONTRACT. You are legally bound to reproduce every item PIXEL-IDENTICALLY.

═══════════════════════════════════════════════════
STEP 2 — ABSOLUTE NO-TOUCH ZONE (EVERYTHING INSIDE THE CABIN)
═══════════════════════════════════════════════════
The ENTIRE interior of the vehicle is a no-touch zone. This is STRICTER than exterior processing.

ZERO TOLERANCE — ANY of these makes the image unusable and MUST be rejected:
✗ Display content changed in ANY way (text, icons, colors, graphics, brightness) — even slightly different font rendering is REJECTED
✗ Button symbols or labels altered, moved, or redrawn
✗ Stitching pattern changed (spacing, color, angle, double vs single stitch)
✗ Leather/fabric texture altered (grain direction, perforation pattern, surface finish)
✗ Wood/aluminum/carbon trim pattern changed (grain direction, color, finish)
✗ Any knob, lever, or control moved from its exact position
✗ Seat shape or contour altered
✗ Color of ANY material changed — even 5% shift is REJECTED
✗ Details ADDED that don't exist in the original (hallucination)
✗ Details REMOVED that exist in the original (except items listed in STEP 5)
✗ Piano black surfaces gaining or losing reflections that change their apparent shape
✗ Chrome/metal trim changing finish (matte becoming glossy or vice versa)

CRITICAL: When in doubt, preserve the original pixel. Never "improve" or "enhance" interior details.

═══════════════════════════════════════════════════
STEP 3 — PROFESSIONAL AUTOMOTIVE PHOTOGRAPHY LIGHTING
═══════════════════════════════════════════════════
Apply professional studio lighting as if shot by an expert automotive photographer with:
• Soft diffused overhead lighting from multiple softboxes, creating even illumination
• Warm color temperature (approximately 4500-5000K) — professional automotive studio standard
• Shadows in footwell area: soften but do NOT eliminate — keep them natural and directional
• Shadows under dashboard: soften but maintain natural depth
• Enrich colors faithfully — increase vibrancy slightly without oversaturation
• Faithful color reproduction: the seat color, trim color, and material colors must remain EXACTLY as in the original, just better lit
• Leather and metal surfaces should show natural specular highlights from the studio lighting
• No harsh reflections or blown-out highlights on screens or glossy surfaces
• The overall look should be: "This was photographed in a professional studio with perfect lighting" — NOT "This was processed by AI"

═══════════════════════════════════════════════════
STEP 4 — WINDOWS: AUTOCITY SHOWROOM BACKGROUND
═══════════════════════════════════════════════════
Replace EVERYTHING visible through ALL windows with the AutoCity showroom environment. The goal is to make it look like this car is parked inside the AutoCity showroom.

SIDE WINDOWS:
• Show the medium-dark grey micro-cement wall (approximately #6B6B6B to #787878)
• Include warm white spotlight pools on the wall (consistent with the AutoCity showroom aesthetic)
• The wall should appear at the correct distance and perspective for a showroom interior

WINDSHIELD (front):
• Show the showroom ceiling with light grey color (#C8C8C8) in the upper portion
• Show the black metal track rail with spotlight fixtures
• Show the back wall with spotlight pools in the lower portion
• Perspective must be correct for looking forward through a windshield in an indoor space

REAR WINDOW:
• Same showroom environment, adjusted for rear perspective
• Wall with spotlight pools and/or ceiling elements as appropriate for the viewing angle

IF GROUND IS VISIBLE through any window (e.g. looking down through side window, or low angle shot):
• Show the dark polished concrete floor (#3A3A3A to #454545)
• The floor should match the AutoCity showroom floor specification

CRITICAL WINDOW RENDERING RULES:
• The showroom background through windows must be SHARP and in focus — NOT blurred or bokeh
• The showroom must look natural, as if the car is genuinely parked inside this room
• Add subtle reflections of the showroom environment ON the glass surfaces — this is desired and adds realism
• Window tint, if present on the original, must be preserved (the showroom is visible through the tint)
• The transition between window frame and showroom background must be clean and precise
• Do NOT add any elements not specified (no other cars, no people, no furniture)

═══════════════════════════════════════════════════
STEP 5 — CLEANUP
═══════════════════════════════════════════════════
Remove the following items ONLY:
• Personal belongings: phones, water bottles, bags, papers, keys, cables, chargers, sunglasses, coins
• Trash or debris on seats, floor mats, or in cupholders
• Visible dirt, stains, or marks on seats and floor mats (make them look clean)
• Aftermarket accessories: phone holders, dashboard cameras, air fresheners, non-OEM floor mats
• Dealer stickers or aftermarket badges

DO NOT REMOVE:
• Any OEM/factory equipment, badges, or accessories
• Original floor mats with manufacturer branding
• Factory-installed accessories (e.g. OEM phone cradle, factory dash cam)
• Any controls, buttons, or functional elements

═══════════════════════════════════════════════════
STEP 6 — FINAL QUALITY CHECK
═══════════════════════════════════════════════════
Before delivering the output, verify every single item:
☐ ALL display text: pixel-identical to input (check EVERY character)
☐ ALL button symbols and labels: pixel-identical to input
☐ Stitching patterns on steering wheel, seats, dashboard: identical spacing, color, angle
☐ Leather/fabric texture and grain: identical to input
☐ Wood/aluminum/carbon trim patterns: identical to input
☐ ALL material colors: identical to input (not shifted, not "enhanced")
☐ Seat shape and contours: identical to input
☐ Every knob, lever, vent position: identical to input
☐ Showroom environment visible through ALL windows: present and sharp
☐ Professional studio lighting: warm, even, natural
☐ Personal items removed
☐ Surfaces clean (no stains or dirt)
☐ No AI artifacts, hallucinations, or invented details
☐ No blurring of text or fine details
☐ Image resolution: maximum quality, no compression artifacts

If ANY item fails, the image is REJECTED. Start over. The output must pass ALL checks.`
}

function buildInteriorSequentialPrompt(photoNumber: number): string {
  return `ROLE: You are a forensic automotive interior photo specialist with 20 years of experience producing legally binding advertisement imagery for premium car dealerships. Your output will be used in official sales listings on AutoScout24, Marktplaats and AutoTrack24. Errors are not permitted.

This is interior photo ${photoNumber} of a set. ALL photos show THE EXACT SAME VEHICLE interior.

═══════════════════════════════════════════════════
CONSISTENCY REFERENCE — CRITICAL
═══════════════════════════════════════════════════
The REFERENCE IMAGE (second image provided) shows the SAME vehicle interior already processed. You MUST match these aspects EXACTLY from the reference:
• Lighting color temperature and intensity — must be identical warm studio lighting
• Showroom environment through windows — must show the identical AutoCity showroom (same wall color, spotlight pools, floor)
• Overall color grading and mood — must be consistent across all interior photos
• Cleanup level — same standard of cleanliness applied

A customer will view ALL interior photos side by side. Any difference in lighting warmth, showroom background style, or color grading between this photo and the reference is a CRITICAL FAILURE.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY AND LOCK THE INTERIOR
═══════════════════════════════════════════════════
Before doing anything else, study the INPUT IMAGE (first image) and memorize every single detail:
• Seat material, color, texture, and stitching pattern (leather grain direction, perforations, contrast stitching color and spacing)
• Dashboard layout: every button, knob, vent, trim piece, and their exact positions
• Steering wheel: exact shape, button layout, logo, material, stitching
• All displays/screens: exact content shown (text, icons, colors, brightness, graphics) — these are SACRED
• All button labels, symbols, and text anywhere in the cabin — SACRED
• Center console, trim materials, floor mats, headliner, door panels
• All badges, logos, model designations

This identification is your CONTRACT. You are legally bound to reproduce every item PIXEL-IDENTICALLY.

═══════════════════════════════════════════════════
STEP 2 — ABSOLUTE NO-TOUCH ZONE (EVERYTHING INSIDE THE CABIN)
═══════════════════════════════════════════════════
The ENTIRE interior is a no-touch zone. STRICTER than exterior processing.

ZERO TOLERANCE — ANY of these makes the image REJECTED:
✗ Display content changed in ANY way
✗ Button symbols or labels altered
✗ Stitching pattern changed
✗ Material texture altered
✗ Trim pattern changed
✗ Controls moved from exact position
✗ Color of ANY material changed — even 5% shift
✗ Details ADDED that don't exist (hallucination)
✗ Details REMOVED that exist (except STEP 5 items)

═══════════════════════════════════════════════════
STEP 3 — PROFESSIONAL LIGHTING (MATCH REFERENCE)
═══════════════════════════════════════════════════
Apply the SAME professional studio lighting as the reference image:
• Match the exact color temperature from the reference
• Match the shadow softness and direction from the reference
• Match the specular highlight intensity on leather and metal surfaces
• The lighting must be indistinguishable from the reference in warmth and quality

═══════════════════════════════════════════════════
STEP 4 — WINDOWS: AUTOCITY SHOWROOM (MATCH REFERENCE)
═══════════════════════════════════════════════════
Replace everything visible through ALL windows with the AutoCity showroom — matching the reference exactly:

SIDE WINDOWS: medium-dark grey micro-cement wall (#6B6B6B to #787878) with warm spotlight pools
WINDSHIELD: showroom ceiling (#C8C8C8), track rail with spots, back wall
REAR WINDOW: showroom environment adjusted for rear perspective
GROUND VISIBLE: dark polished concrete floor (#3A3A3A to #454545)

• Showroom background must be SHARP — not blurred
• Subtle glass reflections of the showroom are desired
• Match the exact showroom rendering style from the reference image

═══════════════════════════════════════════════════
STEP 5 — CLEANUP
═══════════════════════════════════════════════════
Remove: personal belongings, trash, dirt/stains, aftermarket accessories, dealer stickers
Keep: all OEM equipment, factory mats, factory accessories

═══════════════════════════════════════════════════
STEP 6 — FINAL QUALITY CHECK
═══════════════════════════════════════════════════
☐ ALL display text: pixel-identical to INPUT
☐ ALL button symbols: pixel-identical to INPUT
☐ All material textures and colors: identical to INPUT
☐ Lighting: matches REFERENCE color temperature and quality
☐ Showroom through windows: matches REFERENCE style exactly
☐ Personal items removed, surfaces clean
☐ No AI artifacts or hallucinations
☐ No blurred text or fine details
☐ Maximum image quality

If ANY item fails, REJECT and start over.`
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
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  try {
    const { imageBase64, referenceImageBase64, photoNumber, vehicleId, photoIndex } = await req.json()
    if (!imageBase64) throw new Error("imageBase64 is required")
    
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
    const num = photoNumber || 1
    const isFirstPhoto = num === 1 || !referenceImageBase64

    let resultB64: string

    if (isFirstPhoto) {
      console.log(`Processing photo ${num} (first/standalone) — AI will detect angle automatically`)
      const prompt = buildFirstPhotoPrompt()
      resultB64 = await callGeminiSingleImage(rawBase64, prompt)
    } else {
      console.log(`Processing photo ${num} (sequential with reference) — AI will detect angle automatically`)
      const refBase64 = referenceImageBase64.includes(",") ? referenceImageBase64.split(",")[1] : referenceImageBase64
      const prompt = buildSequentialPrompt(num)
      resultB64 = await callGeminiWithReference(rawBase64, refBase64, prompt)
    }

    // Save to storage
    const idx = photoIndex ?? (num - 1)
    const storagePath = vehicleId 
      ? `showroom/vehicle_${vehicleId}/photo_${idx}_${Date.now()}.png`
      : `showroom/standalone/photo_${idx}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`
    
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
