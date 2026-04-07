

## Fix: JP Cars response format — `results` key ontbreekt

### Probleem (bewezen door logs)
```
⚠️ Onverwacht JP Cars response formaat voor Opel Mokka: {"pagable":{"page_index":0,"page_size":100,"total":330},"results":[...]}
```

De JP Cars API retourneert data als `{ pagable: {...}, results: [...] }`. De huidige code (regel 216-226) checkt:
- `Array.isArray(data)` — nee, het is een object
- `data.data` — bestaat niet
- `data.items` — bestaat niet
- **`data.results` — WORDT NIET GECHECKT** ← dit is het probleem

Claude parsing werkt perfect. De data is er. Het wordt alleen weggegooid.

### Fix

**Bestand: `supabase/functions/daan-b2b-analyse/index.ts`**

Voeg `data.results` toe aan de response extractie (regel 219-222):

```typescript
// Huidige code:
if (Array.isArray(data)) {
  listings = data;
} else if (data && Array.isArray(data.data)) {
  listings = data.data;
} else if (data && Array.isArray(data.items)) {
  listings = data.items;
}

// Fix — voeg data.results toe als EERSTE check na raw array:
if (Array.isArray(data)) {
  listings = data;
} else if (data && Array.isArray(data.results)) {
  listings = data.results;
} else if (data && Array.isArray(data.data)) {
  listings = data.data;
} else if (data && Array.isArray(data.items)) {
  listings = data.items;
}
```

Dat is alles. Één `else if` toevoegen, deployen, klaar.

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | `data.results` toevoegen aan response extractie |

