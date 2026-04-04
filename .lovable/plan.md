

# Fix Marco Dashboard — Correcte filters voor tegels 1-3

## Probleem

De huidige `isTransportPhase()` filter sluit auto's uit die `onderweg` zijn van tegels 1-3. Maar dat is fout: een auto die `onderweg` is maar nog niet betaald, moet WEL in "Nog te betalen" staan. Alleen auto's die al `aangekomen` zijn hoeven niet meer opgehaald te worden.

De juiste logica: tegels 1-3 filteren NIET op `import_status`, maar WEL op `transportStatus === 'aangekomen'` (want die is al binnen).

## Wijzigingen in `MarcoDashboard.tsx`

### 1. `isTransportPhase` helper vervangen door `isNotYetArrived`

De nieuwe helper checkt alleen of een auto nog niet fysiek binnen is:

```
const isNotYetArrived = (v: VehicleRow) => {
  const d = v.details || {};
  return d.transportStatus !== 'aangekomen';
};
```

Geen `import_status` check, geen `onderweg` uitsluiting.

### 2. Alert tellingen aanpassen (regels 191-216)

- **Tegel 1 — Nog te betalen**: `isNotYetArrived(v) && purchase_payment_status !== 'volledig_betaald'`
- **Tegel 2 — Betaald, pickup niet verstuurd**: `isNotYetArrived(v) && betaald && !pickupDocumentSent`
- **Tegel 3 — Klaar voor ophalen/onderweg**: `isNotYetArrived(v) && betaald && pickupDocumentSent` (inclusief auto's die al onderweg zijn)
- **Tegels 4-6**: ongewijzigd

### 3. Pipeline `classifyVehicle` aanpassen (regels 80-112)

De `alreadyArrived` check op regel 82 verwijderen. Nieuwe volgorde:

1. B2B papieren (ongewijzigd)
2. Ingeschreven (ongewijzigd)
3. Import in behandeling — toevoegen: `'aangekomen'` aan de lijst
4. Aangekomen + CMR kritiek (ongewijzigd)
5. Aangekomen zonder CMR-issue → `import`
6. **Nieuw**: niet betaald EN niet aangekomen → `nieuw`
7. **Betaald**: betaald, geen pickup, niet aangekomen → `betaald`
8. **Pickup**: betaald + pickup verstuurd OF onderweg, niet aangekomen → `pickup`

Zo vallen auto's die `onderweg` maar onbetaald zijn in `nieuw` (tegel 1), en auto's die `onderweg` en betaald+pickup zijn in `pickup` (tegel 3).

### Samenvatting verschil met vorige versie

| Filter | Was (fout) | Wordt (correct) |
|--------|-----------|-----------------|
| Tegel 1-3 | Sluit `onderweg` uit | Sluit alleen `aangekomen` uit |
| Tegel 1-3 | Checkt `import_status` | Geen `import_status` check |
| Pipeline stap 5 | Mist `import_status='aangekomen'` | Wordt toegevoegd |

### Geen andere bestanden, geen database wijzigingen

