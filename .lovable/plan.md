

# Plan: Migratie showroom-photo-studio naar OpenAI + correcte BOARD_PROMPT

## Context

De goedgekeurde migratie (Gemini → OpenAI) moet nu uitgevoerd worden. De `transform-car-photo` edge function bevat al de correcte prompts inclusief de kritieke BOARD_PROMPT met "SOLID BLACK/DARK NAVY background, white arc/swoosh logo at top, bold white AUTOCITY text below the logo, smaller white AUTOCITY subtext underneath". Deze prompts worden 1:1 overgenomen.

## Wijzigingen

### 1. `showroom-photo-studio/index.ts` — Volledig herschrijven

Vervang de 777 regels Gemini pipeline door de OpenAI `gpt-image-1` 2-stappen aanpak:

- **Stap 1 (Studio)**: Originele foto → OpenAI image edits met STUDIO_PROMPT → premium donkere showroom
- **Stap 2 (Board)**: Studio-resultaat → OpenAI image edits met BOARD_PROMPT (inclusief exacte zwart bord/wit tekst beschrijving) → AutoCity dealer bord op kenteken
- Opslaan via Supabase Storage `car-photos` bucket
- Zelfde input interface behouden: `{ imageBase64, vehicleInfo? }` 
- Output: `{ resultImage }` (base64 data URL van eindresultaat)
- Gebruikt `OPENAI_API_KEY` secret (al aanwezig)

De BOARD_PROMPT bevat exact:
> "The AutoCity board has: SOLID BLACK/DARK NAVY background, white arc/swoosh logo at top, bold white AUTOCITY text below the logo, smaller white AUTOCITY subtext underneath"

### 2. `FotoStudio.tsx` — Vereenvoudigen

- Verwijder `studioRefBase64` state en `fetchStudioReferenceBase64` preload
- Verwijder `vehicleInfo` uit request body (niet meer nodig, OpenAI pipeline is generiek)
- Processing stappen UI: "1. Studio" → "2. AutoCity Bord" (ipv retouch/showroom/controle)
- Verwijder verification badges, fallback UI, en processingStep logica die Gemini-specifiek is

### 3. `CarPhotoUploader.tsx` — Omschakelen

Wijzig `supabase.functions.invoke("transform-car-photo")` naar `supabase.functions.invoke("showroom-photo-studio")` zodat er nog maar 1 edge function is.

### 4. `transform-car-photo/index.ts` — Verwijderen

Niet meer nodig na consolidatie.

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/showroom-photo-studio/index.ts` | Herschrijven naar OpenAI 2-stappen |
| `src/pages/FotoStudio.tsx` | Vereenvoudigen UI |
| `src/components/inventory/CarPhotoUploader.tsx` | Functienaam wijzigen |
| `supabase/functions/transform-car-photo/index.ts` | Verwijderen |

