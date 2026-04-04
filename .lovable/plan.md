

# Fix Marco Dashboard — Correcte filters voor alle tegels

## Probleem

De `classifyVehicle` functie in `MarcoDashboard.tsx` heeft twee bugs:

1. **Boolean string vergelijking**: JSONB slaat waarden op als strings (`"true"`, `"false"`). De code doet `!d.cmrSent` maar string `"false"` is truthy in JavaScript, dus `!d.cmrSent` evalueert naar `false` terwijl het `true` zou moeten zijn.

2. **Tegel 2 (Betaald) mist pickupDocumentSent check**: De code controleert alleen `pickupStatus !== 'gereed'` maar moet ook checken of `pickupDocumentSent` niet verstuurd is.

## Verwachte resultaten na fix

| Tegel | Huidig | Verwacht |
|-------|--------|----------|
| 1 — Nieuw wacht betaling | 0 | 35 |
| 2 — Betaald, pickup niet verstuurd | 0 | 37 |
| 3 — Klaar voor ophalen | 0 | 0 (correct) |
| 4 — CMR kritiek | 0 | 11 |
| 5 — BPM te laat | 0 | 0 (correct) |
| 6 — Inschrijving te laat | 0 | 0 (correct) |

## Wijzigingen

### `MarcoDashboard.tsx` — `classifyVehicle` functie herschrijven

Voeg een helper toe die JSONB boolean strings correct evalueert:

```typescript
function isTruthy(val: any): boolean {
  return val === true || val === 'true';
}
```

Pas de `classifyVehicle` logica aan:

- **Nieuw (wacht betaling)**: `purchase_payment_status !== 'volledig_betaald'` (inclusief NULL/undefined)
- **Betaald (pickup niet verstuurd)**: `purchase_payment_status === 'volledig_betaald'` AND `pickupDocumentSent` is niet true AND niet al onderweg/aangekomen
- **Pickup gereed / onderweg**: betaald AND pickupDocumentSent is true AND transportStatus niet onderweg/aangekomen, OF transportStatus = onderweg
- **Aangekomen — CMR**: transportStatus = aangekomen AND cmrSent niet true AND papersReceived niet true
- **Import**: import_status in behandeling, of aangekomen met CMR/papieren al gedaan
- **Ingeschreven**: ongewijzigd
- **B2B papieren**: ongewijzigd, maar ook met `isTruthy` fix

Dezelfde `isTruthy` fix toepassen op:
- Alert tegel `pickupGereed`
- CSV export kolommen
- Tabel weergave (checkmarks)

### Geen database wijzigingen nodig

Alle data staat correct in de database. Alleen de JavaScript filters lezen de waarden verkeerd.

