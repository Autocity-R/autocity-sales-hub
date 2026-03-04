

# Plan: Prompt verfijning voor realistische showroomfoto's

## Feedback samenvatting

1. **Lakreflecties**: Buitenlocatie is soms zichtbaar in de lak — AI moet omgevingsreflecties vervangen door showroom-consistente reflecties
2. **Foto 1 = gouden standaard**: Strakke, schone lak zonder doorschijnen — dit is het doel
3. **Foto 2 = te veel doorschijnen**: Omgeving te zichtbaar in de lak, niet clean genoeg
4. **Herpositionering mag**: AI mag de auto iets verschuiven voor betere compositie, MAAR de kijkhoek mag niet veranderen (links-achter blijft links-achter)
5. **Consistente showroom**: Altijd dezelfde AutoCity showroom, nooit een andere stijl

## Wat verandert

Alleen de prompts in `supabase/functions/showroom-photo-studio/index.ts` worden aangescherpt:

### ENHANCE_PROMPT — nieuwe regels toevoegen

- **Reflectie-cleaning**: "Remove any environmental reflections visible in the paint (trees, buildings, sky, parking lots). Replace them with smooth, neutral studio-style reflections consistent with indoor showroom lighting."
- **Geen doorschijnen**: "The paint surface must appear clean and flawless — like a freshly detailed car in a controlled photo booth environment. No outdoor environment should be detectable in the paint reflections."

### SHOWROOM_PROMPT — aanscherpingen

- **Hoekbehoud (versterkt)**: "The camera viewing angle MUST remain IDENTICAL to Image 2. A left-rear photo stays left-rear. A right-side photo stays right-side. You may adjust the vehicle's horizontal position and scale for optimal composition, but NEVER rotate the vehicle or change the viewing perspective."
- **Lakreflecties in showroom**: "The vehicle's paint must show ONLY showroom-consistent reflections — soft LED light strips, the dark walls, and subtle warm highlights. Remove ALL traces of outdoor environments (trees, buildings, clouds, fences) from paint reflections. The paint must look like a freshly polished car photographed in a controlled indoor studio."
- **Showroom consistentie**: "You MUST replicate the EXACT showroom from Image 1. Do NOT invent a different studio. The walls, logo, floor, and lighting must match Image 1 precisely. No variations allowed."
- **Geen doorschijnen**: "The final image must have the quality of a professional photo booth — clean, flawless paint surfaces with no environmental artifacts showing through."

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/showroom-photo-studio/index.ts` | Beide prompts aanscherpen met bovenstaande regels |

Geen andere bestanden wijzigen. Alleen prompt-tekst updates + deploy.

