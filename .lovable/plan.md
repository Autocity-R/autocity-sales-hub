

# Plan: Per-foto hoek toewijzing bij bulk uploads

## Concept
Verplaats de `shotAngle` van een globale instelling naar een **per-foto eigenschap**. Na het uploaden van meerdere foto's kan de gebruiker per foto de hoek kiezen via een compact dropdown in de fotokaart. De standaard volgorde van 8 foto's komt overeen met de vaste fotografeervolgorde.

## Slimme standaard: Auto-assign bij bulk upload
Als de gebruiker precies 8 foto's tegelijk uploadt, worden de hoeken automatisch toegewezen in de standaard volgorde:
1. front-left, 2. side-left, 3. rear-left, 4. rear, 5. rear-right, 6. side-right, 7. front-right, 8. front

Bij andere aantallen blijft de hoek leeg (optioneel handmatig in te vullen).

## Wijzigingen

### 1. `StudioImage` interface uitbreiden
- Voeg `shotAngle?: string` toe aan het interface

### 2. `onDrop` aanpassen
- Als `acceptedFiles.length === 8`: wijs automatisch de 8 hoeken toe in volgorde
- Anders: laat `shotAngle` leeg

### 3. Per-foto angle selector in de grid
- Voeg een compact `<Select>` dropdown toe in de actie-balk onderaan elke fotokaart (naast bestandsnaam)
- Toont de huidige hoek of "Geen hoek" als placeholder
- Alleen bewerkbaar als status `queued` of `error` is

### 4. `processImage` aanpassen
- Lees `image.shotAngle` in plaats van de globale `shotAngle` state
- Stuur per foto de juiste hoek mee naar de Edge Function

### 5. Globale shotAngle dropdown verwijderen
- Verwijder de globale hoek-selector uit de instellingen sectie (kenteken blijft globaal, dat is logisch per auto)

### Bestanden
- `src/pages/FotoStudio.tsx` — alle wijzigingen in dit ene bestand

