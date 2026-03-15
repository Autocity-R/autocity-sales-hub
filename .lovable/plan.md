

# Fix: Verwijder `quality` parameter uit OpenAI edits API call

## Probleem
De edge function logs tonen duidelijk de fout: **`Unknown parameter: 'quality'`**. De OpenAI `/v1/images/edits` endpoint accepteert geen `quality` parameter — die is alleen beschikbaar voor `/v1/images/generations`.

## Oplossing
**Bestand:** `supabase/functions/showroom-photo-studio/index.ts`, regel 285

Verwijder de regel:
```typescript
formData.append("quality", "high")
```

Daarna herdeploy van de edge function.

