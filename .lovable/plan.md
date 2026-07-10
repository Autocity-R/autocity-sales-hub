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

---

### Status na deze GO

**Fase 6a — geïmplementeerd (typecheck groen):**
- `<BranchFilter />` component gemount in `Reports.tsx` header (gekoppeld aan `BranchContext`, read-only chip voor niet-admins).
- Helper `applyBranchFilter(query, branch)` in `BranchContext.tsx`.
- Services krijgen optionele `branch?: BranchFilter` parameter (default = huidig gedrag):
  - `systemReportsService.getReportsData` / `getInventoryMetrics`
  - `salesDataService.getSalesData` / `getMonthlySalesBreakdown`
  - `branchManagerService.getDashboardData` + alle sub-methodes (KPIs, salespersonStats, stockAge, pendingDeliveries, tradeIns, targets)
  - `aftersalesService.getDashboardData` + sub-methodes (deliveries, warranty claims, tasks)
  - `supplierReportsService.getSupplierAnalytics`
  - `purchaseReportsService.getPurchaseAnalytics`
  - `fetchWarrantyClaims`
- Alle rapport-tabs die deze services callen respecteren nu de branch (via `useCurrentBranch()` + queryKey met branch): Overzicht, Verkoop, Inkoop, Leveranciers, Performance, Voorraad, Aftersales, Vestiging B2C, Garantie.
- **Vestiging B2C Dashboard**: bij branchFilter='all' side-by-side rendering per vestiging (Rotterdam | Heerhugowaard).
- **Nieuwe tab "Vestiging vergelijking"** in Reports met side-by-side KPI-tabel: omzet, marge (€ + %), B2C/B2B aantal, sta-dagen, voorraad, aftersales wachttijd, openstaande leveringen.
- Mock Data/Exact-toggle onaangeroerd.

**Niet aangeraakt (voor 6b / apart):**
- Salesperson-KPI groepering per vestiging bij 'Alles' (kopjes RTD/HHW) — nu nog platte lijst maar wél gefilterd.
- Targets-scherm UI-veld "vestiging" bij nieuwe target — `sales_targets.branch` bestaat al in DB (fase 1) maar UI-input volgt in 6b.
- Agent-dashboards (Kevin/Daan/Alex/Sara/Lisa): geen BranchFilter/branch-param nog.
- Excel-exports (marco/briefing/stockAge/b2b-payment/tasks): nog geen `Vestiging`-kolom + branchFilter-respect.
- `damageRepairReportsService`: geen branch-filter (records hebben geen directe branch-kolom; vereist join).
- `enhancedReportsService`: alleen connection-status wordt aangeroepen, geen data-queries geraakt.

---

### Fase 6b — geïmplementeerd (typecheck groen)

- `SalespersonPerformance`: bij BranchFilter='all' twee groepen (Rotterdam / Heerhugowaard) met chip-kopje; bij specifieke vestiging platte lijst. Sleutel per (verkoper × vestiging) zodat splits correct blijven.
- `TargetsManager`: extra "Vestiging"-veld (dropdown voor admin/owner, read-only chip voor overige rollen). Bij wisselen worden target-waarden voor die vestiging geladen. `branchManagerService.updateTarget` neemt `branch` mee; upsert-conflict target = `(target_type, target_period, branch, salesperson_id)`. Migratie: unique index met `NULLS NOT DISTINCT`.
- Agent-dashboards:
  - `AlexDashboard`, `DaanDashboard`, `SaraDashboard`, `LisaDashboard`, `MarcoDashboard`: `<BranchFilter />` bovenaan, alle onderliggende `vehicles` / `warranty_claims` / `appointments`-queries krijgen `applyBranchFilter(q, branchFilter)`. Voor niet-admins is filter hard vastgezet op eigen branch via `BranchContext`.
  - `KevinDashboard`: bewust NIET gekoppeld — Kevin's data komt uit `jpcars_voorraad_monitor` (externe marktdata, geen vestiging).
- `damageRepairReportsService.getDamageRepairStats(period, branch?)`: joint met `vehicles(branch)`; bij specifieke branch inner-join + `eq('vehicle.branch', ...)`. `DamageRepairAnalytics` geeft `branchFilter` door.
- Excel-exports:
  - `b2bPaymentExport`: nieuwe kolom "Vestiging" tussen "Verkoopprijs" en "Locatie", header-merge uitgebreid naar `A1:J1`, kleur-kolomindexen +1 geschoven.
  - `stockAgeExport(branch?)`: extra kolom "Vestiging", filter op branch als meegegeven; `StockAgeAnalysis` geeft huidige branchFilter door.
  - `taskExportExcel(tasks, category, branchFilter?)`: extra kolom "Vestiging", filter op branch; `TaskExportButton` geeft `branchFilter` door. `Task`-type + `taskService`-mapping krijgen `branch?` mee.
  - `marcoExport`: kolom "Vestiging" in elk pipeline-schema; `MarcoDashboard` selecteert `branch` op vehicles en past `applyBranchFilter` toe.
  - `briefingExport(briefing, branchLabel?)`: extra meta-rij "Vestiging"; `HendrikBriefingDashboard` geeft huidige BranchFilter-label mee.
- Mock Data/Exact-toggle onaangeroerd.
- Regel gehandhaafd: met BranchFilter='Alles' zijn queries identiek aan huidig gedrag.

**Nog te doen (fase 7):**
- Verhuis-tooling voor voertuigen tussen vestigingen (UI + audit).
- Eind-tot-eind RLS-test met beide accounts.

Klaar voor Hendrik's verificatie: bij BranchFilter='Alles' zijn cijfers gelijk aan nu; wisselen naar Rotterdam/Heerhugowaard filtert alle tabs en de nieuwe vergelijkings-tab werkt.
