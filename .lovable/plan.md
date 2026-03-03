

# Plan: Afspraak annuleren + Betere zichtbaarheid "Klaar voor levering"

## 1. Afspraak annuleren in ChecklistTab

In `ChecklistTab.tsx`: de huidige "Afleverafspraak is ingepland" card (regel 258-267) uitbreiden met:
- Een **"Annuleren / Opnieuw plannen"** button
- Bij klikken: verwijdert `deliveryAppointmentId` uit vehicle details en slaat op via `onAutoSave`
- Hierdoor verschijnt de `DeliveryAppointmentCard` opnieuw zodat een nieuwe datum gekozen kan worden

## 2. Betere zichtbaarheid "Klaar voor levering" in B2C tabel

In `VehicleB2CTableRow.tsx`: de huidige subtiele groene styling opvallender maken:
- **Rij-achtergrond**: van `bg-emerald-50/60` naar een sterkere `bg-emerald-100 dark:bg-emerald-950/40` met een dikkere left-border
- **"Klaar voor levering" badge**: van `outline` variant naar een solid groene badge (`bg-emerald-500 text-white`) met groter font en sterkere animate-pulse
- **"Afspraak gepland" badge**: ook opvallender met solid blauwe achtergrond

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/detail-tabs/ChecklistTab.tsx` | Annuleer-knop toevoegen aan bestaande afspraak-card |
| `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx` | Sterkere kleuren voor ready-for-delivery indicator |

