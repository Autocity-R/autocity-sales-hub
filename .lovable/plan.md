

# Fix: `callOpenAIImageEdit` → FormData + juiste MIME type

## Diagnose WebP→PNG conversie

**Er is GEEN conversie aanwezig.** De volledige flow:

1. Frontend `fileToBase64()` → `readAsDataURL(file)` → produceert `data:image/webp;base64,...` (voor WebP uploads)
2. Edge function line 551: strip prefix → raw base64 bytes (nog steeds WebP)
3. `callOpenAIImageEdit` line 268: plakt `data:image/png;base64,...` erop → **FOUT: WebP bytes met PNG label**

OpenAI's `/v1/images/edits` accepteert PNG, JPEG, GIF en WebP. Dus conversie is niet nodig — we moeten alleen het **juiste MIME type** meesturen.

## Implementatie

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

### 1. MIME type detectie toevoegen
Detecteer het werkelijke bestandstype uit de base64 magic bytes (PNG = `iVBOR`, WebP = `UklGR`, JPEG = `/9j/`).

### 2. `callOpenAIImageEdit` volledig vervangen (regels 267-329)
Van JSON body → **FormData met binary blob**:

```typescript
async function callOpenAIImageEdit(imageBase64: string, prompt: string): Promise<string> {
  // Detecteer MIME type uit magic bytes
  let mimeType = "image/png";
  let ext = "png";
  if (imageBase64.startsWith("UklGR")) { mimeType = "image/webp"; ext = "webp"; }
  else if (imageBase64.startsWith("/9j/")) { mimeType = "image/jpeg"; ext = "jpg"; }

  // base64 → binary (chunked om stack overflow te voorkomen)
  const binaryStr = atob(imageBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // FormData — GEEN JSON, GEEN image_url
  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("image[]", new Blob([bytes], { type: mimeType }), `photo.${ext}`);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  // GEEN size, GEEN response_format, GEEN Content-Type header

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorCode = errorBody?.error?.code;
    const errorMsg = errorBody?.error?.message ?? "unknown";
    console.error(`OpenAI /images/edits error ${response.status}:`, JSON.stringify(errorBody));
    if (errorCode === "moderation_blocked") {
      throw new Error(`MODERATION_BLOCKED: ${errorMsg}`);
    }
    throw new Error(`OpenAI error (${response.status}): ${errorMsg}`);
  }

  const result = await response.json();
  const item = result.data?.[0];
  if (!item) throw new Error("No image data in response");

  if (item.b64_json) return item.b64_json;

  if (item.url) {
    return await fetchImageAsBase64(item.url);
  }

  throw new Error("No b64_json or url in response");
}
```

### Kernwijzigingen samengevat

| Was | Wordt |
|-----|-------|
| JSON body + `Content-Type: application/json` | FormData + automatische boundary |
| `images: [{ image_url: dataUrl }]` | `image[]` binary blob |
| `size: "1024x1024"` (forceert vierkant) | Geen size → behoudt aspect ratio |
| MIME altijd `image/png` (ook voor WebP bytes) | Detectie uit magic bytes |
| `response_format: "b64_json"` | Weggelaten (niet ondersteund) |

### 3. Frontend (`FotoStudio.tsx`) — geen wijzigingen nodig
De frontend stuurt al correct `readAsDataURL` output. De edge function strip al het prefix op line 551. Geen conversie nodig.

### 4. Redeploy edge function

