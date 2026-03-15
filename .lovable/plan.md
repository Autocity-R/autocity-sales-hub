

# Fix: OpenAI Image Edit API — JSON format voor gpt-image-1

## Probleem

De logs tonen duidelijk: **`Invalid value: 'gpt-image-1'. Value must be 'dall-e-2'.`**

De huidige code stuurt een **multipart/form-data** request met `image[]` field. Dit is het **oude** formaat dat alleen `dall-e-2` ondersteunt.

OpenAI heeft voor `gpt-image-1` het edit endpoint vernieuwd: het accepteert nu een **JSON body** met een `images` array die base64 data-URLs bevat. De OPENAI_API_KEY staat gewoon in de secrets — die is niet weg.

## Oplossing

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts` — `callOpenAIImageEdit()` (regels 267-306)

Vervang de hele functie: van multipart/form-data naar JSON body:

```typescript
async function callOpenAIImageEdit(imageBase64: string, prompt: string): Promise<string> {
  const dataUrl = `data:image/png;base64,${imageBase64}`;

  const body = {
    model: "gpt-image-1",
    images: [{ image_url: dataUrl }],
    prompt: prompt,
    size: "1024x1024",
    response_format: "b64_json",
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
```

Daarna herdeploy edge function.

