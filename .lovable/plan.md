# Plan: 2-Vestigingen CRM (Rotterdam + Heerhugowaard) — AKKOORD

## Uitgangspunten
- `branch` = `rotterdam` | `heerhugowaard`. Géén `afgeleverd` als branch.
- `vehicles.location` blijft in DB (rollback) maar wordt niet meer geschreven/getoond.
- B2B "uitgeleverd" = losse vlag (`b2b_delivered` + datum + door wie) op voertuig. Auto blijft in Verkocht B2B tot betaling binnen is; badge "Uitgeleverd".
- Afgeleverd-menu toont branch-kolom (Rotterdam/Heerhugowaard).
- Aparte entiteit + koopcontract per vestiging (Rotterdam huidige entiteit; Heerhugowaard = Autocity Noord Holland B.V.). Entiteitsgegevens leven UITSLUITEND in `branches`-tabel; geen apart contract-instellingen-scherm. Contract-generator leest uit `branches`.
- Google Calendar: Rotterdam behoudt verkoop@auto-city.nl + huidige kalender. Heerhugowaard krijgt later apart account.
- Toegang: voorraad/status-menu's zichtbaar voor iedereen met branch-switch; Verkocht B2C / Aftersales / Garantie / Aflever-planning / Verkoper-KPI's strikt gescheiden voor niet-admins.
- Rapportages: overal branch-filter (Alles/Rotterdam/HHW) met totalen. Aftersales-rapportages hard gefilterd voor niet-admins.

## Fase 1 — Datamodel & migratie (START NU)
- Tabel `branches` + seed:
  - Rotterdam: huidige entiteit, google_calendar_id='primary', google_auth_email='verkoop@auto-city.nl'.
  - Heerhugowaard: code=heerhugowaard, name=Heerhugowaard, company='Autocity Noord Holland B.V.', Pascalstraat 25, 1704 RE Heerhugowaard, tel 072-3036623; kvk/btw/iban/calendar leeg.
- Kolom `branch` toevoegen + backfill 'rotterdam' op: vehicles, profiles, appointments, warranty_claims, tasks (uit vehicle waar mogelijk), weekly_sales, sales_targets, leads, contracts, company_calendar_settings.
- vehicles: `b2b_delivered` bool default false, `b2b_delivered_at`, `b2b_delivered_by`.
- `vehicle_status_audit_log`: `old_branch`/`new_branch` kolommen + trigger.
- UI: "Locatie auto" dropdown vervangen door "Vestiging" (Rotterdam/Heerhugowaard). `vehicles.location` blijft in DB.
- Additief: geen bestaande data verwijderen.

## Fase 2 — RLS + verhuis-trigger
- Hard branch-filter RLS op weekly_sales, sales_targets, warranty_claims, appointments (aflever), verkocht-B2C, aftersales-taken. Admin/owner ziet alles.
- **Verhuis-trigger**: bij UPDATE van `vehicles.branch` propageert de nieuwe branch naar OPEN taken (status ≠ voltooid/geannuleerd) en TOEKOMSTIGE afspraken (start_time > now()) van dat voertuig. Afgeronde taken en verleden afspraken ongemoeid.

## Fase 3 — Frontend basis
- `BranchContext` + `useCurrentBranch()` + `<BranchSwitcher />` in header.
- Voertuig-detail: dropdown "Vestiging" + (bij Verkocht B2B) checkbox "Uitgeleverd aan klant" met datum-log.
- Voorraad-tabellen: branch-kolom + filter-chip.
- Verkocht B2B: badge "Uitgeleverd" + filter.
- Verkocht B2C / Aftersales / Garantie / Aflever-agenda: hard filter voor niet-admins.
- Afgeleverd-menu: branch-kolom + filter.

## Fase 4 — Contracten met aparte entiteit
- Contract-generator (`contractService` / `contractPdfService`) leest entiteits-header uit `branches` op basis van `vehicle.branch`.
- Geen apart instellingen-scherm. Heerhugowaard KvK/BTW/IBAN wordt later direct in `branches`-data ingevuld zodra B.V. is opgericht.

## Fase 5 — Google Calendar per vestiging
- `company_calendar_settings` per branch.
- Calendar-service kiest calendar-ID op basis van `appointment.branch`.
- Instellingen-scherm: kaart per vestiging (HHW "nog niet geconfigureerd").

## Fase 6 — Rapportages
- `<BranchFilter />` (Alles/Rotterdam/HHW) op alle rapportages + agent-dashboards. Niet-admins in aftersales-rapportages hard gefilterd op eigen branch.
- Nieuwe view "Rotterdam vs Heerhugowaard" side-by-side.
- Excel-exports krijgen branch-kolom.
- Mock Data / Exact-toggle in Rapportages blijft staan (niet aanpassen).

## Fase 7 — Verhuizing & test
- Admin-tool bulk verplaatsen naar HHW.
- Test met dummy-verkoper HHW.

---

**Fase 1 loopt nu. Na fase 1 stop voor test door Hendrik.**
