
## Fix: Geannuleerde verkopen tellen mee in rapportages

### Het probleem
Wanneer een auto van `verkocht_b2c` terug naar `voorraad` wordt gezet (geannuleerde verkoop), wordt de `sold_date` NIET gewist. Er zijn momenteel **13+ voertuigen** in de database met `sold_date` ingevuld maar status `voorraad` — dit zijn geannuleerde verkopen.

De **Verkoper Performance** (SalespersonPerformance.tsx) filtert op `sold_date IS NOT NULL` in plaats van op status, waardoor geannuleerde verkopen zoals de Kia Niro van Daan (1 april) nog meetellen in omzet, marge en rankings.

### De fix — twee lagen

**1. Oorzaak oplossen: `sold_date` wissen bij status-terugzetting**

In `src/services/supabaseInventoryService.ts`, bij beide functies die status wijzigen (`updateVehicle` en `updateVehicleStatus`):
- Wanneer status verandert naar `voorraad` (of een niet-verkocht status) EN de huidige status WAS `verkocht_b2b`/`verkocht_b2c`/`afgeleverd` → zet `sold_date` op `null`
- Wis ook gerelateerde verkoopdata: `selling_price` behouden (kan opnieuw verkocht worden), maar `sold_by_user_id` en verkoop-gerelateerde details wissen

**2. Query fixen: SalespersonPerformance ook op status filteren**

In `src/components/reports/SalespersonPerformance.tsx` (regel 76-85):
- Voeg `.in('status', ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'])` toe aan de query
- Dit is een directe fix zodat zelfs als `sold_date` niet gewist is, geannuleerde verkopen niet meetellen

**3. Bestaande data opschonen**

- SQL update om `sold_date` te wissen voor alle voertuigen met status `voorraad` die nog een `sold_date` hebben (13 records)

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/services/supabaseInventoryService.ts` | `sold_date = null` bij terugzetting naar voorraad (in `updateVehicle` ~regel 260 en `updateVehicleStatus` ~regel 450) |
| `src/components/reports/SalespersonPerformance.tsx` | Status filter toevoegen aan query (regel 82) |
| Database migration | `UPDATE vehicles SET sold_date = NULL WHERE status = 'voorraad' AND sold_date IS NOT NULL` |

### Resultaat
- Daan's Kia Niro verdwijnt direct uit performance rapportages
- Toekomstige geannuleerde verkopen worden automatisch gecorrigeerd
- Alle rapportages (Sales, Performance, Supplier) tonen alleen echte verkopen
