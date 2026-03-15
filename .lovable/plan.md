

# Interieur Prompt Samenvoegen tot 1 Functie

## Probleem
Er zijn nu twee aparte functies (`buildInteriorFirstPrompt` en `buildInteriorSequentialPrompt`) die grotendeels dezelfde prompt bevatten. Je wilt er maar 1.

## Oplossing
Samenvoegen tot **1 functie** `buildInteriorPrompt(photoNumber?: number)`:
- Zonder `photoNumber` (of `photoNumber === 1`): geeft exact jouw prompt terug, zonder toevoegingen
- Met `photoNumber > 1`: geeft dezelfde prompt terug, maar met het **CONSISTENCY REFERENCE** blok erboven (nodig omdat de sequential call een reference image meestuurt die gematcht moet worden)

### Wijzigingen
**`supabase/functions/showroom-photo-studio/index.ts`:**
1. Verwijder `buildInteriorFirstPrompt()` en `buildInteriorSequentialPrompt()`
2. Maak 1 functie `buildInteriorPrompt(photoNumber: number)` die:
   - Altijd jouw exacte prompt bevat
   - Alleen als `photoNumber > 1`: een kort consistency-blok toevoegt bovenaan (verlichting/omgeving matchen met reference)
3. Update de twee aanroepen (regel 580 en 585) naar `buildInteriorPrompt(num)`

