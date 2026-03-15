

# Interieur overschakelen naar Gemini

## Waarom

| | OpenAI (huidig) | Gemini (voorstel) |
|---|---|---|
| Status | 403 errors, parsing problemen | Werkt al voor exterieur |
| API key | OPENAI_API_KEY (aparte kosten) | LOVABLE_API_KEY (al beschikbaar) |
| Hallucinations | Regelmatig | Beter in "edit mode" met sterke prompt |
| Image edit | Responses API complex | Eenvoudige chat completions + image input |

## Wijzigingen

**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`

### 1. Interieur routing wijzigen (regels 513-517)

Vervang de OpenAI `callOpenAIImageEdit` call door `callGeminiSingleImage`:

```typescript
if (studioMode === 'interieur') {
  console.log(`Processing interieur photo ${num} via Gemini Pro Image`)
  const prompt = buildInteriorPrompt()
  console.log("INTERIOR PROMPT (first 600 chars):", prompt.substring(0, 600))
  resultB64 = await callGeminiSingleImage(rawBase64, prompt)
}
```

Dit gebruikt exact dezelfde `callGeminiSingleImage` functie die al werkt voor exterieur, maar met de interieur prompt (met alle HARDE EISEN voor identiteitsbehoud, camera schermen, etc.).

### 2. Optioneel: `callOpenAIImageEdit` functie behouden

De functie kan blijven staan als fallback, maar wordt niet meer aangeroepen voor interieur. Kan later verwijderd worden als Gemini goed werkt.

### 3. Redeploy

Edge function wordt automatisch opnieuw gedeployed.

## Voordelen
- Eén pipeline voor alles (Gemini)
- Geen OpenAI 403/parsing issues meer
- Lagere kosten (Lovable AI credits vs OpenAI apart)
- Zelfde bewezen image edit flow als exterieur

