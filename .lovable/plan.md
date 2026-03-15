

# Probleem gevonden: Interieur foto 2+ stuurt een reference image mee zonder uitleg

## Wat er mis gaat

De edge function logica op **regel 476-480**:

```text
if (isFirstPhoto) {
  prompt = buildInteriorPrompt()       // ← 1 image + prompt → callGeminiSingleImage ✅
} else {
  prompt = buildInteriorPrompt()       // ← zelfde prompt...
  resultB64 = callGeminiWithReference() // ← maar nu met 2 images! ❌
}
```

Voor interieur foto 2+ stuurt de code **twee images** naar Gemini (`callGeminiWithReference`): de originele foto + een "reference" van de vorige verwerkte foto. Maar het prompt zegt **niets** over die tweede afbeelding. Gemini krijgt dus twee plaatjes zonder te weten wat hij met die tweede moet doen — dit verwart het model en zorgt ervoor dat het regels negeert.

**Daarnaast**: de frontend (`FotoStudio.tsx` regel 90) stuurt ook nog steeds `referenceImageBase64` mee voor foto 2+, zelfs in interieur modus.

## Oplossing

Interieur moet **altijd** `callGeminiSingleImage` gebruiken — geen reference image, 1 prompt, 1 foto.

### Wijzigingen

**1. `supabase/functions/showroom-photo-studio/index.ts` (regels 472-481):**
- Als `studioMode === 'interieur'`: altijd `callGeminiSingleImage` aanroepen met `buildInteriorPrompt()`, ongeacht of het foto 1 of foto 5 is
- De reference image logica alleen voor exterieur behouden

**2. `src/pages/FotoStudio.tsx` (regel 90):**
- Als `studioMode === 'interieur'`: geen `referenceImageBase64` meesturen in de body

Exterieur pipeline blijft 100% onaangeraakt.

