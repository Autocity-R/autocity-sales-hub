

# Interieur Prompt V3 — Close-up Bescherming & Camera Proportions

## Analyse van de resultaten

Drie problemen uit de vergelijkingen:

1. **Stuur close-up (IMG_7843)**: De AI ziet de wazige achtergrond achter het stuur (door de voorruit) en probeert daar een volledige showroom te projecteren. Hierdoor zoemt hij uit en hallucineert hij deurpanelen, zijramen en showroom die er niet zijn. Bij close-ups met minimaal zichtbaar glas moet de AI ALLEEN het kleine stukje zichtbaar raam vervangen en verder niets doen.

2. **Camera view (IMG_7845)**: De showroom op het scherm ziet er beter uit maar de verhoudingen kloppen niet — het lijkt een veel grotere ruimte dan 10x8x4.5m. De spotlights zijn te veel en te klein.

3. **Dashboard (IMG_7841)**: Goed maar iets uitgezoomd waardoor deurpanelen gehalluceerd worden aan de randen.

## Wijzigingen aan `buildInteriorPrompt()` in `supabase/functions/showroom-photo-studio/index.ts`

### 1. Rule #0 — Toevoegen: Close-up / detail foto bescherming

Na de bestaande FORBIDDEN lijst, toevoegen:

```
CRITICAL — CLOSE-UP AND DETAIL PHOTOS:
- If the photo is a close-up of a specific interior element (steering wheel, 
  gear shifter, seat detail, badge, controls), the output MUST remain a 
  close-up with the EXACT same framing
- Do NOT zoom out to reveal more of the interior
- Do NOT add or hallucinate interior elements (door panels, windows, seats, 
  pillars) that are NOT visible in the original photo
- If only a small sliver of window or blurred background is visible behind 
  the subject, replace ONLY that small visible area — do NOT expand it
- The edges and boundaries of the output image must contain the SAME content 
  as the edges of the input image — never generate new content at the borders
- If no window is clearly visible in the photo: do NOT add any showroom 
  environment — only apply retouching (Rule #5) and lighting correction (Rule #4)
```

### 2. Rule #2 — Toevoegen: Scope beperking

Na "The interior of the car itself is NEVER part of the showroom.", toevoegen:

```
CRITICAL SCOPE LIMITATION:
- The showroom environment is ONLY placed in areas where you can clearly see 
  OUTDOOR scenery (sky, buildings, parking lot, trees, roads) through actual 
  glass windows in the original photo
- Blurred backgrounds, out-of-focus areas behind interior elements, or dark 
  areas are NOT windows — do NOT project showroom environment into them
- If the photo shows mostly interior with very little or no visible window 
  area: apply ONLY retouching and lighting — do NOT force a showroom into 
  the image
- NEVER expand the visible window area beyond what is shown in the original
- NEVER hallucinate additional windows, door panels, or pillars to create 
  more surface area for the showroom
```

### 3. Rule #3 — Camera feed proportie-correctie

Vervang de huidige camera feed beschrijving met meer realistische proportie-instructies:

```
REPLACE ONLY the background environment in the camera feed:
- Replace outdoor/parking scenery with the EMPTY showroom floor and walls
- The showroom in the camera feed must respect the REAL dimensions: 
  10m wide × 8m deep × 4.5m high
- REVERSE CAMERA view: the camera is at the rear of the car looking back
  — show approximately 4 meters of dark concrete floor before hitting the 
  rear wall, wall fills upper 40-50% of the camera feed, 1-2 large warm 
  spotlight pools on the wall, ceiling NOT visible (camera angle too low)
- BIRD'S-EYE / 360° TOP-DOWN view: show the car silhouette from above on 
  dark concrete floor, walls visible at all 4 edges approximately 3-4 
  meters from the car, 2-3 spotlight pools on each visible wall
- Side camera views: show the side wall approximately 3 meters away, 
  1-2 warm spotlight pools
- The showroom must look SMALL and INTIMATE — not like a warehouse or 
  aircraft hangar
```

### 4. Geen andere wijzigingen

Rules #1, #4, #5, #6 en Output Specification blijven exact hetzelfde.

| Probleem | Oorzaak | Oplossing |
|----------|---------|-----------|
| Close-up uitzomen + hallucinatie | AI ziet wazige achtergrond als "raam" | Expliciete close-up bescherming + scope beperking |
| Deurpanelen gehalluceerd | AI zoemt iets uit bij dashboard shot | "Never generate new content at borders" regel |
| Camera feed proporties onrealistisch | Geen concrete afstandsinstructies | Exacte afstanden per camerahoek (4m tot muur, etc.) |

