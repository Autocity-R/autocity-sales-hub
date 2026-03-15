
## Diepe diagnose (wat is er echt fout)

Je hebt gelijk: dit is **niet** je prompttekst en ook **niet** een missende OpenAI key.

Ik heb gecontroleerd:
- `OPENAI_API_KEY` secret bestaat.
- Edge logs geven consequent:  
  **`Unknown parameter: 'image'. For application/json on /v1/images/edits, use 'images' (array).`**
- In `supabase/functions/showroom-photo-studio/index.ts` gebruikt `callOpenAIImageEdit()` nu:
  - JSON body met `image: [...]` (fout veldnaam)
  - endpoint `/v1/images/edits`
- Daardoor faalt elke interieur call met 500 → frontend toont “Edge Function returned a non-2xx”.

Kort: bij de recente wijziging is het requestformaat verkeerd gezet.  
**Voor JSON edits met GPT image models moet het veld `images` zijn, niet `image`.**

## Implementatieplan

1. **Fix request body in `callOpenAIImageEdit()`**
   - Vervang:
   - `image: [{ type: "base64", data: imageBase64 }]`
   - met:
   - `images: [{ image_url: dataUrl }]`
   - waar `dataUrl = data:image/png;base64,...`

2. **Response expliciet op base64 zetten**
   - Voeg toe in body: `response_format: "b64_json"`
   - Dan blijft bestaande parsing (`data.data?.[0]?.b64_json`) consistent.

3. **Gerichte foutlogging aanscherpen**
   - Log bij fout: HTTP status + OpenAI error JSON + gebruikte top-level body keys (`model, images, prompt, size, response_format`)
   - Niet de volledige base64 loggen.

4. **Redeploy edge function `showroom-photo-studio`**

5. **Verificatie in 2 lagen**
   - **Technische smoke test**: één kleine testafbeelding via function call → moet géén `Unknown parameter: 'image'` meer geven.
   - **E2E UI test in Foto Studio (Interieur)**: upload 1-2 interieurfoto’s en bevestig:
     - geen non-2xx error in console
     - output wordt gerenderd en opgeslagen
     - HARDE EIS #0 gedrag blijft (auto-identiteit behouden).

## Technische details (compact)

Doelvorm van OpenAI call:
```ts
POST /v1/images/edits
Content-Type: application/json

{
  "model": "gpt-image-1",
  "images": [
    { "image_url": "data:image/png;base64,..." }
  ],
  "prompt": "...",
  "size": "1024x1024",
  "response_format": "b64_json"
}
```

## Waarom het “vroeger nog werkte”

Voor de prompt-implementatie draaide deze route anders; in de recente iteraties is de interieurpad naar OpenAI JSON-edit omgezet, maar met **verkeerde veldnaam**. Dat is de concrete regressie die de hele interieurflow breekt.
