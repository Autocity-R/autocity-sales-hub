

## Team Performance in Daan Dashboard — Live Data uit Vehicles

### Probleem
Het Daan Dashboard haalt team performance nu uit `weekly_sales`, maar die tabel is leeg/onbetrouwbaar. De rapportages (CEO dashboard) gebruiken al een werkende aanpak: direct queryen op `vehicles` tabel met status `verkocht_b2b`, `verkocht_b2c`, `afgeleverd`.

### Oplossing
De `getTeamPerformance()` functie uit `src/services/ceoDataService.ts` bevat exact de logica die we nodig hebben. We hergebruiken dit patroon in het Daan Dashboard.

### Aanpassing: `DaanDashboard.tsx`

De team performance query (regels 84-112) wordt vervangen:

**Oud**: Query `weekly_sales` tabel → leeg resultaat
**Nieuw**: Query `vehicles` tabel direct, met dezelfde logica als `ceoDataService.ts`:
- Filter op `status IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd')`
- Filter op `sold_date` binnen huidige maand (ipv `week_start_date`)
- Match verkoper via `details.salespersonName` / `details.verkoper`
- Tel B2B vs B2C correct (check `salesType` voor afgeleverde auto's)
- Bereken marge per verkoper (selling_price - purchase_price)

Extra kolommen in de team tabel:
- Omzet (totale selling_price)
- Gemiddelde marge
- B2C vs norm (10) badge blijft

### Bestand

| Bestand | Actie |
|---------|-------|
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | Edit — team performance query + tabel uitbreiden |

Geen nieuwe bestanden, geen migraties. Puur frontend aanpassing die dezelfde bewezen data-logica hergebruikt.

