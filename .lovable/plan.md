
Doel: de 500-error oplossen (`Unknown parameter: 'images[0].type'`) in `showroom-photo-studio`.

## Diagnose (op basis van huidige code + logs)
- De function draait wél (request komt binnen, step 1 start), maar faalt bij OpenAI request.
- In `supabase/functions/showroom-photo-studio/index.ts` wordt nu JSON gestuurd met:
  - `images: [{ type, media_type, data }]`
- OpenAI antwoordt expliciet dat `images[0].type` onbekend is.  
  Dat betekent: payload-structuur klopt niet voor deze endpoint-variant.

## Plan van aanpak
1. **Wijzig OpenAI call naar multipart/form-data (stabiele edit-flow)**
   - Bestand: `supabase/functions/showroom-photo-studio/index.ts`
   - Alleen helper `callOpenAIImageEdit(...)` aanpassen:
     - Base64 -> `Uint8Array` -> `Blob`
     - `FormData` maken met:
       - `model = gpt-image-1`
       - `image = <blob>`
       - `prompt`
       - `size`
       - `quality`
       - `n`
     - `fetch` met alleen `Authorization` header (geen handmatige `Content-Type`).
   - Reden: `/v1/images/edits` accepteert betrouwbaar multipart met `image`; de JSON-variant veroorzaakt hier schema-conflict.

2. **Laat de rest van de pipeline intact**
   - STUDIO_PROMPT en BOARD_PROMPT blijven ongewijzigd (inclusief de exacte AutoCity-zin).
   - Opslag in `car-photos` bucket blijft gelijk.
   - Response-contract (`success`, `studioUrl`, `finalUrl`, `resultImage`) blijft gelijk.
   - Frontend (`FotoStudio.tsx` en `CarPhotoUploader.tsx`) hoeft niet aangepast te worden.

3. **Controle na wijziging**
   - Edge logs moeten geen `unknown_parameter` meer tonen.
   - Verwachte flow:
     - `Step 1/2: Studio transformation...` slaagt
     - `Step 2/2: AutoCity board placement...` slaagt
     - `success: true` response terug naar frontend.

## Technische details (kort)
```text
Nu (fout):
POST /v1/images/edits
Content-Type: application/json
images[0].type -> unknown_parameter

Straks (correct):
POST /v1/images/edits
Content-Type: multipart/form-data (automatisch)
image=@input.png
model=gpt-image-1
prompt=...
```

## Bestanden
- `supabase/functions/showroom-photo-studio/index.ts` — update van OpenAI request-opbouw in `callOpenAIImageEdit`.
