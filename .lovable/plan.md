

# Interieur terugzetten naar Gemini (zelfde als exterieur)

## Analyse

Het exterieur gebruikt `callGeminiSingleImage(rawBase64, prompt)` via de Lovable Gateway Gemini API — 1 foto + 1 prompt. Dit werkt betrouwbaar.

De "Manus" diagnose was onjuist: Gemini werkt prima voor single-image editing zolang het prompt goed is. Het probleem was waarschijnlijk een eerdere bug (reference image bij interieur), niet het model zelf.

De OpenAI `gpt-image-1` switch faalt bovendien omdat het account geen Tier 3+ toegang heeft.

## Wijziging

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

**Regel 526-530** — Verander de interieur branch terug naar Gemini:

```typescript
if (studioMode === 'interieur') {
  console.log(`Processing interieur photo ${num} via Gemini (single image + prompt)`)
  const prompt = buildInteriorPrompt()
  resultB64 = await callGeminiSingleImage(rawBase64, prompt)
}
```

De `callOpenAIImageEdit` functie (regels 436-487) kan verwijderd worden — wordt nergens meer gebruikt.

## Wat NIET verandert
- `buildInteriorPrompt()` — het prompt blijft exact hetzelfde
- Exterieur pipeline — onaangeraakt
- Frontend — geen wijzigingen

