

# Fix interieur: HARDE EIS #0 + belichting correctie

## Wat je zei

Je wilt dat de auto-identiteit 100% behouden blijft (HARDE EIS #0), maar de belichting mag wél aangepast worden — als het origineel overbelicht is, mag het donkerder. De AI moet professionele studio-belichting toepassen, niet per se de originele belichting kopiëren.

## Wijzigingen

**Bestand: `supabase/functions/showroom-photo-studio/index.ts`** — `buildInteriorPrompt()` (regel 312-403)

Voeg **HARDE EIS #0** toe als eerste eis (vóór HARDE EIS #1), met deze tekst:

```
HARDE EIS #0 — VOERTUIG IDENTITEIT 100% ONGEWIJZIGD:
You are EDITING an existing photo. You are NOT generating a new image.
The vehicle in the output MUST be EXACTLY the same vehicle as in the input.
✅ PRESERVE EXACTLY: make, model, brand, every badge, every logo, every emblem
✅ PRESERVE EXACTLY: steering wheel shape, logo, buttons
✅ PRESERVE EXACTLY: dashboard layout, gauge cluster, infotainment screen
✅ PRESERVE EXACTLY: seat design, headrest shape, stitching, material texture
✅ PRESERVE EXACTLY: door panel, center console, gear shifter
❌ ABSOLUTELY FORBIDDEN: changing the car into a different brand or model
❌ ABSOLUTELY FORBIDDEN: altering the shape of ANY interior component
❌ ABSOLUTELY FORBIDDEN: inventing, adding, or removing ANY physical element
```

Geen belichting-preservatie eis — de bestaande retouche-sectie (regel 387-392) zegt al correct "vervang door zachte warme 3000K studio verlichting". Dat is precies wat je wilt: professionele belichting, niet per se het origineel kopiëren.

**API call** (`callOpenAIImageEdit`, regel 267-306): voeg `response_format: "b64_json"` toe voor expliciete base64 response + extra debug logging (blob size, endpoint bevestiging).

Daarna herdeploy van de edge function.

