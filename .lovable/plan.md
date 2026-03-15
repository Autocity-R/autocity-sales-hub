

# Interieur Master Prompt Vervangen

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`, regels 335-450

Vervang de volledige `buildInteriorPrompt()` functie-body met het exact door jou aangeleverde prompt. Het nieuwe prompt bevat:

- **Professionele identiteit** — "professional automotive photo retouching AI" voor advertisement gebruik
- **RULE #0** — Absolute identity preservation (badges, steering wheel, dashboard, seats, alle elementen)
- **RULE #1** — Composition & framing ongewijzigd
- **RULE #2** — Showroom environment alleen door glas, met gedetailleerde showroom dimensies (12×10×4.5m) en exacte beschrijvingen per raamtype
- **RULE #3** — Infotainment & display screens met speciale camera feed logica (360°/achteruitrij)
- **RULE #4** — Lighting correction (3000K studio lighting)
- **RULE #5** — Retouching & detailing (0km showroom kwaliteit)
- **RULE #6** — Geen branding of tekst toevoegingen
- **Final output requirements** — Max resolutie, exact zelfde compositie, fotorealistisch

De rest van de edge function (API call logica, exterior prompt, upload/opslag) blijft ongewijzigd. Na wijziging wordt de edge function automatisch gedeployed.

