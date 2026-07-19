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

---

# Koopcontract 2.0 — Plan

Doel: één bedrijfsbrede manier van koopcontracten maken, geënt op de professionelere flow uit het LMS (Autocity Lead Hub). De huidige contract-generator in dit CRM wordt vervangen door een nieuwe flow met een strak document, directe garantie-koppeling en digitale ondertekening via een publieke tekenlink. Bestaande contracten blijven onaangetast.

## Wat NIET verandert (harde afspraken)

- Reeds gegenereerde contracten in de `contracts`-tabel + bijbehorende bestanden in `vehicle_files` blijven exact zoals ze zijn (inzien, downloaden, printen blijft werken).
- De multivestiging-logica (fases 1–7) wordt niet aangeraakt: de nieuwe flow hergebruikt `branches` als bron van waarheid voor de entiteits-header (Rotterdam = Autocity Automotive Group B.V., Heerhugowaard = Autocity Noord Holland B.V.).
- RLS-scoping per branch (multivestiging fase 2) blijft leidend.
- Bestaande e-mail-, taken- en aftersales-flows worden niet gewijzigd.
- Contra-koppeling naar het LMS zit **niet** in dit plan (aparte fase 6, later).

## Fase-opzet

Na elke fase stopt de implementatie voor test door Hendrik. Elke fase is puur additief: de oude generator blijft werken tot fase 5 de nieuwe flow als default zet.

### Fase 1 — Datamodel & entiteits-header (backend-only)

- Nieuwe tabel `contract_documents`:
  - `id`, `contract_number` (uniek, formaat `AC-{BRANCH}-{YYYY}-{seq}` per branch per jaar), `vehicle_id`, `customer_id`, `branch`, `status` (`concept` | `verstuurd` | `getekend` | `geannuleerd`), `contract_type` (`b2b` | `b2c`), `created_by`, `created_at`, `updated_at`.
  - Snapshot-velden zodat het document reproduceerbaar blijft ook als de auto later wijzigt: `vehicle_snapshot` (jsonb: merk, model, uitvoering, kenteken, VIN, km, kleur, bouwjaar), `customer_snapshot` (jsonb), `company_snapshot` (jsonb: header uit `branches` op moment van opmaak).
  - Prijzen: `sale_price_ex`, `btw_type` (`marge` | `btw`), `warranty_package`, `warranty_price`, `trade_in_vehicle` (jsonb), `trade_in_value`, `special_terms` (text), `total_price`.
- Nieuwe tabel `contract_signatures`: `contract_id` (FK), `token` (uniek, 32 bytes hex), `token_expires_at`, `signed_at`, `signer_name`, `signer_email`, `signer_ip`, `signature_data` (base64 PNG), `pdf_path` (storage-key in `vehicle-documents`).
- Sequence + trigger voor `contract_number` per branch per jaar.
- RLS: verkoper/admin van dezelfde branch mag SELECT/INSERT/UPDATE; `service_role` voor edge functions; **anon SELECT uitsluitend via de RPC `get_contract_by_token(token)`** (security definer) — geen directe anon-reads op de tabellen.
- GRANTs volgens huisregel (authenticated + service_role, geen anon op de tabellen zelf).

**Risico's**: sequence-collision bij gelijktijdig aanmaken → DB-sequence + retry. Snapshots vergroten rijomvang; jsonb is prima.

**Test na fase 1**: Hendrik verifieert via een dummy-record dat contractnummer klopt en RLS zowel branch-scoping als token-RPC correct afdwingt.

### Fase 2 — Contract-opstellen UI (concept-status, nog geen versturen)

