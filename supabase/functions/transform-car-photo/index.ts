import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Prompt A — Studio Transformatie
const STUDIO_PROMPT = `Transform this car photo into a premium automotive showroom studio photo.

ENVIRONMENT: Replace the outdoor background (parking lot, other cars, 
buildings, sky, road, street) with a premium dark studio environment:
- Dark charcoal/black walls on left, right and back
- Large bright white rectangular LED softbox light panel on the ceiling
- Thin horizontal LED strip lights on the left and right walls
- Dark polished concrete floor with subtle car reflection underneath
- The car sits naturally on the floor with realistic contact shadows 
  and floor reflections

CAR: Keep the car completely unchanged:
- Same paint color, finish and metallic properties
- Same rims, tires, body panels, lights, windows, badges
- Same viewing angle and perspective
- Keep any license plate or advertising board exactly as-is
- If a person/driver is visible inside the car, remove them — 
  the interior should appear empty and clean
- Realistic studio lighting on the car body with specular highlights

QUALITY: Photorealistic, high-end automotive photography, sharp details, 
premium dealership quality.`

// Prompt B — AutoCity Bord Plaatsing
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

async function saveToStorage(base64: string, type: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const filename = `showroom/${type}_${Date.now()}.png`

  const { error } = await supabase.storage
    .from("car-photos")
    .upload(filename, buffer, {
      contentType: "image/png",
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from("car-photos")
    .getPublicUrl(filename)

  return urlData.publicUrl
}

async function transformToStudio(imageBase64: string): Promise<string> {
  console.log("🎨 Starting studio transformation...")
  
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      image: imageBase64,
      prompt: STUDIO_PROMPT,
      n: 1,
      size: "1536x1024",
      quality: "high",
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error("OpenAI API error:", data)
    throw new Error(`OpenAI API fout: ${data.error?.message || JSON.stringify(data)}`)
  }

  console.log("✅ Studio transformation complete")
  
  // OpenAI returns b64_json or url depending on response_format
  const base64Image = data.data[0].b64_json
  if (!base64Image) {
    throw new Error("No image data received from OpenAI")
  }
  
  return await saveToStorage(base64Image, "studio")
}

async function placeAutoCityBoard(imageBase64: string): Promise<string> {
  console.log("🏷️ Starting AutoCity board placement...")
  
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      image: imageBase64,
      prompt: BOARD_PROMPT,
      n: 1,
      size: "1536x1024",
      quality: "high",
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    console.error("OpenAI API error:", data)
    throw new Error(`OpenAI API fout: ${data.error?.message || JSON.stringify(data)}`)
  }

  console.log("✅ AutoCity board placement complete")
  
  const base64Image = data.data[0].b64_json
  if (!base64Image) {
    throw new Error("No image data received from OpenAI")
  }
  
  return await saveToStorage(base64Image, "final")
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { imageBase64, step, vehicleId } = await req.json()
    
    if (!imageBase64) {
      throw new Error("imageBase64 is required")
    }
    
    if (!step || !["studio", "board", "full"].includes(step)) {
      throw new Error("step must be 'studio', 'board', or 'full'")
    }

    console.log(`🚀 Processing step: ${step}`)

    let result: { studioUrl?: string; finalUrl?: string }

    if (step === "studio") {
      // Stap 1: Alleen studio transformatie
      const studioUrl = await transformToStudio(imageBase64)
      result = { studioUrl }
    } else if (step === "board") {
      // Stap 2: Alleen AutoCity bord plaatsing
      const finalUrl = await placeAutoCityBoard(imageBase64)
      result = { finalUrl }
    } else if (step === "full") {
      // Volledige flow: studio + board
      console.log("📸 Starting full transformation pipeline...")
      
      // Stap 1: Studio transformatie
      const studioUrl = await transformToStudio(imageBase64)
      
      // Haal studio image op als base64
      const studioResponse = await fetch(studioUrl)
      const studioBuffer = await studioResponse.arrayBuffer()
      const studioBase64 = btoa(String.fromCharCode(...new Uint8Array(studioBuffer)))
      
      // Stap 2: AutoCity bord plaatsing
      const finalUrl = await placeAutoCityBoard(studioBase64)
      
      // Update vehicle record als vehicleId meegegeven
      if (vehicleId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
          .from("vehicles")
          .update({ 
            showroom_photo_url: finalUrl,
            showroom_photo_generated_at: new Date().toISOString()
          })
          .eq("id", vehicleId)
        console.log(`✅ Updated vehicle ${vehicleId} with showroom photo`)
      }
      
      result = { studioUrl, finalUrl }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("❌ Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
