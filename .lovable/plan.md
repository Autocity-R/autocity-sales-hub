

# Plan: Verkoper-filter toevoegen aan B2C en B2B verkocht pagina's

## Wat wordt gebouwd

Een dropdown menu naast de zoekbalk op zowel de **Verkocht B2C** (`InventoryB2C.tsx`) als **Verkocht B2B** (`InventoryB2B.tsx`) pagina's waarmee je kunt filteren op verkoper. De dropdown toont alle verkopers die aan voertuigen gekoppeld staan (bijv. Hendrik, Martijn, Daan), plus een "Alle verkopers" optie om het filter te resetten.

## Technische aanpak

### 1. Beide pagina's: `salespersonFilter` state toevoegen
- Nieuwe state `salespersonFilter` (standaard: `""` = alle)
- Lijst van unieke verkopers extraheren uit de voertuigendata via `useMemo`

### 2. Dropdown component toevoegen
- Een `Select` dropdown naast de zoekbalk met:
  - "Alle verkopers" (standaard)
  - Lijst van unieke `salespersonName` waarden uit de voertuigen
- Gebruikt het bestaande `@radix-ui/react-select` component

### 3. Filter logica toepassen
- **B2C** (`InventoryB2C.tsx`): Filter de `vehicles` array op `salespersonName` voordat deze naar `VehicleB2CTable` gaat
- **B2B** (`InventoryB2B.tsx`): Filter de `filteredVehicles` array op `salespersonName` voordat deze naar `B2BInventoryContent` gaat

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/InventoryB2C.tsx` | State + dropdown + filter logica |
| `src/pages/InventoryB2B.tsx` | State + dropdown + filter logica |

Geen database-wijzigingen nodig -- `salespersonName` staat al op elk voertuig.

