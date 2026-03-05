

# Plan: Voertuiggegevens meegeven aan AI voor identiteitsbehoud

## Probleem

De AI herkent het merk/model visueel en "corrigeert" het naar een versie die hij kent — waardoor een 2024 BMW X5 er opeens uitziet als een 2021 model, met andere koplampen, velgen of bumpers. De oplossing: we vertellen de AI precies welke auto het is.

## Aanpak

### 1. FotoStudio.tsx — Voertuigselector toevoegen

- Voeg bovenaan de pagina een **voertuig-dropdown** toe (Select component) die alle voertuigen uit de database laadt
- Toon: `brand model (year) — kleur — kenteken`
- Zodra een voertuig geselecteerd is, worden de metadata (brand, model, year, color, body_type, details) opgeslagen in state
- De metadata wordt meegegeven bij elke `processImage` call
- Optioneel: handmatige invoer als fallback (tekstveld voor merk/model/kleur)

### 2. Edge function — Metadata verwerken in prompts

**`supabase/functions/showroom-photo-studio/index.ts`**:

- Accepteer nieuwe parameter: `vehicleInfo: { brand, model, year, color, bodyType }`
- Injecteer in **beide prompts** een voertuig-identiteitsblok:

**ENHANCE_PROMPT** krijgt erbij:
```
VEHICLE IDENTITY (DO NOT ALTER):
This vehicle is a [year] [brand] [model] in [color].
Do NOT change any model-specific features: headlights, taillights, grille, bumpers, wheels, badges, body lines.
```

**SHOWROOM_PROMPT** krijgt erbij:
```
VEHICLE IDENTITY (CRITICAL — DO NOT ALTER):
This is a [year] [brand] [model] in [color] ([bodyType]).
You MUST preserve ALL model-year-specific design elements exactly as shown in Image 2:
- Headlight and taillight design specific to this model year
- Front grille and bumper design
- Wheel/rim design exactly as photographed
- All badges, emblems, and model text
- Body lines, proportions, and character lines
- Interior if visible through windows
Do NOT substitute parts from older or newer model years.
```

## Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/FotoStudio.tsx` | Voertuig-dropdown toevoegen, metadata meesturen naar edge function |
| `supabase/functions/showroom-photo-studio/index.ts` | `vehicleInfo` parameter accepteren, dynamisch injecteren in beide prompts |

## Wat NIET verandert

- De 2-staps pipeline (Flash + Pro) blijft identiek
- Referentiefoto-logica blijft hetzelfde
- Batch verwerking, download, progress indicators — alles blijft

