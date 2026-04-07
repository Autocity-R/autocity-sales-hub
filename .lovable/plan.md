

## Daan Dashboard — Team Performance Aanpassen

### Drie aanpassingen:

### 1. Mario Kroon toevoegen aan teamMappings
Mario heeft 6 verkopen deze maand (BMW IX1, Renault Arkana, 2x Polestar, BMW X3, Hyundai Ioniq 5) maar staat niet in de mapping. Toevoegen:
```
Mario: ["mario", "mario kroon", "mario@auto-city.nl"]
```

### 2. Marge verwijderen uit de team performance tabel
- Verwijder de `Ø marge` kolom uit de weergave
- Verwijder `avgMargin` en `totalMargin` berekeningen (of laat ze intern voor eventueel later gebruik)
- Behoud: Naam, B2C/B2B counts, Omzet, Norm badge

### 3. Klikbare namen met verkochte auto's detail dialog
- Hergebruik het bestaande `SalespersonDetailDialog` component (al aanwezig in `src/components/reports/`)
- Bij klik op een naam: toon dialog met lijst verkochte auto's (merk, model, verkoopprijs, datum)
- De vehicle data is al beschikbaar in de query — sla per verkoper ook de individuele auto's op

### Bestand

| Bestand | Actie |
|---------|-------|
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | Mario toevoegen, marge weghalen, klikbare namen met detail dialog |