- Nieuwe route `/contracten/nieuw?vehicleId=…` + dialog-variant vanuit voertuig-detail en Verkocht B2C.
- Formulier in LMS-stijl: klant kiezen/aanmaken (hergebruik `SearchableCustomerSelector`), voertuig-blok (readonly uit vehicle), kale verkoopprijs, BTW/marge-radio, garantiepakket-dropdown (hergebruik `warrantyPackageService` + prijs), inruilvoertuig-blok optioneel, speciale afspraken (rich text), totaal live berekend.
- **Directe garantie-registratie**: bij opslaan van concept worden de bestaande `warrantyPackage`-velden op `vehicles` (het groene blokje) meteen bijgewerkt (`warrantyPackage`, `warrantyPackagePrice`, `warrantyPackageSetAt`, `warrantyPackageSetBy`). Wijzigen op het concept overschrijft ook direct op het voertuig. Dubbele invoer verdwijnt. Als er al een ander pakket op de auto staat: bevestigingsdialoog vóór overschrijven.
- Preview-paneel rechts toont het gerenderde document (zelfde template als de uiteindelijke PDF).
- Opslaan → status `concept`, snapshots gevuld, entiteits-header uit `branches` via `vehicle.branch`.

**Risico's**: garantie per ongeluk overschrijven — gemitigeerd met bevestiging.

**Test na fase 2**: Hendrik maakt 2 concepten (RTD + HHW), controleert header, totaal, en dat het groene blokje op de auto meebeweegt.

### Fase 3 — Documenttemplate & PDF-render

- Nieuw HTML/CSS-template `contractDocumentV2` in de stijl van het LMS: strakke sans-serif, entiteits-header links + logo rechts, contractnummer + datum rechts, secties: Partijen, Voertuig, Financieel (kale prijs, BTW/marge, garantie, inruil, totaal), Speciale afspraken, Handtekeningblok (leeg in concept-preview).
- PDF-generatie via bestaande `contractPdfService.generatePdfFromHtml`.
- Preview- en download-knop op het concept.
- Template haalt uitsluitend uit `contract_documents.*_snapshot` → document reproduceerbaar ook na wijzigingen aan auto/klant/branch.

**Risico's**: pagebreaks in html2pdf → `avoid`-classes per sectie en testen met lange afspraken.

**Test na fase 3**: Hendrik downloadt PDF van een concept en vergelijkt met het door hem aangeleverde LMS-voorbeeld.

### Fase 4 — Digitaal tekenen via publieke link

- "Versturen"-knop op concept → status `verstuurd`, nieuwe rij in `contract_signatures` met random `token` (32 bytes hex) en `token_expires_at` (voorstel: 14 dagen).
- E-mail naar klant via bestaande email-queue met link `/teken/{token}` (geen inlog).
- Nieuwe publieke route `/teken/{token}`:
  - Fetch via RPC `get_contract_by_token(token)` (security definer, valideert expiry + status). Geen directe tabel-reads voor anon.
  - Rendert het document readonly + handtekening-canvas (touch + muis, via `react-signature-canvas`), verplicht `signer_name` + `signer_email` (voorgevuld uit klantgegevens).
  - Submit → edge function `contract-sign`:
    - Verifieert token + status `verstuurd`.
    - Slaat handtekening, `signed_at`, `signer_ip`, `signer_name`, `signer_email` op.
    - Rendert definitieve PDF (handtekening ingebed), uploadt naar `vehicle-documents` bucket, path in `pdf_path`.
    - Registreert het bestand in `vehicle_files` bij de auto (bestaande flow).
    - Zet `contract_documents.status = 'getekend'`.
    - Mailt beide partijen (klant + verkoper via `profiles.email` van `created_by`) met de getekende PDF als bijlage.
- Verkoper ziet in contract-detail live status: `concept` → `verstuurd` (met tijdstip, kopieerbare link, "opnieuw versturen") → `getekend` (met signer-info, tijdstip, IP).
- "Annuleren" op `verstuurd` invalideert token (`token_expires_at = now()`, status `geannuleerd`).

