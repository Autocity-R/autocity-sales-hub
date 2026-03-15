

# Interieur Prompt Vervangen — Manus V2

## Samenvatting

Ja, dit nieuwe prompt van Manus is een duidelijke verbetering. De drie belangrijkste fixes zitten erin:

1. **Pixel-lock framing** (Rule #0 is nu de hoogste prioriteit, met expliciete "transparent overlay" instructie)
2. **Camera feeds vereenvoudigd** (Rule #3: alleen lege showroom vloer/muren, geen auto renderen)
3. **Showroom consistent met exterieur** (10×8×4.5m, zelfde kleuren en materialen)

Verder zijn de regels beter gestructureerd en beknopter.

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

**Regels 335-512** — Vervang de volledige body van `buildInteriorPrompt()` met het exact aangeleverde prompt van Manus.

Belangrijkste verschillen met het huidige prompt:

| Aspect | Huidig | Nieuw (Manus) |
|--------|--------|---------------|
| Rule #0 | Identity preservation | **Pixel-lock composition** (framing eerst) |
| Rule #1 | Composition unchanged (kort) | **Vehicle interior 100% unchanged** (uitgebreid) |
| Showroom maten | 12×10×4.5m | **10×8×4.5m** (gelijk aan exterieur) |
| Camera feeds | "Render car in showroom" | **Alleen lege showroom vloer/muren** |
| Temperatuur | 3000K | **3200K** |
| Structuur | Minder expliciet over forbids | **Elke regel heeft eigen FORBIDDEN lijst** |

Geen andere bestanden worden gewijzigd. Edge function wordt automatisch gedeployed.

