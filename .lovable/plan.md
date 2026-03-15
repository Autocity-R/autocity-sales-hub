

# Interieur: Switch naar OpenAI gpt-image-1 /images/edits

## Probleem
Gemini genereert een nieuwe afbeelding i.p.v. de originele te bewerken → interieur wordt vervormd, merken worden gehallucineert.

## Oplossing
Nieuwe functie `callOpenAIImageEdit()` die de OpenAI `/v1/images/edits` endpoint aanroept. Interieur branch (regel 472-476) schakelt over van `callGeminiSingleImage` naar deze nieuwe functie.

## Wijzigingen — alleen `supabase/functions/showroom-photo-studio/index.ts`

### 1. Nieuwe functie `callOpenAIImageEdit(rawBase64, prompt)`
- Decode base64 → `Uint8Array` (in chunks om stack overflow te voorkomen)
- Converteer altijd naar PNG blob
- Bouw `FormData` met:
  - `image`: PNG blob, filename `"image.png"`
  - `prompt`: string
  - `model`: `"gpt-image-1"`
  - `n`: `"1"`
  - **Geen `size` parameter** — behoudt originele afmetingen
- POST naar `https://api.openai.com/v1/images/edits` met `Bearer ${OPENAI_API_KEY}`
- Parse `response.data[0].b64_json` → return base64 string

### 2. Interieur branch (regel 472-476)
```
if (studioMode === 'interieur') {
  resultB64 = await callOpenAIImageEdit(rawBase64, buildInteriorPrompt())
}
```

### Wat NIET verandert
- Exterieur pipeline (Gemini) — onaangeraakt
- `buildInteriorPrompt()` — onaangeraakt
- Frontend — geen wijzigingen
- Storage/database — onaangeraakt

