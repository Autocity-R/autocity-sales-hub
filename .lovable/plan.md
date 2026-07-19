## Diagnose

De afleverafspraak-kaart op de voertuigdetail (B2C) roept bij "Inplannen" twee dingen aan:

1. `createAppointment(...)` → dit slaagt (afspraak komt in de agenda ✅).
2. `onAppointmentCreated(id)` → zet `vehicle.details.deliveryAppointmentId` en roept `onAutoSave(updatedVehicle)` aan om die koppeling op te slaan in `vehicles`.

Op de Verkocht B2C-lijst (`src/pages/InventoryB2C.tsx`, regel 424–435) wordt `<VehicleDetails>` gerenderd **zonder** de prop `onAutoSave`. Daardoor:

- De koppeling `deliveryAppointmentId` wordt alleen in lokale state gezet, nooit naar Supabase geschreven.
- Bij herladen is de koppeling weg → "de auto weet niet dat er een afspraak is".
- De foutmelding komt uit dezelfde flow: `handleDeliveryAppointmentCreated` roept `onAutoSave(updatedVehicle)` aan, dat is `undefined` in dit pad, én de debounced auto-save in `VehicleDetails` is óók gated op `onAutoSave` — dus niets slaat op.

Ter vergelijking: `src/pages/Inventory.tsx` (voorraad) en `AftersalesDashboard.tsx` geven wél een `onAutoSave` door, daar werkt het correct.

## Fix (klein, additief)

1. In `src/pages/InventoryB2C.tsx`:
   - Voeg een `handleAutoSave` toe die de bestaande update-mutatie hergebruikt (`handleUpdateVehicle` uit `useB2CVehicleHandlers`, of de onderliggende `autoSaveVehicleMutation` als die bestaat — anders gewoon `handleUpdateVehicle`).
   - Geef `onAutoSave={handleAutoSave}` mee aan `<VehicleDetails ...>`.

2. Controleer dezelfde plek in:
   - `src/pages/InventoryDelivered.tsx` (afgeleverd — hier plant men vaak de aflevering)
   - Elke andere `<VehicleDetails>`-render zonder `onAutoSave` (grep uitgevoerd: alleen B2C mist het momenteel; Delivered check ik nog even bij implementatie).

3. Verifiëren op de Mazda 3:
   - Open detail → plan afleverafspraak → `vehicles.details.deliveryAppointmentId` is gevuld in DB.
   - Refresh → knop toont de bestaande afspraak i.p.v. opnieuw plannen.
   - Toast toont geen foutmelding meer.

## Wat NIET verandert

- `DeliveryAppointmentCard.tsx`, `ChecklistTab.tsx`, `calendarService.createAppointment`, en alle DB-triggers blijven ongewijzigd. Puur een missing prop op de B2C-pagina.

## Bestanden

- `src/pages/InventoryB2C.tsx` — `handleAutoSave` toevoegen + doorgeven aan `<VehicleDetails>`.
- `src/pages/InventoryDelivered.tsx` — check en zo nodig zelfde fix.
