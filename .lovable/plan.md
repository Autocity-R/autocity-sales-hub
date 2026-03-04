

# Plan: Afleverdatum tonen in de badge

De "Afspraak gepland" badge in de voortgangskolom vervangen door de daadwerkelijke datum en tijd van de aflevering (bijv. "04-03-2026 13:00"), zodat aftersales in één oogopslag ziet wanneer de auto eruit gaat.

## Aanpak

### `VehicleB2CTableRow.tsx`
- De `deliveryDate` prop is al beschikbaar in de component
- In de badge waar nu "Afspraak gepland" staat (regel 208-211): vervang de tekst door de geformatteerde datum
- Format: `dd-MM-yyyy HH:mm` (bijv. "04-03-2026 13:00")
- Fallback naar "Afspraak gepland" als er geen datum beschikbaar is
- Het `CalendarCheck` icoon blijft behouden

Voorbeeld resultaat in de badge:
```
📅 04-03-2026 13:00
```

### Bestand

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/b2c-table/VehicleB2CTableRow.tsx` | Badge tekst wijzigen van "Afspraak gepland" naar geformatteerde datum |

