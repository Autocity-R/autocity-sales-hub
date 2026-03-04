

# Plan: Professionele 3-Stappen Pipeline met Photoroom Cutout

## Analyse van ChatGPT's feedback

ChatGPT heeft gelijk op de kernpunten:
- **Gemini voor cutout = onbetrouwbaar** — dit is de hoofdoorzaak van afgesneden auto's en vervorming
- **Echte alpha-transparantie is noodzakelijk** — "wit als transparantie" werkt niet bij witte/zilveren auto's

Maar op twee punten wijkt mijn advies af:

1. **Server-side compositing in Deno edge functions is technisch niet haalbaar** — Deno heeft geen Sharp of Canvas. Browser Canvas op 1920x1080 is prima voor sequentiële verwerking (1 foto tegelijk renderen, niet 40 tegelijk). ChatGPT's zorgen over "crashes" zijn overdreven voor deze use case.

2. **3 vaste studio templates (front/side/rear) is overkill voor V1** — Eén goede template is voldoende. De auto wordt toch altijd op dezelfde vloerlijn geplaatst ongeacht hoek.

## Kosten

**Photoroom API**: $0.02 per foto. Bij 500 auto's/maand = $10/maand. Zeer betaalbaar.
**Gemini enhance**: wordt al betaald via Lovable AI credits (bestaand).
**Canvas compositing**: gratis (browser).

## Wat er verandert

### 1. Nieuw secret: `PHOTOROOM_API_KEY`
Photoroom biedt 10 gratis credits/maand, daarna $0.02/foto. API key aanmaken op photoroom.com/api.

### 2. Edge Function: `showroom-photo-studio/index.ts` — 2 API-calls

**Call 1 — Photoroom Cutout:**
- POST naar `https://sdk.photoroom.com/v1/segment`
- Input: originele foto als multipart/form-data
- Output: PNG met echte alpha-transparantie (pixel-perfecte cutout)
- Dit vervangt de huidige Gemini "alles-in-één" aanpak

**Call 2 — Gemini Enhance (alleen kleurcorrectie):**
- Input: de originele foto (niet de cutout)
- Prompt: "Enhance this vehicle photo only. Correct white balance, reduce noise, sharpen subtly, increase contrast slightly. Do NOT crop, resize, change angle, or modify the background in any way. Output must have identical framing."
- Output: kleurcorrecte versie
- Dan wordt de cutout-mask van Photoroom toegepast op de enhanced versie

De function retourneert: `{ cutoutImage (base64 PNG), isInterior (boolean) }`

### 3. Frontend Canvas Compositing: `FotoStudio.tsx`

Na ontvangst van de cutout (echte transparante PNG):

1. **Canvas**: 1920x1080 vast formaat
2. **Achtergrond**: vaste `autocity_studio_reference.png`
3. **Auto detectie**: bounding box uit alpha-kanaal (niet-transparante pixels)
4. **Auto schalen**: max 65% canvasbreedte, onderkant wielen op vloerlijn (y=780)
5. **Contact shadow**: ellips onder wielen (blur 25px, opacity 35%)
6. **Vloerreflectie**: auto verticaal flippen, opacity 8%, blur, fade
7. **Export**: JPEG kwaliteit 0.95

### 4. UI stap-indicator

Elke foto toont de huidige stap: "Uitsnijden → Verbeteren → Samenstellen"

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/showroom-photo-studio/index.ts` | Herschrijven — Photoroom cutout + Gemini enhance |
| `src/pages/FotoStudio.tsx` | Herschrijven — Canvas compositing + stap-indicator |

## Vereiste

- **PHOTOROOM_API_KEY** secret moet worden toegevoegd aan Supabase voordat we beginnen

## Later toevoegen (V2)

- Kenteken-detectie + AutoCity plate overlay
- Meerdere studio templates (front/side/rear)
- Fallback naar remove.bg als Photoroom faalt

