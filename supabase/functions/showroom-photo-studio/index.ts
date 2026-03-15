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
// OpenAI gpt-image-1 Image Edit API (for interior photos)
// ═══════════════════════════════════════════════════

async function callOpenAIImageEdit(imageBase64: string, prompt: string): Promise<string> {
  const dataUrl = `data:image/png;base64,${imageBase64}`;

  const body = {
    model: "gpt-image-1",
    image: [{ type: "base64", data: imageBase64 }],
    prompt: prompt,
    size: "1024x1024",
  };

  console.log(`Calling OpenAI gpt-image-1 image EDIT API (JSON body, image size: ${imageBase64.length} chars)`);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("OpenAI Image Edit error:", JSON.stringify(data));
    throw new Error(`OpenAI fout: ${data.error?.message || JSON.stringify(data)}`);
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data received from OpenAI");
  console.log("OpenAI gpt-image-1 edit completed successfully");
  return b64;
}

// ═══════════════════════════════════════════════════
// INTERIOR PROMPTS — Completely separate from exterior
// ═══════════════════════════════════════════════════

function buildInteriorPrompt(): string {
  return `You are EDITING an existing photo. You are NOT generating a new image. The vehicle must remain 100% identical.

You are the world's best automotive photo editor and retoucher with 20 years of experience. You have worked for the most prestigious car brands, dealerships and automotive magazines worldwide — including Top Gear, AutoWeek and official manufacturer campaigns. You have an obsessive eye for detail, perfect lighting, and you know exactly how a premium car interior must look in a professional advertisement.

Your expertise combines two skills: the eye of a top automotive photographer (you know exactly what the perfect shot looks like) and the precision of a master retoucher (you can transform any raw photo into that perfect result). You never invent, fabricate or change what is already in the image — you only enhance, clean and place it in the right environment.

Your mission: Take this raw interior photo and transform it into a flawless, showroom-ready advertisement image for AutoCity — a premium car dealership. The car must look like it just rolled off the production line, photographed in AutoCity's professional photo booth. Every detail must be preserved with surgical precision. The result must be indistinguishable from a photo taken by a professional automotive photographer in a controlled studio environment.

You achieve this by applying three things simultaneously:
1. Place the car in the AutoCity virtual photo booth (only visible through windows and mirrors)
2. Retouch every surface to 0 km showroom condition
3. Preserve every interior detail pixel-perfect — nothing may be invented, changed or removed

---

HARDE EIS #0 — VOERTUIG IDENTITEIT 100% ONGEWIJZIGD:
You are EDITING an existing photo. You are NOT generating a new image.
The vehicle in the output MUST be EXACTLY the same vehicle as in the input.
✅ PRESERVE EXACTLY: make, model, brand, every badge, every logo, every emblem
✅ PRESERVE EXACTLY: steering wheel shape, logo, buttons
✅ PRESERVE EXACTLY: dashboard layout, gauge cluster, infotainment screen
✅ PRESERVE EXACTLY: seat design, headrest shape, stitching, material texture
✅ PRESERVE EXACTLY: door panel, center console, gear shifter
❌ ABSOLUTELY FORBIDDEN: changing the car into a different brand or model
❌ ABSOLUTELY FORBIDDEN: altering the shape of ANY interior component
❌ ABSOLUTELY FORBIDDEN: inventing, adding, or removing ANY physical element
If the input shows a Lynk & Co, the output MUST show a Lynk & Co. If it shows a Dacia, output MUST be a Dacia. NEVER substitute with BMW, Audi, Mercedes, or any other brand.

HARDE EIS #1 — COMPOSITIE ONVERANDERD:
Output MUST have EXACTLY the same crop, zoom, framing, and composition as the input image.
NEVER zoom out. NEVER zoom in. NEVER reframe. NEVER add borders or padding.
Close-up shots MUST stay close-up. Wide shots MUST stay wide.
The output dimensions and aspect ratio must match the input exactly.

HARDE EIS #2 — BOOTH ALLEEN DOOR RAMEN/SPIEGELS:
The AutoCity photo booth environment MUST ONLY appear through:
✅ Clearly visible car SIDE WINDOWS (glass surface clearly identifiable)
✅ Clearly visible WINDSHIELD (front glass clearly identifiable)
✅ Clearly visible REAR WINDOW (rear glass clearly identifiable)
✅ INTERIOR REAR-VIEW MIRROR (glass surface)
✅ EXTERIOR SIDE MIRRORS (glass surface)
❌ ABSOLUTELY FORBIDDEN: booth in reflections on plastic trim, dashboard surfaces, piano black panels, door panels, center console, seat leather/fabric, headliner, any non-glass surface
❌ ABSOLUTELY FORBIDDEN: booth in close-up shots where NO windows or mirrors are visible in the frame
❌ ABSOLUTELY FORBIDDEN: booth projected onto screens, displays, or touchscreens

HARDE EIS #3 — REFLECTIES IN SCHERMGLAS:
ANY touchscreen, infotainment display, instrument cluster, or screen glass surface:
✅ Reflections in screen glass MUST be neutral dark (#1A1A1A to #2A2A2A) — like a darkened room
❌ ABSOLUTELY FORBIDDEN: showing any environment (booth walls, street, buildings, brick walls, outdoor scenes) in screen glass reflections
❌ ABSOLUTELY FORBIDDEN: showing any text, logos, or objects in screen glass reflections
The screen CONTENT (navigation, media, EV info, instruments, etc.) must be preserved exactly — only the glass reflection is neutralized.

HARDE EIS #4 — CAMERA DISPLAY ONVERANDERD:
If a reversing camera, 360° camera, or parking camera display is visible:
✅ ONLY replace the outdoor environment/street/parking lot WITHIN the camera feed image
✅ Replace with: AutoCity booth floor and rear wall as seen from bumper height
✅ Preserve ALL UI overlays: parking guide lines (green/yellow/red), distance indicators, car icon, camera mode buttons, any text overlays
❌ ABSOLUTELY FORBIDDEN: changing the screen bezel, physical buttons, or any UI element
❌ ABSOLUTELY FORBIDDEN: adding "AutoCity" text, logos, or branding anywhere on or around the camera display
❌ ABSOLUTELY FORBIDDEN: changing the camera display frame shape or size

HARDE EIS #5 — GEEN BRANDING/TEKST TOEVOEGEN:
❌ ABSOLUTELY FORBIDDEN: adding "AutoCity", "Auto City", or any dealership name/logo anywhere
❌ ABSOLUTELY FORBIDDEN: adding any text on floors, walls, screens, or any surface
❌ ABSOLUTELY FORBIDDEN: adding any new logos, watermarks, or branding of any kind

---

AUTOCITY PHOTO BOOTH (10m × 8m × 4m hoog):
- Ruimte: 10 meter breed × 8 meter diep × 4 meter hoog
- Afstand auto tot zijmuur: ~2.0 meter aan elke zijkant
- Afstand auto tot voormuur: ~1.75 meter
- Afstand auto tot achtermuur: ~1.75 meter

BOOTH VISUELE STIJL:
VLOER: Donker gepolijst beton (#3A3A3A), lichte spiegelglans, subtiele spotlight-reflecties
MUREN: Vlak mat micro-cement (#6B6B6B tot #787878), geen textuur, geen decoratie, geen tekst
PLAFOND: Lichtgrijs (#C8C8C8), zwarte track-rail systeem met 4-6 warm-witte LED spots
VERLICHTING: Warm 3000K spotlights, 4-6 spots, zachte gouden pools op vloer en muren
SFEER: Professionele auto-fotobooth, volledig leeg, schoon, premium

BOOTH DOOR RAMEN — PERSPECTIEF:
Door ZIJRAAM (muur ~2m weg): Vlakke micro-cement muur (#6B6B6B) vult MEESTE van het raam. Muur loopt PERFECT PARALLEL aan de auto, PERFECT VERTICAAL. 1-2 warme spotlight pools op muur. Horizon lijn LAAG in raam.
Door VOORRUIT (muur ~1.75m weg): Vlakke grijze muur vult meeste van de ruit. Dunne strook lichtgrijs plafond (#C8C8C8) met track-rail en 2-3 LED spots aan het absolute boveneinde.
Door ACHTERRAAM: Zelfde als voorruit maar spiegelbeeldig perspectief.
BOOTH IS VOLLEDIG LEEG: absoluut geen andere auto's, geen mensen, geen meubels, geen planten, geen logo, geen tekst op vloer of muren.

---

RETOUCHE — ALS EEN PROFESSIONELE AUTOMOTIVE FOTOGRAAF:
- Verwijder ALLE stof, vuil en vingerafdrukken van alle oppervlakken
- Leer/stof stoelen: verwijder vlekken en slijtage, frisse textuur, stiksel scherp en helder
- Dashboard/trim: verwijder vingerafdrukken, mat geconditioneerd, geen glare
- Vervang harde buitenverlichting door zachte warme 3000K studio verlichting
- Eindresultaat: 0 km showroomkwaliteit — alsof de auto net uit de fabriek komt

BEWAAR EXACT — NIETS WIJZIGEN, NIETS VERZINNEN:
- Alle scherminhoud: navigatie, media, EV info, instrumenten, klokken, meldingen
- Alle knoplabels, iconen en tekst op knoppen
- Alle logo's en merknamen van de auto (fabrikant logo's, audiosysteem logo's, etc.)
- Stoelontwerp, kleur, patroon en stiksel
- Alle trim kleuren, materialen en afwerkingen
- Alle bedieningselementen en hun exacte posities

OUTPUT: Maximum resolution. Same composition as input.`
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
      console.log(`Processing interieur photo ${num} via OpenAI gpt-image-1 (image edit)`)
      const prompt = buildInteriorPrompt()
      resultB64 = await callOpenAIImageEdit(rawBase64, prompt)
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
