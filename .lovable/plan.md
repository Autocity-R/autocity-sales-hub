

## Plan: Force-send Daan B2B email voor test

### Probleem
De functie heeft een duplicate-check die blokkeert omdat er vandaag al een (lege) email in de queue staat. We moeten de check tijdelijk bypassen.

### Wijziging

**`supabase/functions/daan-b2b-analyse/index.ts` (regel 667-669)**

Voeg `force` mode toe naast `download`:

```typescript
const isDownloadMode = body?.mode === "download";
const isForceMode = body?.force === true;

if (!isDownloadMode && !isForceMode) {
```

Dit laat ons de functie aanroepen met `{ "force": true }` om de duplicate-check te skippen.

Na deploy roep ik de functie aan met `{ "force": true }` zodat de email opnieuw wordt verstuurd — nu met de correcte `htmlBody`, `senderEmail` en Excel bijlage.

De `force` parameter blijft beschikbaar voor toekomstige handmatige tests.

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | `force` bypass toevoegen aan duplicate check |

