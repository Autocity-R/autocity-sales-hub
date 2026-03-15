

# Interieur prompt vereenvoudigen — consistency block verwijderen

## Wat verandert
**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

Alleen de `buildInteriorPrompt()` functie (regel 266-282):
- Verwijder de `photoNumber` parameter
- Verwijder het `consistencyBlock` (regels 267-281)
- De functie retourneert altijd exact hetzelfde prompt, ongeacht welke foto het is

Update aanroepen op regels 490 en 495: `buildInteriorPrompt(num)` → `buildInteriorPrompt()`

## Wat NIET verandert
- `buildFirstPhotoPrompt()` (exterieur foto 1) — **onaangeraakt**
- `buildSequentialPrompt()` (exterieur foto 2+) — **onaangeraakt**
- Hele exterieur pipeline en logica — **onaangeraakt**
- API calls, storage, routing — **onaangeraakt**

