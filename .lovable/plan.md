

# Hoekselectie Verwijderen — AI Herkent Automatisch

## Probleem
De UI toont een handmatige hoek-selector per foto, maar het master prompt instrueert de AI al om de camerahoek zelf te herkennen. Dit was bij Manus ook niet nodig.

## Huidige situatie
- **Frontend**: `Select` dropdown per foto voor shotAngle, plus auto-assignment van 8 standaardhoeken
- **Backend**: `shotAngle` wordt alleen gebruikt voor de `hasBumper` check (board tonen of niet bij zijkant)
- **Master prompt**: Bevat al regels voor "Side view only (90° or 270°) → no board" IN dezelfde sectie als de board placement rules

## Plan

### 1. Backend: Prompt vereenvoudigen (`showroom-photo-studio/index.ts`)
- Verwijder de `shotAngle` parameter uit beide prompt-functies
- Voeg ALLE placement rules samen in één STEP 4 sectie (zoals het originele master prompt):
  - Board specs + placement rules voor front/rear
  - "Side view only (90° or 270°) → no board"
- De AI bepaalt zelf of er een bumper zichtbaar is en plaatst het board wel/niet
- `shotAngle` wordt niet meer uit de request body gelezen

### 2. Frontend: Selector verwijderen (`FotoStudio.tsx`)
- Verwijder de `SHOT_ANGLE_OPTIONS` constante
- Verwijder `STANDARD_ANGLES` en de auto-assign logica bij 8 foto upload
- Verwijder `shotAngle` uit de `StudioImage` interface
- Verwijder de `Select` component uit elke foto-kaart
- Verwijder `shotAngle` uit de request body naar de edge function

### Resultaat
De gebruiker uploadt foto's, de AI herkent automatisch de hoek en beslist zelf of het board geplaatst wordt. Geen handmatige input nodig.

