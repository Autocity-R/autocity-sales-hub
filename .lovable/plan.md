

## Plan: Import status "forward lock" met Sheet-override

### Probleem
Als iemand handmatig de import_status terugzet (bv. `goedgekeurd` → `niet_gestart`), blokkeert de hiërarchie check daarna terecht alle updates vanuit de Sheet. De auto zit dan vast op de verkeerde status.

### Oplossing
Voeg een `import_status_locked_at` timestamp toe. Elke keer dat de webhook de status vooruit zet, wordt dit veld gevuld. De hiërarchie check wordt aangepast: als de huidige DB-status LAGER is dan de vorige locked status (= handmatige reset), dan mag de Sheet-update WEL door.

### Stap 1: Database migratie
Voeg kolom toe aan `vehicles`:
```sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS import_status_locked_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS import_status_highest text;
```
`import_status_highest` slaat de hoogst bereikte status op, zodat we een handmatige reset kunnen detecteren.

### Stap 2: Webhook logica aanpassen (`sheets-import-webhook/index.ts`)

**A. Ontbrekende status `aangemeld` toevoegen aan hiërarchie:**
```typescript
'aangemeld': 2,
'aanvraag_ontvangen': 3,
'aangekomen': 4,
'goedgekeurd': 5,
'bpm_betaald': 6,
'ingeschreven': 7,
```

**B. Early-return bij gelijke status** (voorkomt 700K+ nutteloze logs):
```typescript
if (mappedStatus === oldStatus) {
  return // skip, geen log aanmaken
}
```

**C. Hiërarchie check aanpassen met override-detectie:**
```typescript
const highestReached = statusHierarchy[vehicle.import_status_highest] ?? -1;
const currentIndex = statusHierarchy[oldStatus] ?? -1;
const newIndex = statusHierarchy[mappedStatus] ?? -1;

// Detecteer handmatige reset: huidige status is lager dan hoogst bereikte
const wasManuallyReset = currentIndex < highestReached;

if (newIndex >= 0 && currentIndex >= 0 && newIndex <= currentIndex && !wasManuallyReset) {
  // Blokkeer downgrade (normaal gedrag)
} else {
  // Update doorlaten (inclusief bij handmatige reset)
}
```

**D. Bij succesvolle update: hoogste status bijwerken:**
```typescript
const newHighest = Math.max(newIndex, highestReached);
// Update import_status_highest naar de hoogste bereikte status
```

### Wat dit oplost
- Status gaat automatisch vooruit via de Sheet (aanvraag_ontvangen → goedgekeurd → bpm_betaald → ingeschreven)
- Handmatig terugzetten is mogelijk, maar de Sheet corrigeert het automatisch terug naar de juiste stap
- Geen onnodige logs meer bij gelijke status
- `aangemeld` status wordt correct herkend

### Wat NIET wijzigt
- Frontend code ongewijzigd
- Google Apps Script ongewijzigd
- Bestaande beschermingen (rdw_protected, trade-in, transport) blijven intact

| Component | Actie |
|-----------|-------|
| Database migratie | `import_status_highest` + `import_status_locked_at` kolommen |
| `sheets-import-webhook/index.ts` | Early-return, hiërarchie uitbreiden, override-detectie |

