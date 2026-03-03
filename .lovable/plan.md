

# Plan: "Klaar voor levering" indicator + Afleverafspraak plannen vanuit Checklist

## Deel 1: Visuele indicator in B2C tabel

In de `VehicleB2CTableRow` wordt een opvallende badge/indicator getoond wanneer een voertuig voldoet aan beide voorwaarden:
- Import status = `ingeschreven`
- Checklist voortgang = 100%

**Implementatie (`VehicleB2CTableRow.tsx`):**
- Een helper functie `isReadyForDelivery(vehicle)` die beide voorwaarden checkt
- De hele rij krijgt een subtiele groene achtergrond highlight wanneer klaar
- Naast de checklist progressiebalk verschijnt een groene badge: **"Klaar voor levering"** met een check-icoon
- Als de auto al een geplande afleverafspraak heeft (check via `deliveryDate` in details), toon dan "Afspraak gepland" badge in plaats daarvan

**Bestand:** `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx`

## Deel 2: Afleverafspraak plannen vanuit ChecklistTab

In de `ChecklistTab` wordt een sectie toegevoegd die verschijnt zodra het voertuig klaar is voor levering (100% checklist + ingeschreven). De verkoper kan direct een afleverafspraak inplannen die automatisch synchroniseert met Google Calendar.

**Implementatie (`ChecklistTab.tsx`):**
- Nieuwe Card bovenaan (onder de voortgangskaart) die verschijnt bij 100% + ingeschreven
- Bevat datum/tijd picker en optioneel notitieveld
- Klantgegevens worden automatisch ingevuld vanuit het voertuig (customerName, customer email)
- Bij opslaan: maakt een `Appointment` aan via de bestaande `createAppointment()` uit `calendarService.ts` met type `"aflevering"`
- De Google Calendar sync gebeurt automatisch via de bestaande `autoSyncToGoogle` flow
- Na het plannen wordt de afspraakdatum opgeslagen in `vehicle.details.deliveryAppointmentId`

**Bestand:** `src/components/inventory/detail-tabs/ChecklistTab.tsx`

### Technische details

| Onderdeel | Aanpak |
|-----------|--------|
| Ready-check logica | `importStatus === 'ingeschreven' && checklistProgress === 100` |
| Afspraak aanmaken | Hergebruik `createAppointment()` uit `calendarService.ts` met type `"aflevering"` |
| Google Calendar sync | Automatisch via bestaande `autoSyncToGoogle()` — geen extra configuratie nodig |
| Klantdata | Uit `vehicle.customerName`, `vehicle.details.customerEmail`, `vehicle.customerId` |
| Voertuigdata | `vehicleId`, `vehicleBrand`, `vehicleModel`, `vehicleLicenseNumber` worden meegegeven |

**Bestanden die gewijzigd worden:**
- `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx` — groene indicator + badge
- `src/components/inventory/detail-tabs/ChecklistTab.tsx` — afspraak plannen sectie
- Geen database migraties nodig — alles gebruikt bestaande tabellen (`appointments`, `vehicles`)

