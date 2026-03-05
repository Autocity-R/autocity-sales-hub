

# Plan: Alle prompts aanscherpen — showroom-consistentie, reflecties, nummerboorden, kleur

Eén bestand wijzigt: `supabase/functions/showroom-photo-studio/index.ts` — alle drie de prompts worden herschreven.

---

## RETOUCH_PROMPT (regels 9-38)

Huidige problemen: buitenreflecties blijven zichtbaar, lak niet glad genoeg, reflecties verraden buitenlocatie.

Aanpassingen:
- **"YOU MAY" sectie**: toevoegen dat buitenreflecties (bomen, gebouwen, lucht) in lak en glas **vervangen** mogen worden door neutrale donkere indoor-reflecties (donkere muren, zacht LED-licht). De auto moet eruitzien alsof hij binnenstaat.
- **Lak-finish**: toevoegen "Make paint appear freshly waxed — smooth, even gloss across all panels, no dull patches or uneven spots."
- **Regel 19**: wijzigen van "Reduce harsh environmental reflections (soften them)" → "Replace outdoor environment reflections in paint and glass (trees, buildings, sky, clouds, fences) with neutral, dark, diffuse reflections consistent with an indoor showroom (dark walls, soft overhead LED lighting)."
- **Regel 31**: wijzigen van "Do NOT replace reflections with studio reflections — only SOFTEN" → "You MUST replace outdoor environment reflections with neutral indoor reflections. But do NOT alter the SHAPE of reflective surfaces — only change WHAT is reflected in them."
- Behoud geometrie-lock volledig intact.

## SHOWROOM_PROMPT (regels 41-107)

Huidige problemen: showroom verschilt per foto, logo wordt anders getekend, nummerboorden verdwijnen, kleur verschuift.

Aanpassingen:
- **Showroom beschrijving (regels 87-92)** veel specifieker maken:
  - "Dark charcoal/anthracite TEXTURED walls (not smooth, not black, not grey — match Image 1 exactly)"
  - "White 3D BLOCK LETTERS spelling 'AUTOCITY' on the back wall — NOT a car silhouette logo, NOT illuminated neon, NOT a different font. Plain white 3D block letters exactly as in Image 1."
  - "Thin white LED light strips running along ceiling edges — match Image 1"
  - "Polished dark concrete floor"
  - "Do NOT invent, redesign, or reinterpret the showroom. Copy it EXACTLY from Image 1."
- **Nummerboorden** toevoegen aan Vehicle Integrity sectie (regel 85):
  - "LICENSE PLATES & PLATE HOLDERS: If the original vehicle (Image 3) has license plates, dealer plate frames, or branded plate holders (e.g. 'AUTOCITY'), these MUST be preserved exactly. Do NOT remove, replace, blur, or alter any plates or plate frames."
- **Kleurconsistentie** toevoegen:
  - "The vehicle body color must be EXACTLY the same as in Image 3. Do NOT shift hue, saturation, or brightness. If the car is dark blue, it stays dark blue — not black, not light blue."
- **Reflecties in showroom** (regels 99-102):
  - "ALL reflections visible on vehicle paint MUST be consistent with this indoor showroom — dark walls, soft LED strips. No trees, sky, buildings, or outdoor elements may appear in paint reflections."

## VERIFICATION_PROMPT (regels 110-133)

Uitbreiden met 3 extra checks:

- Check 6: "SHOWROOM: Does the background match the reference studio? Dark textured walls, white AUTOCITY block letters, LED strips? Or is it a different/invented studio?"
- Check 7: "LICENSE PLATES: Are original license plates and plate holders preserved from the original?"
- Check 8: "COLOR: Is the vehicle body color consistent with the original? No hue/saturation shift?"

JSON schema uitbreiden:
```json
{
  "pass": true/false,
  "severity": "none/low/medium/high",
  "mirrored": true/false,
  "showroom_match": true/false,
  "plates_preserved": true/false,
  "color_consistent": true/false,
  "changed_parts": ["..."],
  "issues": ["..."]
}
```

`pass` is nu `true` alleen als alle 8 checks slagen.

---

## Pipeline-logica

Geen structurele wijzigingen aan de flow (stap 1→2→3, retry, fallback). Alleen de prompt-teksten en het verificatie-schema worden aangepast. Na deploy opnieuw testen.

