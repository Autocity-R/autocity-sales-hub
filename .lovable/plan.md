

## Analyse: JP Cars Monitor toont 202 rijen i.p.v. 126

### Gevonden oorzaak

De `jpcars_voorraad_monitor` tabel bevat **202 rijen** maar slechts **125 unieke voertuigen** — bijna exact de 126 die je op JP Cars ziet (verschil van 1 kan timing zijn).

Er zitten **77 dubbele records** in de tabel. Ze hebben allemaal dezelfde `synced_at` timestamp, wat betekent dat de JP Cars API dezelfde auto's teruggeeft op meerdere pagina's (overlappende paginering). De sync functie insert alles zonder te dedupliceren.

### Twee fixes nodig

#### Fix 1: Sync functie — Deduplicatie voor insert

**Bestand:** `supabase/functions/jpcars-sync/index.ts`

Na het fetchen van alle pagina's, dedupliceer de `allVehicles` array op basis van een unieke sleutel (`reference_code` als die bestaat, anders `license_plate + make + model`). Bij duplicaten: bewaar de laatste (meest complete) entry.

```text
Fetch alle pagina's → 202 resultaten
Dedupliceer op reference_code / kenteken+merk+model → ~126 unieke
Insert alleen unieke records
```

#### Fix 2: Dashboard — JP Cars data direct als bron (eerder goedgekeurd)

**Bestand:** `src/components/ai-agents/dashboards/KevinDashboard.tsx`

De Markt Monitor tab gebruikt `jpcars_voorraad_monitor` direct als databron in plaats van via CRM-join. Dit was al goedgekeurd in het vorige plan. Met de deduplicatie in de sync zal dit ~126 voertuigen tonen — exact wat JP Cars laat zien.

### Resultaat

- Sync: 202 → ~126 rijen (geen duplicaten meer)
- Dashboard: toont exact dezelfde auto's als JP Cars portal
- KPI's berekend op correcte, niet-dubbele dataset

