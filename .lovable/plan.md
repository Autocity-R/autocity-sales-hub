## Fase 6 — Rapportages & KPI's per vestiging

De scope is groot (11 tabs, ~10 services, 5 agent-dashboards, exports, nieuwe vergelijkingsview). Om te voorkomen dat er iets stilletjes stukgaat splits ik uit in **6a** en **6b**, met dezelfde afspraak: bij BranchFilter='Alles' zijn alle cijfers exact gelijk aan nu.

---

### Fase 6a — Fundering + kern-rapportages (deze GO)

**1. Herbruikbare `<BranchFilter />`**
- Nieuw component `src/components/reports/BranchFilter.tsx` — segmentknoppen "Alles · Rotterdam · Heerhugowaard".
- Hergebruikt `BranchContext` uit fase 3, zodat de header-switcher en de rapportage-filter *één en dezelfde keuze* zijn (consistent per sessie).
- Voor niet-admins: hard vastgezet op eigen branch, geen keuze zichtbaar (chip).
- Bovenaan gemount op `Reports.tsx` (geldt voor alle tabs daarbinnen).

**2. Services krijgen optionele `branch?: BranchFilter` parameter**
- `systemReportsService.getReportsData / getInventoryMetrics`
- `salesDataService` (weekly_sales queries + vehicles queries)
- `branchManagerService.getDashboardData`
- `warrantyService` (reports-queries)
- `aftersalesService`
- `supplierReportsService`, `purchaseReportsService`, `damageRepairReportsService`, `enhancedReportsService`
- Implementatie: als `branch !== 'all'` → `.eq('branch', branch)` op vehicles / warranty_claims / weekly_sales / appointments. Bij `'all'` of `undefined`: query ongewijzigd → identiek gedrag aan nu.

**3. Salesperson-KPI-overzicht (bij 'Alles' gegroepeerd per vestiging)**
- `SalespersonPerformance` en `TeamPerformanceTable`: bij branch='all' twee groepen met kopjes Rotterdam / Heerhugowaard. Bij specifieke branch: platte lijst zoals nu.
- Targets-scherm (`TargetsManager`): bestaande sales_targets heeft al `branch`-kolom (fase 1); UI-veld toevoegen voor branch-keuze bij nieuwe target.

**4. "Vestiging B2C Dashboard" per vestiging**
- `BranchManagerDashboard` respecteert branchFilter:
  - branch='rotterdam'/'heerhugowaard' → dashboard voor die vestiging.
  - branch='all' → 2 kolommen naast elkaar (Rotterdam | Heerhugowaard) met dezelfde KPI-blokken.

**5. Nieuwe tab "Vestiging vergelijking"**
- Nieuwe tab in `Reports.tsx` — side-by-side kolommen Rotterdam vs Heerhugowaard:
  - Omzet, marge, aantal verkocht B2C, aantal verkocht B2B, gem. stadagen, aftersales-doorlooptijd, openstaande leveringen.
- Nieuw component `src/components/reports/BranchComparison.tsx`; hergebruikt de service-calls met branch-param.

**Stop-check na 6a**: Hendrik test kern-rapportages + vergelijkings-tab. Als groen → 6b.

---

### Fase 6b — Agents & exports (aparte GO)

- Agent-dashboards (Kevin/Daan/Alex/Sara/Lisa) waar cijfers getoond worden: `<BranchFilter />` boven het dashboard, service-calls krijgen de branch mee.
- Excel-exports (marco/briefing/stockAge/b2b-payment/tasks) krijgen `Vestiging`-kolom + respecteren actieve BranchFilter.
- Alex/Kevin/Daan strategische views: bij 'Alles' kruistabel of extra kolom per vestiging waar zinvol; anders gedrag ongewijzigd.

---

### Wat NIET wijzigt (harde afspraken)

- Mock Data/Exact-toggle: onaangeroerd.
- `vehicles.location`: blijft nergens geschreven/getoond, blijft in DB voor rollback.
- Bij branch='all' of niet-meegegeven branch: **query identiek** aan huidige situatie → cijfers gegarandeerd hetzelfde.
- Puur additief; geen bestaande signatures breken (parameter is optioneel, default = huidige gedrag).

### Technisch

- Type: `BranchFilter = 'all' | 'rotterdam' | 'heerhugowaard'` — bestaat al in `BranchContext.tsx`.
- Helper `applyBranchFilter(query, branch)`: `if (branch && branch !== 'all') return query.eq('branch', branch); return query;`
- Comparison view fetcht 2× parallel (Rotterdam + Heerhugowaard) via `Promise.all` en toont side-by-side.
- Typecheck moet groen blijven; bestaande callers zonder branch-param blijven werken.

### Bevestig graag

- Akkoord met splitsing **6a nu, 6b in aparte GO**? Of moet alles in één klap?
- Voor "Vestiging vergelijking": nieuwe tab in Reports (voorstel), of eigen menu-item in de sidebar?
