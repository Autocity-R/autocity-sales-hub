

# Switch Foto Studio naar Google Gemini via Lovable AI Gateway

## Probleem
De huidige OpenAI `gpt-image-1` levert te donkere resultaten — vooral bij zwarte/donkere auto's verdwijnt de auto in de achtergrond. Manus bevestigt dat Google Gemini aantoonbaar betere kwaliteit levert voor automotive fotografie.

## Aanpak

**Eén bestand wijzigen:** `supabase/functions/showroom-photo-studio/index.ts`

### 1. Vervang OpenAI door Gemini Pro via Lovable AI Gateway

Er is al een `LOVABLE_API_KEY` secret geconfigureerd. Via de Lovable AI Gateway (`ai.gateway.lovable.dev`) is het Gemini Pro image model beschikbaar — geen extra API key nodig.

Vervang `callOpenAIImageEdit` door een nieuwe `callGeminiImageEdit` functie:

```typescript
async function callGeminiImageEdit(imageBase64: string, prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!

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
  if (!response.ok) throw new Error(`Gemini API fout: ${JSON.stringify(data)}`)

  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!imageUrl) throw new Error("No image data received from Gemini")

  // Strip data:image/png;base64, prefix
  return imageUrl.includes(",") ? imageUrl.split(",")[1] : imageUrl
}
```

### 2. Verbeter de studio prompt voor betere belichting

Voeg expliciete lichtinstructies toe zodat ook donkere auto's goed zichtbaar zijn:
- Strong key light van rechtsboven met heldere specular highlights op de carrosserie
- Fill light van links zodat schaduwzijde detail behoudt
- Rim/edge lighting om de auto-silhouet duidelijk te scheiden van de donkere achtergrond
- "The car must be the brightest, most prominent element in the scene"

### 3. Wat blijft ongewijzigd
- BOARD_PROMPT (AutoCity bord) — ongewijzigd
- Storage pipeline (`saveToStorage`, `fetchImageAsBase64`) — ongewijzigd
- Response contract (`success`, `studioUrl`, `finalUrl`, `resultImage`) — ongewijzigd
- Frontend (`CarPhotoUploader.tsx`) — geen wijzigingen nodig
- `OPENAI_API_KEY` verwijzing wordt vervangen door `LOVABLE_API_KEY` (al geconfigureerd)

### Samenvatting
| Wat | Van | Naar |
|-----|-----|------|
| Model | OpenAI gpt-image-1 | Google Gemini 3 Pro Image |
| Gateway | api.openai.com | ai.gateway.lovable.dev |
| API Key | OPENAI_API_KEY | LOVABLE_API_KEY (al aanwezig) |
| Format | multipart/form-data | JSON (chat completions) |
| Studio prompt | Basis belichting | + key/fill/rim light instructies |

