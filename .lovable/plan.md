

## Plan: Dynamische trade-in bescherming

### Huidige situatie
De webhook blokkeert ALLE voertuigen met `isTradeIn = true`. Dit is te streng: sommige inruilauto's zijn ook importauto's die RDW-updates nodig hebben.

### Oplossing
Verwijder alleen de `isTradeIn` check uit de blokkade. De `leenauto` check blijft staan. Als het Google Apps Script een update stuurt voor een inruilauto, betekent dat automatisch dat deze auto in het importproces zit en de update moet doorkomen.

### Wijziging in `sheets-import-webhook/index.ts`

**Van:**
```typescript
// === BESCHERMING 1: Inruil/leenauto skip ===
if (details.isTradeIn === true || vehicle.status === 'leenauto') {
```

**Naar:**
```typescript
// === BESCHERMING 1: Leenauto skip ===
// Trade-ins worden NIET meer geblokkeerd: als de Sheet een update stuurt
// voor een inruilauto, betekent het dat deze ook een importauto is.
if (vehicle.status === 'leenauto') {
```

### Logica
- **Leenauto**: altijd skippen (heeft nooit een importproces)
- **Inruilauto**: als de Sheet een update pusht, laat deze door. Geen update = geen actie (dynamisch)
- Geen andere wijzigingen nodig

| Bestand | Actie |
|---------|-------|
| `supabase/functions/sheets-import-webhook/index.ts` | Verwijder `isTradeIn` check, behoud `leenauto` check |

