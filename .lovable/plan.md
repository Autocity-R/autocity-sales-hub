

# Plan: Fix afleverafspraak annuleren — datum verdwijnt niet

## Analyse: Twee root causes

### Root cause 1: Query filtert geannuleerde afspraken niet
In `InventoryB2C.tsx` (regel 91-108) haalt de `deliveryAppointments` query ALLE appointments op die matchen op ID, zonder te filteren op status. Een geannuleerde afspraak (`status = 'geannuleerd'`) komt dus nog steeds terug met een `starttime`, waardoor de badge de datum blijft tonen.

### Root cause 2: Cache invalidatie mist `b2cVehicles`
In `ChecklistTab.tsx` worden bij annuleren alleen `deliveryAppointments` en `vehicles` ge-invalideerd, maar de B2C tabel gebruikt query key `b2cVehicles`. Hierdoor bevat de vehicle data nog steeds de oude `deliveryAppointmentId`, en wordt die opnieuw meegenomen in de appointments query.

## Oplossing

### 1. `src/pages/InventoryB2C.tsx` — Filter geannuleerde afspraken
In de `deliveryAppointments` query een `.neq('status', 'geannuleerd')` filter toevoegen zodat geannuleerde afspraken nooit een datum opleveren.

```typescript
const { data } = await supabase
  .from('appointments')
  .select('id, starttime, vehicleid, status')
  .in('id', appointmentIds)
  .neq('status', 'geannuleerd');
```

### 2. `src/components/inventory/detail-tabs/ChecklistTab.tsx` — Invalideer ook `b2cVehicles`
Bij de annuleer-handler toevoegen:
```typescript
queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
```

Dit zorgt ervoor dat:
- Na annuleren de vehicle data ververst wordt (zonder `deliveryAppointmentId`)
- Zelfs als de vehicle data nog niet ververst is, de appointments query de geannuleerde afspraak uitsluit

