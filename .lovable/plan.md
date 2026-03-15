

# Interieur switchen naar OpenAI gpt-image-1

## Wat er verandert

De interieur branch in `showroom-photo-studio/index.ts` (regel 474-477) schakelt van Gemini naar OpenAI's `/v1/images/edits` endpoint met `gpt-image-1`. Dit is een **edit** API — het bewerkt bestaande pixels in plaats van een nieuwe afbeelding te genereren. Daardoor blijft het merk, model en alle details intact.

## Stap 1: API key updaten

Je huidige `OPENAI_API_KEY` secret in Supabase moet van een Tier 3+ account komen. Je zei dat je een paid account hebt — maak een nieuwe key aan op platform.openai.com en we vervangen de secret in Supabase.

## Stap 2: `callOpenAIImageEdit` functie toevoegen

Nieuwe functie in de edge function die de OpenAI Images Edit API aanroept:

```typescript
async function callOpenAIImageEdit(imageBase64: string, prompt: string): Promise<string> {
  // Convert base64 to binary blob
  const binaryStr = atob(imageBase64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  const imageBlob = new Blob([bytes], { type: "image/png" })

  const formData = new FormData()
  formData.append("model", "gpt-image-1")
  formData.append("image[]", imageBlob, "photo.png")
  formData.append("prompt", prompt)
  formData.append("size", "auto")
  formData.append("quality", "high")

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  })

  const data = await response.json()
  if (!response.ok) {
    console.error("OpenAI Image Edit error:", JSON.stringify(data))
    throw new Error(`OpenAI fout: ${data.error?.message || JSON.stringify(data)}`)
  }

  // gpt-image-1 returns b64_json by default
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data received from OpenAI")
  return b64
}
```

Key details:
- `size: "auto"` behoudt de originele afmetingen
- `quality: "high"` voor maximale kwaliteit
- `image[]` (met array notatie) is het formaat voor gpt-image-1
- Direct naar `api.openai.com` (niet via Lovable gateway — die ondersteunt geen image edits)

## Stap 3: Interieur branch updaten

Regel 474-477 wijzigen:

```typescript
if (studioMode === 'interieur') {
  console.log(`Processing interieur photo ${num} via OpenAI gpt-image-1 (image edit)`)
  const prompt = buildInteriorPrompt()
  resultB64 = await callOpenAIImageEdit(rawBase64, prompt)
}
```

## Stap 4: Prompt bijwerken

Het `buildInteriorPrompt()` (regels 267-358) wordt vervangen met jouw nieuwe prompt tekst die je eerder deelde — die is al in de code, dus die blijft.

## Wat NIET verandert
- Exterieur pipeline — blijft 100% Gemini
- `buildInteriorPrompt()` — het prompt dat al in de code staat is jouw nieuwe versie
- Frontend — geen wijzigingen
- Storage/database logic — ongewijzigd

## Samenvatting bestanden
- **`supabase/functions/showroom-photo-studio/index.ts`**: nieuwe `callOpenAIImageEdit` functie + interieur branch update
- **Supabase secret `OPENAI_API_KEY`**: moet vervangen worden met key van je Tier 3+ account

