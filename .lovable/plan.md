

# Interieur Prompt Herschrijven: Anti-Hallucination + Camera Logic

## Kernprobleem

De huidige `buildInteriorPrompt()` is te vaag. Gemini interpreteert "edit" als "maak iets soortgelijks" in plaats van "pas exact deze pixels aan." Het resultaat: verkeerde hoek, verzonnen knoppen, nep-logo's, verkeerde scherminhoud.

## Aanpak

Volledige herschrijving van `buildInteriorPrompt()` in `supabase/functions/showroom-photo-studio/index.ts` (regels 335-397) met drie pijlers:

### 1. Pixel-perfectie afdwingen

De prompt opent met een expliciete instructie dat dit een **inpainting/retouche opdracht** is, geen generatie. Kernzinnen:

```
You are performing PIXEL-LEVEL RETOUCHING on an existing photograph.
Do NOT generate a new image. Do NOT reimagine the interior.
The output must be the EXACT SAME photograph with targeted edits applied.
SAME camera angle. SAME crop. SAME framing. SAME perspective distortion.
Every button, every stitch, every logo, every icon must be IDENTICAL to the input.
```

### 2. Camera-scherm logica (alleen bij actieve achteruit/360 feed)

```
CAMERA FEEDS (backup camera, 360° view, parking sensors):
- If the infotainment screen shows an ACTIVE camera feed: 
  replace ONLY the camera's view area with the showroom environment 
  as if the camera is seeing the showroom. 
  Preserve ALL UI elements around the feed: buttons, icons, text, overlays, guidelines.
- If the screen shows navigation, media, settings, or any non-camera UI: 
  preserve the ENTIRE screen content exactly as-is. Change NOTHING.
```

### 3. Kwaliteitscontrole — direct afkeuren

Toevoegen van een strenge verificatie-instructie aan het einde van de prompt:

```
QUALITY GATE — MANDATORY SELF-CHECK:
Before outputting, compare your result against the input pixel-by-pixel:
☐ Camera angle: IDENTICAL (same lens distortion, same vanishing points)
☐ Every logo/badge: IDENTICAL shape, font, position
☐ Every button/knob: IDENTICAL shape, icon, label text
☐ Steering wheel: IDENTICAL brand logo, button layout, spoke design
☐ Seat stitching pattern: IDENTICAL
☐ Screen content (non-camera): IDENTICAL text, icons, layout
If ANY check fails: your output is REJECTED. Start over.
```

### 4. Showroom enkel door glas

Vereenvoudigd en aangescherpt:

```
SHOWROOM VISIBILITY RULES:
The showroom environment is ONLY visible through:
- Side windows, windshield, rear window
- Interior rear-view mirror reflection
- Exterior side mirror reflections  
- Active camera feed areas (backup/360 ONLY)

NOWHERE ELSE. Not on dashboard plastic, not on piano black trim, 
not on leather, not on any non-glass surface.
```

### 5. Response validatie in edge function

Na de Gemini call, geen extra AI-validatie (te duur/traag). Maar bij fout-resultaat: de gebruiker ziet "Opnieuw" knop. Dit is al geimplementeerd.

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/showroom-photo-studio/index.ts` regels 335-397 | Volledige herschrijving `buildInteriorPrompt()` |
| Redeploy edge function | Automatisch |

Geen frontend wijzigingen nodig. De "Opnieuw" knop + foutmelding flow is al aanwezig.