**Risico's**:
- Token-lek in e-mail → expiry + eenmalig gebruik (na `getekend` weigert de RPC).
- Handtekening op mobiel → touch-events expliciet getest.
- E-mail-delivery: hergebruik bestaande queue, geen nieuwe SMTP.
- IP-logging AVG: alleen serverside via edge function, gedocumenteerd in privacy-doc.

**Test na fase 4**: Hendrik stuurt een contract naar zijn eigen mail, tekent op telefoon, verifieert dat de PDF in `vehicle_files` bij de auto staat en beide partijen de mail met bijlage krijgen.

### Fase 5 — Cutover: nieuwe flow wordt de standaard

- Entrypoints "Contract opstellen" in Verkocht B2C-lijst en voertuig-detail wijzen naar de nieuwe flow.
- De oude generator (`contractService.generateContract` + UI) blijft technisch aanwezig zodat oude contracten inzichtbaar blijven, maar is niet meer bereikbaar als "nieuw contract" pad.
- Nieuwe tab "Koopcontracten 2.0" in het contract-menu, filters op status + branch (respecteert `BranchFilter`); oude tab blijft ernaast voor historie.
- Korte help-notitie in Settings > Help.

**Risico's**: verkopers zoeken de oude knop → knop-tekst en plaats blijven identiek, alleen het target-scherm verandert.

**Test na fase 5**: Hendrik + één verkoper doorlopen end-to-end op een echte verkoop (concept → tekenen → aflevering).

### Fase 6 — LATER (out of scope nu): LMS contra-koppeling

Zodra een CRM-contract status `getekend` krijgt, stuurt een edge function een webhook naar het LMS (Autocity Lead Hub) met VIN + kenteken + PDF-URL, zodat de bijbehorende auto in het LMS als "verkocht via CRM" wordt geregistreerd. Vereist afstemming met LMS-team over endpoint + shared secret. Eigen mini-plan als het zover is.

## Technische bevestigingen

- Hergebruik: `warrantyPackageService`, `SearchableCustomerSelector`, `contractPdfService.generatePdfFromHtml`, `vehicle-documents` storage-bucket, email-queue, `BranchContext`, `branches`-tabel.
- Nieuw pakket: `react-signature-canvas` (~15KB) voor het handtekening-canvas.
- Alle nieuwe DB-toegang via RLS + security-definer RPC voor de publieke tekenlink; geen anon-select op tabellen.
- Typecheck moet groen blijven per fase.

## Openstaand voor bevestiging vóór fase 1

1. Contractnummer-formaat: voorstel `AC-RTD-2026-0001` / `AC-HHW-2026-0001` (per branch per jaar). Akkoord?
2. Token-geldigheid: voorstel 14 dagen. Akkoord, of langer/korter?
3. Garantie-overschrijving: zonder bevestiging als het voertuig nog geen pakket heeft, mét bevestigingsdialoog als er al een ander pakket staat. Akkoord?

## Beslissingen Hendrik (definitief)

1. Contractnummer-formaat `AC-RTD-2026-0001` / `AC-HHW-2026-0001`: **akkoord**.
2. Token-geldigheid: **48 uur**. Na verloop kan de verkoper opnieuw versturen (nieuwe token, oude wordt geïnvalideerd).
3. Garantiepakket: **één pakket per voertuig, harde beveiliging — geen overschrijf-dialoog**. Als het voertuig al een pakket heeft, toont het contract-formulier dat pakket read-only ("Pakket al geregistreerd: {naam} — €{prijs}") zonder keuze of registratie-optie. Server-side afgedwongen: opslag-flow weigert een warranty-registratie via het contract als er al een pakket op het voertuig staat. Corrigeren/verwijderen blijft uitsluitend via de bestaande flow op het voertuig-detail zelf.

Fase 1 wordt uitgevoerd met deze parameters (token-expiry `now() + interval '48 hours'`, nummer-sequence per branch per jaar, geen aanpassing aan bestaande warranty-flow).
