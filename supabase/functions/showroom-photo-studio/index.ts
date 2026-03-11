import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const SIDE_VIEWS = ["side-left", "side-right"]

function buildFirstPhotoPrompt(shotAngle: string): string {
  const hasBumper = !SIDE_VIEWS.includes(shotAngle)

  const boardSection = hasBumper
    ? `═══════════════════════════════════════════════════
STEP 5 — AUTOCITY BOARD PLACEMENT
═══════════════════════════════════════════════════
• Shape: horizontal rectangle, 3:1 width-to-height ratio
• Background: solid matte black
• Text line 1: "AUTOCITY" — clean modern sans-serif font, white, bold, centered, large
• Text line 2: small silver car silhouette icon directly below "AUTOCITY", centered
• Border: thin silver/chrome border around entire board
• Size: same width as a standard European license plate (approximately 520mm × 110mm)
• Material appearance: matte black anodized aluminum with subtle studio light reflection
• ONLY "AUTOCITY" text and logo — NO website, NO phone number, NO other text whatsoever
• Position: mounted flush on the bumper at license plate height, replacing/overlapping the original license plate area
• CRITICAL: The board must be readable and correctly proportioned — not distorted, not tilted, not partially hidden`
    : `═══════════════════════════════════════════════════
STEP 5 — SIDE VIEW: NO BOARD
═══════════════════════════════════════════════════
This is a pure side view — NO bumper is visible.
DO NOT place any board or sign anywhere on the vehicle.
DO NOT place any board on the wheels, doors, or body panels.
The vehicle must be completely clean with no added signage.`

  return `ROLE: You are a forensic automotive photo compositor with 20 years of experience producing legally binding advertisement imagery for car dealerships. Your output will be used in official sales listings on AutoScout24, AutoTrack, and Marktplaats. Errors in vehicle details are not permitted and will result in legal liability.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY AND MEMORIZE THE VEHICLE
═══════════════════════════════════════════════════
Before making ANY changes, study the input photo and permanently memorize:
• MAKE: The exact manufacturer (e.g., Volvo, BMW, Mercedes, Audi — whatever is shown)
• MODEL: The exact model name and generation (e.g., XC60, 3 Series, C-Class)
• MODEL YEAR: Estimate from design details
• TRIM LEVEL: Any visible trim badges, sport packages, or special editions
• PAINT COLOR: The exact paint color including metallic/matte/pearl finish
• WHEEL DESIGN: Count every spoke. Note the spoke pattern (straight, split, turbine, Y-shape, etc.), the spoke finish (polished, painted, machined), the center cap design, and the rim edge finish. This is CRITICAL.
• TIRE SIZE: Estimate from proportions
• ALL BADGES: Every logo, emblem, and badge on the vehicle
• GRILLE DESIGN: The exact grille pattern, chrome elements, and brand logo placement
• HEADLIGHT/TAILLIGHT DESIGN: The exact light signature
• BODY DETAILS: Roof rails, running boards, spoilers, trim strips, mirror caps, door handles
• SPECIAL EQUIPMENT: Anything unusual on or attached to the vehicle (roof boxes, bike racks, etc.) — these must be REMOVED in the output
• LICENSE PLATE TEXT: Read and memorize the exact license plate number/letters

═══════════════════════════════════════════════════
STEP 2 — PRESERVATION CONTRACT (ABSOLUTE LAW)
═══════════════════════════════════════════════════
The vehicle body is SACRED and UNTOUCHABLE. You are FORBIDDEN from altering:
✗ Wheel design, spoke pattern, spoke count, spoke finish, or rim color
✗ Paint color or finish (metallic, matte, pearl effect)
✗ Grille design, pattern, or chrome elements
✗ Any badge, logo, or emblem
✗ Body proportions, panel lines, or silhouette
✗ Headlight or taillight design
✗ Any trim strip, chrome accent, or body molding
✗ Mirror design or color
✗ Roof rails, running boards, or spoilers
VIOLATIONS of this contract mean the output is REJECTED and must be regenerated.

═══════════════════════════════════════════════════
STEP 3 — REMOVE UNWANTED ELEMENTS
═══════════════════════════════════════════════════
Remove from the scene (replace with studio background):
• ALL other vehicles in the background
• ALL buildings, roads, trees, sky, and outdoor elements
• ANY objects attached to the vehicle that are not factory-standard (roof boxes, taxi signs, delivery equipment, etc.)
• The original license plate (it will be replaced by the AutoCity board or left clean)
• If a person/driver is visible inside the car, remove them — the interior should appear empty and clean
DO NOT remove anything that is part of the vehicle's factory specification.

═══════════════════════════════════════════════════
STEP 4 — CREATE PREMIUM STUDIO ENVIRONMENT
═══════════════════════════════════════════════════
Replace the entire background with a premium automotive dealership studio:
• WALLS: Dark charcoal/anthracite (#2a2a2a) on all visible sides — no texture, no pattern
• CEILING LIGHT: One large rectangular white LED softbox panel centered on the ceiling, bright white (#ffffff), creating the signature premium studio look
• WALL ACCENT LIGHTS: Two thin horizontal LED strip lights at mid-height — one on the left wall, one on the right wall
• FLOOR: Dark polished concrete (#1a1a1a to #2a2a2a gradient) with a subtle mirror reflection of the vehicle's underside
• SHADOWS: Realistic soft contact shadows under all four tires, fading outward
• LIGHTING ON VEHICLE: Three-point studio lighting — strong key light from upper-front, soft fill light from the opposite side, subtle rim light from behind. The vehicle's paint should show realistic reflections of the studio lights.

${boardSection}

═══════════════════════════════════════════════════
STEP 6 — OUTPUT REQUIREMENTS (NON-NEGOTIABLE)
═══════════════════════════════════════════════════
Deliver a single photorealistic image that meets ALL of the following:

ANGLE & PERSPECTIVE:
• Shows the vehicle from the EXACT SAME ANGLE as the input photo
• The camera height, distance, and perspective must precisely match the input photo
• The vehicle must be positioned at the same orientation as in the input photo

QUALITY STANDARD:
• Resolution: 1920×1280 pixels (3:2 landscape ratio)
• Quality: equivalent to a professional DSLR camera shot at ISO 100, f/8, with studio strobes
• The vehicle must be in perfect sharp focus — no motion blur, no depth-of-field softening
• No blown-out highlights on the paint, no crushed blacks in wheel arches

REALISM:
• The image must be indistinguishable from a real photograph taken in a real premium dealership studio
• The vehicle must occupy at least 70% of the frame width
• Landscape orientation — wider than tall
• Zero AI artifacts, zero distorted proportions, zero floating elements

PLATFORM COMPLIANCE:
• Suitable for direct upload to AutoScout24, AutoTrack, and Marktplaats
• A customer viewing ALL photos side by side must see the EXACT SAME vehicle in every photo
• Any difference in wheel design, paint color, grille, or board style between photos is a CRITICAL FAILURE`
}

