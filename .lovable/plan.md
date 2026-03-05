

# Gecombineerd Finale Plan: Consistentie + Lighting Blueprint

ChatGPT's analyse is terecht. Het huidige plan mist een **fixed lighting blueprint** — de AI weet WEL dat het studio-licht moet matchen, maar niet exact HOE de highlights verdeeld moeten zijn. Dit veroorzaakt inconsistentie tussen foto's.

## Wijzigingen in `supabase/functions/showroom-photo-studio/index.ts`

### 1. RETOUCH_PROMPT: Per-paneel scan toevoegen (na regel 53, voor regel 54)

Nieuw blok dat de AI dwingt elk oppervlak individueel te controleren:

```
━━━ CRITICAL: PER-PANEL VERIFICATION (SCAN BEFORE OUTPUT) ━━━
Before outputting, scan EVERY reflective surface individually:
• Hood — must show ceiling LED streak, NO sky gradient
• Roof — must show ceiling LED streak, NO clouds or blue
• Left door/fender — must show dark studio wall gradient, NO trees/poles/buildings
• Right door/fender — same as left
• Rear quarter panels — must show dark ambient, NO outdoor shapes
• Front/rear bumpers — must show dark floor/wall reflections only
• Chrome trim — must reflect studio ceiling LED, NOT outdoor light
• Windows — must show neutral dark studio glass, NO outdoor scenery
If ANY panel still shows recognizable outdoor elements, you MUST fix it.
```

### 2. SHOWROOM_PROMPT_NORMAL: Vehicle fill + margins + viewing distance (regel 144-147)

```
━━━ VEHICLE PLACEMENT ━━━
- Center horizontally, fill ~50-65% of image width
- Leave at least 10-15% margin on left and right sides, and 10-15% above the roofline
- All wheels on floor plane naturally
- The vehicle must appear at a NATURAL viewing distance — as if photographed by a professional standing 6-8 meters away.
- Do NOT place the car close to the camera. When in doubt, place FURTHER away.
- Do NOT crop any part of the vehicle — complete car must be visible with breathing room
```

### 3. SHOWROOM_PROMPT_NORMAL: Studio Lighting Blueprint (nieuw blok, na LIGHTING INTEGRATION)

Dit is de belangrijkste toevoeging van ChatGPT — een vast lichtmodel zodat ELKE foto dezelfde highlights krijgt:

```
━━━ STUDIO LIGHTING BLUEPRINT (MANDATORY — SAME FOR ALL IMAGES) ━━━
All output images must use the EXACT SAME studio lighting structure, regardless of input photo lighting:

Lighting setup:
• One large rectangular LED ceiling light directly above the vehicle (as seen in Image 3)
• Soft side ambient reflections from dark studio walls
• Dark ambient floor reflection

Paint highlights must appear CONSISTENTLY on every image:
• Bright LED streak along the roofline (most prominent highlight)
• Secondary highlight across the upper shoulder line of the vehicle
• Subtle highlight on the hood surface
• Lower panels and wheel arches must remain DARKER (natural studio light falloff)

This highlight structure must remain consistent across ALL angles of the vehicle.
A viewer looking at 10 different photos in a row should see the SAME lighting feel on every car.
```

### 4. SHOWROOM_PROMPT_NORMAL: Exposure Consistency blok (na lighting blueprint)

```
━━━ EXPOSURE CONSISTENCY (CRITICAL) ━━━
- The vehicle's exposure level must be CONSISTENT regardless of the input photo's original lighting.
- Whether the input was shot in bright sunlight, overcast, or shade — the OUTPUT must look like it was shot in the SAME dark studio with the SAME controlled lighting.
- Target exposure: the car should be moderately lit (not too bright, not too dark) with the LED ceiling as the dominant light source.
- EVERY output photo must have the same overall brightness feel — a viewer looking at 10 photos in a row should not notice exposure differences.
```

### 5. SHOWROOM_PROMPT_STRICT: Zelfde aanpassingen

- Fill 50-65% + margins 10-15% + viewing distance 6-8m (regel 227-230)
- Studio Lighting Blueprint blok toevoegen (na LIGHTING INTEGRATION, regel 250)
- Exposure Consistency blok toevoegen

### Samenvatting

| Locatie | Wijziging |
|---------|-----------|
| `RETOUCH_PROMPT` na r53 | Per-paneel reflectie scan checklist |
| `SHOWROOM_PROMPT_NORMAL` r144-147 | Fill 50-65%, margins 10-15%, camera 6-8m |
| `SHOWROOM_PROMPT_NORMAL` nieuw | Studio Lighting Blueprint (vast lichtmodel) |
| `SHOWROOM_PROMPT_NORMAL` nieuw | Exposure Consistency blok |
| `SHOWROOM_PROMPT_STRICT` r227-230 | Zelfde fill + margins + distance |
| `SHOWROOM_PROMPT_STRICT` nieuw | Zelfde Lighting Blueprint + Exposure Consistency |

