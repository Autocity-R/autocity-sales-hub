

# Plan: Afleverfilter + Afleverdatum kolom (alleen zichtbaar bij filter)

## Wat wordt gebouwd

1. **Nieuw "Klaar voor levering" filter** in `InventoryB2C.tsx` — dropdown met opties: Alle / Klaar voor levering / Afspraak gepland / Nog niet klaar
2. **"Afleverdatum" kolom** in de tabel die **alleen verschijnt** wanneer het filter op "Klaar voor levering" of "Afspraak gepland" staat
3. **Standaard sortering op afleverdatum** (oplopend: eerste levering bovenaan) wanneer het filter actief is
4. **Afleverdatum wordt opgehaald** uit de `appointments` tabel via de `deliveryAppointmentId` die gekoppeld is aan de checklist-planning en Google Calendar

## Technische aanpak

### 1. `InventoryB2C.tsx`
- Nieuwe state: `deliveryFilter` (`"all"` | `"ready"` | `"scheduled"` | `"not_ready"`)
- Dropdown met Truck-icoon naast het verkopersfilter
- Filter logica in `displayVehicles`:
  - `"ready"`: checklist 100% + ingeschreven + geen `deliveryAppointmentId`
  - `"scheduled"`: heeft `deliveryAppointmentId`
  - `"not_ready"`: niet klaar (rest)
- Wanneer filter `"scheduled"` actief: sorteer op `deliveryAppointmentDate` oplopend (eerst komende levering bovenaan)
- Pass `showDeliveryDate` boolean prop door naar `VehicleB2CTable` (true wanneer filter = `"ready"` of `"scheduled"`)
- Ophalen van afleverdatums: een `useQuery` die voor alle voertuigen met `deliveryAppointmentId` de `starttime` ophaalt uit de `appointments` tabel en als map beschikbaar maakt

### 2. `VehicleB2CTable.tsx`
- Nieuwe prop: `showDeliveryDate: boolean` + `deliveryDates: Record<string, string>` (vehicleId -> datum)
- Doorsturen naar header en row components

### 3. `VehicleB2CTableHeader.tsx`
- Nieuwe prop: `showDeliveryDate: boolean`
- Conditionally tonen van sorteerbare kolom "Afleverdatum" (na Voortgang, voor Locatie)

### 4. `VehicleB2CTableRow.tsx`
- Nieuwe prop: `showDeliveryDate: boolean` + `deliveryDate?: string`
- Conditionally tonen van cel met datum geformatteerd via `date-fns` in NL formaat (bijv. "di 12 mrt 14:00")
- De datum komt uit de `appointments` tabel (bindend, gekoppeld aan Google Calendar)

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/InventoryB2C.tsx` | Filter dropdown + query appointments + sorteerlogica + props |
| `src/components/inventory/VehicleB2CTable.tsx` | Props doorsturen + colSpan conditie |
| `src/components/inventory/b2c-table/VehicleB2CTableHeader.tsx` | Conditionele "Afleverdatum" kolom |
| `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx` | Conditionele afleverdatum cel |

