

# Plan: Verbeterde Foto Studio — 2-Staps AI Pipeline

## Wat verandert

De gele balk hoeft niet in de Foto Studio — die wordt apart toegepast in het advertentiesysteem. We focussen puur op betere showroomfoto's.

## Wijzigingen

### 1. `supabase/functions/showroom-photo-studio/index.ts` — Herschrijven

**2 sequentiële AI-calls:**

**Stap 1 — Enhancement (gemini-2.5-flash-image)**
- Alleen kleurcorrectie, witbalans, ruis, scherpte
- Expliciet verbod op crop, zoom, hoekwijziging
- Output = verbeterde foto, zelfde compositie

**Stap 2 — Showroom Compositing (gemini-3-pro-image-preview)**
- Input: enhanced foto + referentiefoto uit public/studio/
- Strengere prompt met:
  - Vast outputformaat 1920x1080 landscape
  - Zero-crop garantie: alle 4 wielen, spiegels, dak, bumpers volledig in beeld
  - Auto-integriteit checklist: velgen, kleur, badges, kentekenhouders, body lines, koplampen NIET wijzigen
  - Showroom specs: donkere wanden, witte LED AUTOCITY logo, witte LED-strips, gepolijste vloer
  - Plaatsing: auto gecentreerd, 55-65% breedte, wielen op vloerlijn
  - Schaduw: contactschaduw onder banden, vloerreflectie 10% opacity

### 2. `src/pages/FotoStudio.tsx` — Kleine updates

- Stap-indicator per foto: "Verbeteren → Showroom" (toont welke stap actief is)
- Preview hoogte van h-52 naar h-72
- Status tekst aanpassen: "AI verbetert foto..." → "AI plaatst in showroom..."

## Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/showroom-photo-studio/index.ts` | Herschrijven — 2 AI-calls met strengere prompts |
| `src/pages/FotoStudio.tsx` | Update — stap-indicator, grotere previews |

