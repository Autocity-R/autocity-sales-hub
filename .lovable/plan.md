

## Plan: Kevin — JP Cars Voorraadmonitor (Head of Purchases)

Kevin bestaat al in de database (ID: `b4000000-0000-0000-0000-000000000004`). De `jpcars_voorraad_monitor` tabel en `JPCARS_API_TOKEN` secret zijn al aanwezig. Er moet geen migratie gedaan worden.

### Stap 1: Edge Function `jpcars-sync`
Nieuwe edge function die alle voertuigen ophaalt via de JP Cars API (`/api/cars/list` met paginering), mapt naar de `jpcars_voorraad_monitor` tabel structuur, en een volledige refresh doet (delete + insert). Inclusief CORS headers en kentekenformaat normalisatie. Registratie in `config.toml` met `verify_jwt = false`.

### Stap 2: Agent Config bijwerken
- Kevin toevoegen aan `AGENT_IDS` en `AGENTS` array in `agentConfig.ts` met ID `b4000000-0000-0000-0000-000000000004`, rol "Head of Purchases", teal kleurschema, en quick questions gericht op voorraadpositie, prijssignalen, en marktanalyse
- Kevin toevoegen aan `ROLE_AGENT_ACCESS` voor admin, owner, en manager rollen

### Stap 3: Kevin Dashboard
Nieuw bestand `KevinDashboard.tsx` met:
- **Samenvatting cards**: Totaal online, actie vereist (rood), let op (geel), goed gepositioneerd (groen), laatste sync tijd
- **Voertuigtabel** via JOIN van `vehicles` + `jpcars_voorraad_monitor` op genormaliseerd kenteken:
  - Merk/Model/Kenteken, eigen stagedagen, JP stagedagen vs marktgemiddelde, online prijs, marktwaarde, rang/concurrenten, leads, vergelijkbaar verkocht, prijsgrens alert, vorige prijs+datum, brandstof
  - Kleurcodering per categorie (rood/geel/groen) op basis van rank_current, stock_days, en price_warning
- **"Sync nu" knop** die de edge function aanroept + refetch
- **CSV download** van de volledige lijst

### Stap 4: AIAgents.tsx bijwerken
- Import `KevinDashboard` en toevoegen aan `DASHBOARD_MAP`

### Stap 5: Cron job voor automatische sync
- SQL insert via Supabase voor `cron.schedule` die `jpcars-sync` elk uur aanroept

### Bestanden

| Actie | Bestand |
|-------|---------|
| Nieuw | `supabase/functions/jpcars-sync/index.ts` |
| Nieuw | `src/components/ai-agents/dashboards/KevinDashboard.tsx` |
| Edit | `src/components/ai-agents/agentConfig.ts` |
| Edit | `src/pages/AIAgents.tsx` |
| Edit | `supabase/config.toml` |