function buildSequentialPrompt(shotAngle: string, photoNumber: number): string {
  const hasBumper = !SIDE_VIEWS.includes(shotAngle)

  const boardSection = hasBumper
    ? `═══════════════════════════════════════════════════
STEP 5 — AUTOCITY BOARD
═══════════════════════════════════════════════════
• The board in the REFERENCE IMAGE shows the EXACT design to use — copy it PIXEL-PERFECTLY
• Same shape, same proportions, same font size, same "AUTOCITY" text, same silver logo icon
• Same border thickness and color
• Position: mounted flush on the bumper at license plate height, appropriate for this viewing angle
• The board must be IDENTICAL to the reference image board in every visual detail`
    : `═══════════════════════════════════════════════════
STEP 5 — SIDE VIEW: NO BOARD
═══════════════════════════════════════════════════
This is a pure side view — NO bumper is visible.
DO NOT place any board or sign anywhere on the vehicle.`

  return `ROLE: You are a forensic automotive photo compositor producing legally binding advertisement imagery. This is photo ${photoNumber} of a set. ALL photos in this set show THE EXACT SAME VEHICLE.

═══════════════════════════════════════════════════
CONSISTENCY REFERENCE — CRITICAL
═══════════════════════════════════════════════════
The REFERENCE IMAGE (second image provided) shows the SAME vehicle already processed in studio style. You MUST match these details EXACTLY from the reference:
• MAKE, MODEL, MODEL YEAR, and TRIM LEVEL — must be identical
• WHEEL DESIGN: Copy the exact spoke pattern, spoke count, spoke finish, center cap, and rim color from the reference — do NOT invent a different wheel design
• PAINT COLOR: Match the exact paint color and metallic finish from the reference
• GRILLE DESIGN: Match exactly — same pattern, same chrome elements, same brand logo
• AUTOCITY BOARD: Match the exact design, proportions, and typography from the reference
• STUDIO STYLE: Match the exact same dark walls, LED ceiling panel, concrete floor, and lighting style

A customer will view ALL photos side by side. Any difference in wheels, paint color, grille, or board between this photo and the reference is a CRITICAL FAILURE that makes the entire set unusable for advertisement.

═══════════════════════════════════════════════════
STEP 1 — IDENTIFY THIS PHOTO'S VEHICLE
═══════════════════════════════════════════════════
Study the INPUT IMAGE (first image) and confirm:
• This is the SAME make, model, and color as the reference
• Note the exact viewing angle of this photo
• Note any special equipment to remove (roof boxes, taxi signs, etc.)

═══════════════════════════════════════════════════
STEP 2 — PRESERVATION CONTRACT (ABSOLUTE LAW)
═══════════════════════════════════════════════════
You are FORBIDDEN from altering ANY of these on the vehicle:
✗ Wheel design — must match reference EXACTLY
✗ Paint color — must match reference EXACTLY
✗ Grille design — must match reference EXACTLY
✗ Any badge, logo, emblem, trim strip, or chrome accent
✗ Body proportions or silhouette

═══════════════════════════════════════════════════
STEP 3 — REMOVE UNWANTED ELEMENTS
═══════════════════════════════════════════════════
• Remove ALL background (other vehicles, buildings, sky, road)
• Remove ANY non-factory items attached to the vehicle (roof boxes, taxi equipment, etc.)
• Remove the original license plate
• If a person/driver is visible inside the car, remove them — the interior should appear empty and clean

═══════════════════════════════════════════════════
STEP 4 — STUDIO ENVIRONMENT (MATCH REFERENCE)
═══════════════════════════════════════════════════
Create the EXACT SAME studio as in the reference image:
• Dark charcoal walls, large white LED ceiling panel, thin wall strip lights
• Dark polished concrete floor with vehicle reflection
• Same three-point studio lighting style

${boardSection}

═══════════════════════════════════════════════════
STEP 6 — OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════
• Resolution: 1920×1280 pixels (3:2 landscape)
• ANGLE: Show the vehicle from the EXACT SAME ANGLE as the INPUT IMAGE — NOT the reference angle
• Do NOT copy the angle from the reference — the reference is only for vehicle details and studio style
• The vehicle must occupy at least 70% of the frame width
• Photorealistic quality, indistinguishable from a real studio photograph
• Zero AI artifacts, zero distorted proportions`
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
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
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
