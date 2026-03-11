

# 3 Correcties Foto Studio

## Fix 1: Image VOOR prompt in `callGeminiSingleImage`
**Bestand:** `supabase/functions/showroom-photo-studio/index.ts` (regels 229-231)

Huidige volgorde (fout):
```
{ type: "text", text: prompt },        // ← prompt eerst
{ type: "image_url", ... }             // ← afbeelding erna
```

Moet worden (zelfde als `callGeminiWithReference`):
```
{ type: "image_url", ... },            // ← afbeelding eerst
{ type: "text", text: prompt }         // ← prompt erna
```

## Fix 2 & 3: Prompts zijn al volledig
Na vergelijking: de huidige `buildFirstPhotoPrompt` en `buildSequentialPrompt` in de edge function bevatten al het **volledige** Master Prompt V9 inclusief alle 6 stappen, preservation contract, driver removal, en board logic. Er ontbreken geen secties. Geen wijziging nodig.

## Fix 4: Hoek-volgorde begint met `front-right`
**Bestand:** `src/pages/FotoStudio.tsx` (regel 40)

Huidig:
```
['front-left', 'side-left', 'rear-left', 'rear', 'rear-right', 'side-right', 'front-right', 'front']
```

Wordt:
```
['front-right', 'side-left', 'rear-left', 'rear', 'rear-right', 'side-right', 'front-left', 'front']
```

## Samenvatting
- 2 bestanden, 2 kleine wijzigingen
- Edge function: volgorde image/text omdraaien in de single-image Gemini call
- Frontend: `front-right` als eerste hoek in de standaard volgorde

