import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// ━━━ STEP 1: STUDIO TRANSFORMATION ━━━
const STUDIO_PROMPT = `Transform this car photo into a premium automotive showroom studio photo.

ENVIRONMENT: Replace the entire outdoor background with a premium studio:
- Dark charcoal/black walls on left, right and back
- Large bright white rectangular LED softbox light panel on the ceiling
- Thin horizontal LED strip lights on the left and right walls
- Dark polished concrete floor with subtle car reflection underneath
- The car sits naturally on the floor with realistic contact shadows

LIGHTING (CRITICAL — ensure the car is clearly visible):
- Strong KEY LIGHT from upper-right creating bright specular highlights 
  and reflections on the car body, hood, roof and fenders
- FILL LIGHT from the left side to ensure shadow areas remain visible 
  with full detail — no part of the car should disappear into darkness
- RIM / EDGE LIGHTING from behind to clearly separate the car silhouette 
  from the dark background — this is essential for dark-colored cars
- Bright, crisp reflections on the windshield, windows and chrome/metal trim
- The car must be the BRIGHTEST, most prominent element in the scene
- Even if the car is black or very dark, it must have visible highlights, 
  reflections and contour lighting so every body panel is distinguishable

CAR: Keep the car completely unchanged:
- Same paint color, finish and metallic properties
- Same rims, tires, body panels, lights, windows, badges
- Same viewing angle and perspective
- Keep any license plate or advertising board exactly as-is
- If a person/driver is visible inside the car, remove them — 
  the interior should appear empty and clean

QUALITY: Photorealistic, high-end automotive photography, sharp details, 
premium dealership quality.`

// ━━━ STEP 2: AUTOCITY BOARD PLACEMENT ━━━
const BOARD_PROMPT = `TASK: Find and replace the license plate / advertising board on this car 
with the AutoCity dealer board.

HOW TO FIND THE PLATE:
- License plates are always located in the license plate holder on the 
  FRONT bumper (lower center or lower-left area of the front of the car) 
  and/or REAR bumper (lower center of the back of the car)
- The plate sits in a rectangular recess/holder built into the bumper
- It may currently show a Dutch license plate (yellow, white or green), 
  a blue EU plate, an existing advertising board, or any other plate

WHAT TO REPLACE IT WITH:
- Replace the existing plate with the AutoCity advertising board
- The AutoCity board has: SOLID BLACK/DARK NAVY background, white 
  arc/swoosh logo at top, bold white AUTOCITY text below the logo, 
  smaller white AUTOCITY subtext underneath
- Match the exact size, shape and perspective angle of the existing plate
- The board must look physically mounted in the same plate holder
- Apply realistic studio lighting and subtle reflections to the board

WHAT NOT TO CHANGE:
- Do NOT modify the car body, paint, rims, lights, windows or any 
  other part of the car
- Do NOT modify the showroom background, floor, walls or lighting
- Do NOT add any other text, logos or elements anywhere
- Only replace the plate/board area

The result must look photorealistic, as if the AutoCity board was 
always on this car.`

// ━━━ HELPERS ━━━

async function saveToStorage(base64: string, type: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const filename = `showroom/${type}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.png`

  const { error } = await supabase.storage
    .from("car-photos")
    .upload(filename, buffer, { contentType: "image/png", upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from("car-photos")
    .getPublicUrl(filename)

  return urlData.publicUrl
}

async function callGeminiImageEdit(imageBase64: string, prompt: string): Promise<string> {
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

  // Strip data:image/...;base64, prefix if present
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

// ━━━ MAIN HANDLER ━━━

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { imageBase64, step, vehicleId } = await req.json()

    if (!imageBase64) throw new Error("imageBase64 is required")

    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64

    const mode = step || "full"
    console.log(`🚀 Processing mode: ${mode}`)

    let studioUrl: string | undefined
    let finalUrl: string | undefined
    let resultImage: string | undefined

    if (mode === "studio") {
      console.log("🎨 Step 1: Studio transformation (Gemini Pro)...")
      const studioB64 = await callGeminiImageEdit(rawBase64, STUDIO_PROMPT)
      studioUrl = await saveToStorage(studioB64, "studio")
      console.log("✅ Studio done")
    } else if (mode === "board") {
      console.log("🏷️ Step 2: AutoCity board placement (Gemini Pro)...")
      const boardB64 = await callGeminiImageEdit(rawBase64, BOARD_PROMPT)
      finalUrl = await saveToStorage(boardB64, "final")
      console.log("✅ Board done")
    } else {
      console.log("🎨 Step 1/2: Studio transformation (Gemini Pro)...")
      const studioB64 = await callGeminiImageEdit(rawBase64, STUDIO_PROMPT)
      studioUrl = await saveToStorage(studioB64, "studio")
      console.log("✅ Studio done, starting board placement...")

      console.log("🏷️ Step 2/2: AutoCity board placement (Gemini Pro)...")
      const studioImageB64 = await fetchImageAsBase64(studioUrl)
      const boardB64 = await callGeminiImageEdit(studioImageB64, BOARD_PROMPT)
      finalUrl = await saveToStorage(boardB64, "final")
      console.log("✅ Board done")

      resultImage = `data:image/png;base64,${boardB64}`

      if (vehicleId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
          .from("vehicles")
          .update({
            showroom_photo_url: finalUrl,
            showroom_photo_generated_at: new Date().toISOString()
          })
          .eq("id", vehicleId)
        console.log(`✅ Updated vehicle ${vehicleId}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      studioUrl,
      finalUrl,
      resultImage: resultImage || (finalUrl ? `data:image/png;base64,${await fetchImageAsBase64(finalUrl).catch(() => "")}` : undefined),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("❌ Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
