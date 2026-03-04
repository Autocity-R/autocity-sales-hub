

# Plan: Afleverafspraak annuleren — cache invalidatie en appointment status update

## Probleem

Wanneer je op "Annuleren / Opnieuw plannen" klikt in de ChecklistTab:
1. De `deliveryAppointmentId` wordt verwijderd uit de vehicle details (goed)
2. Maar de **afspraak zelf** wordt niet op "geannuleerd" gezet in de `appointments` tabel
3. De React Query cache (`deliveryAppointments`) wordt niet ge-invalideerd, waardoor de badge en afleverdatum kolom **niet bijwerken**

## Oplossing

### `src/components/inventory/detail-tabs/ChecklistTab.tsx`

In de "Annuleren / Opnieuw plannen" onClick handler (regel 271-277):

1. **Appointment status updaten** naar `geannuleerd` in de `appointments` tabel via Supabase
2. **React Query cache invalideren** voor `deliveryAppointments` en `vehicles` zodat de B2C tabel direct bijwerkt
3. Bestaande logica behouden (verwijderen `deliveryAppointmentId` + `onUpdate`/`onAutoSave`)

Wijzigingen:
- Import `useQueryClient` van `@tanstack/react-query` (al geïmporteerd: `useQuery`)
- Import `supabase` (al geïmporteerd)
- Maak de onClick handler `async` en voeg toe:
  ```typescript
  // 1. Cancel appointment in DB
  if (vehicle.details?.deliveryAppointmentId) {
    await supabase
      .from('appointments')
      .update({ status: 'geannuleerd' })
      .eq('id', vehicle.details.deliveryAppointmentId);
  }
  // 2. Invalidate cache
  queryClient.invalidateQueries({ queryKey: ['deliveryAppointments'] });
  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  ```

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/detail-tabs/ChecklistTab.tsx` | Appointment annuleren in DB + cache invalidatie bij klik op "Annuleren / Opnieuw plannen" |

