

# Plan: Badge datum format verbeteren

De badge toont nu "04-03-2026 20:00" wat onoverzichtelijk is. Wijzigen naar een leesbaar formaat met dag + maand op één regel en tijd op de tweede regel.

## Aanpak

### `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx`

Huidige badge tekst (regel ~208):
```
04-03-2026 20:00
```

Nieuw formaat met `date-fns` NL locale:
```
4 Maart
20:00
```

- Format wijzigen van `"dd-MM-yyyy HH:mm"` naar twee aparte regels:
  - Regel 1: `d MMMM` → "4 Maart"
  - Regel 2: `HH:mm` → "20:00"
- Beide in een `flex-col` layout binnen de badge zodat het netjes onder elkaar staat

