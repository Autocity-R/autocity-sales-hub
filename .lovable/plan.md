

# Plan: Fix badge die geen datum toont door memo-probleem

## Probleem

De `VehicleB2CTableRow` component is gewrapped in `React.memo` met een custom vergelijkingsfunctie die alleen `vehicle.id` en `selectedVehicles` checkt. Wanneer de `deliveryDate` prop later binnenkomt (na de appointments query), wordt de component **niet opnieuw gerenderd** omdat de memo-functie de `deliveryDate` en `showDeliveryDate` props negeert.

## Oplossing

Update de memo-vergelijkingsfunctie in `VehicleB2CTableRow.tsx` om ook `deliveryDate` en `showDeliveryDate` te vergelijken.

### Bestand: `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx`

Huidige memo (regel 255-261):
```typescript
export const VehicleB2CTableRow = memo(VehicleB2CTableRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.vehicle.id === nextProps.vehicle.id &&
    prevProps.selectedVehicles.length === nextProps.selectedVehicles.length &&
    prevProps.selectedVehicles.includes(prevProps.vehicle.id) === nextProps.selectedVehicles.includes(nextProps.vehicle.id)
  );
});
```

Nieuwe memo:
```typescript
export const VehicleB2CTableRow = memo(VehicleB2CTableRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.vehicle.id === nextProps.vehicle.id &&
    prevProps.selectedVehicles.length === nextProps.selectedVehicles.length &&
    prevProps.selectedVehicles.includes(prevProps.vehicle.id) === nextProps.selectedVehicles.includes(nextProps.vehicle.id) &&
    prevProps.deliveryDate === nextProps.deliveryDate &&
    prevProps.showDeliveryDate === nextProps.showDeliveryDate
  );
});
```

Eenvoudige fix: 2 regels toevoegen aan de bestaande vergelijkingsfunctie.

