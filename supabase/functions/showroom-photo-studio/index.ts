import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

function buildFirstPhotoPrompt(): string {

  const boardSection = hasBumper
    ? `═══════════════════════════════════════════════════
STEP 4 — AUTOCITY DEALER BOARD (MANDATORY)
═══════════════════════════════════════════════════
Every photo must carry an AutoCity dealer board. Specifications:
• Shape: horizontal rectangle, 3:1 width-to-height ratio
• Background: solid matte black — no gradients, no texture
• Text line 1: "AUTOCITY" — uppercase, centered, bold modern sans-serif font, pure white (#FFFFFF)
• Text line 2: "AUTOCITY" — smaller, centered, same font, light grey (#AAAAAA)
• Border: thin silver/chrome border, uniform on all four sides
• Size: approximately equal to a standard European license plate (520mm × 110mm equivalent)
• Finish: subtle studio light reflection visible on the board surface

PLACEMENT RULES:
• Front bumper visible → mount board on front bumper, centered, at license plate height, overlapping original license plate
• Rear bumper visible → mount board on rear bumper, centered, at license plate height, overlapping original license plate
• The board must look physically attached to the bumper, not floating`
    : `═══════════════════════════════════════════════════
STEP 4 — SIDE VIEW: NO BOARD
═══════════════════════════════════════════════════
• Side view only (90° or 270°) → no board (side views have no bumper)
• DO NOT place any board or sign anywhere on the vehicle.`

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

${boardSection}

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

function buildSequentialPrompt(shotAngle: string, photoNumber: number): string {
  const hasBumper = !SIDE_VIEWS.includes(shotAngle)

  const boardSection = hasBumper
    ? `═══════════════════════════════════════════════════
STEP 4 — AUTOCITY DEALER BOARD (MANDATORY)
═══════════════════════════════════════════════════
Copy the AutoCity dealer board PIXEL-PERFECTLY from the reference image. Specifications for reference:
• Shape: horizontal rectangle, 3:1 width-to-height ratio
• Background: solid matte black — no gradients, no texture
• Text line 1: "AUTOCITY" — uppercase, centered, bold modern sans-serif font, pure white (#FFFFFF)
• Text line 2: "AUTOCITY" — smaller, centered, same font, light grey (#AAAAAA)
• Border: thin silver/chrome border, uniform on all four sides
• Size: approximately equal to a standard European license plate (520mm × 110mm equivalent)
• Finish: subtle studio light reflection visible on the board surface

PLACEMENT RULES:
• Front bumper visible → mount board on front bumper, centered, at license plate height, overlapping original license plate
• Rear bumper visible → mount board on rear bumper, centered, at license plate height, overlapping original license plate
• The board must look physically attached to the bumper, not floating`
    : `═══════════════════════════════════════════════════
STEP 4 — SIDE VIEW: NO BOARD
═══════════════════════════════════════════════════
• Side view only (90° or 270°) → no board (side views have no bumper)
• DO NOT place any board or sign anywhere on the vehicle.`

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

${boardSection}

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
    const { imageBase64, referenceImageBase64, photoNumber, shotAngle, vehicleId, photoIndex } = await req.json()
    if (!imageBase64) throw new Error("imageBase64 is required")
    
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
    const angle = shotAngle || "front-right"
    const num = photoNumber || 1
    const isFirstPhoto = num === 1 || !referenceImageBase64

    let resultB64: string

    if (isFirstPhoto) {
      console.log(`Processing photo ${num} (first/standalone) at angle: ${angle}`)
      const prompt = buildFirstPhotoPrompt(angle)
      resultB64 = await callGeminiSingleImage(rawBase64, prompt)
    } else {
      console.log(`Processing photo ${num} (sequential with reference) at angle: ${angle}`)
      const refBase64 = referenceImageBase64.includes(",") ? referenceImageBase64.split(",")[1] : referenceImageBase64
      const prompt = buildSequentialPrompt(angle, num)
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
        shot_angle: angle,
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
