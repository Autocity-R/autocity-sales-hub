# Bouwstap 12 — resultaat

Niet gepubliceerd. Alleen frontend/pure berekeningen aangepast. Geen RLS, databasefuncties, cron, facturen, echte klant-/voertuiggegevens of mails gewijzigd. Website-reserveringsplan ongemoeid gelaten.

## A. Alle klanten

DirectieSidebar heeft een eigen KLANTEN-blok met Alle klanten (/customers). Bekijken, zoeken en detail blijven beschikbaar, onafhankelijk van de algemene isDirectieReadOnly-vlag. De bestaande klanteditor staat voor operationeel_directeur en aftersales_manager alleen bij B2B/B2C aan. Geen verwijderknop aanwezig; directeur ziet geen aanmaakknop. Bestaande SELECT/UPDATE/DELETE-policies alleen gelezen, niet aangepast.

Rol- en klanttype-unit-tests slagen. De gevraagde ingelogde OD-test (pagina openen, zoeken, detail openen) is **niet geverifieerd**: externe/onbeheerde Supabase biedt geen beheerde testsessie. Playwright bevestigt dat /customers en alle vier gevraagde financiële pagina's naar /auth gaan. Geen tijdelijk account aangemaakt, geen echte klant geopend of opgeslagen; dus geen testdata om op te ruimen.

## B. Live poetsomzet

De gedeelde alleen-lezen projectie telt factuurregels plus niet-gefactureerde interne poetsbeurten. Open beurten worden per uitvoerder aan €82,64 toegerekend en vallen weg zodra hun ID op een poets_intern-factuur staat. Zonder uitvoerder of bestaand profiel geen omzet. Werkdatum = finished_at, anders approved_at; NL-kalenderdag. De poetsquery is op werkdatum gepagineerd, zonder aanmaakdatumgrens. Rapportages, cockpit, trends en aansluiting gebruiken dezelfde projectie. Facturen houdt gefactureerd als hoofdgetal, toont open eronder en heeft een apart Poets-tabblad. generate_poets_monthly_invoice en cron blijven ongewijzigd.

| Maand | Interne beurten | Gefactureerd | Open | Live poetsomzet | SQL-verwachting | Totaalomzet incl. live poets |
|---|---:|---:|---:|---:|---:|---:|
| September 2026 | 67 | €5.536,88 | €0,00 | €5.536,88 | gelijk | €33.943,09 |
| Oktober 2026 | 100 | €8.264,00 | €0,00 | €8.264,00 | gelijk, AR-2026-0243 | €53.033,58 |
| November 2026, controle 4 november | 10 | €0,00 | €826,40 | €826,40 | gelijk | €5.926,40 |

Augustus: één afgeronde beurt zonder uitvoerder, €0 omzet; blijft in controlelijst.

**Scherm versus verwacht:** bovenstaande cijfers zijn bevestigd met alleen-lezen SQL en tests van de echte schermberekeningen (Omzet, Poetsen, cockpit, medewerker-KPI en Performance-aansluiting). Het zijn geen afgelezen ingelogde schermcijfers; die controle blijft open vanwege de ontbrekende testsessie. De facturentegel voor november hoort €0,00 plus €826,40 / 10 beurten te tonen; september/oktober staan in het Poets-tabblad, maar de bestaande tegel is alleen deze maand.

## Gewijzigde bestanden

- src/components/layout/Sidebar.tsx
- src/components/customers/ContactList.tsx
- src/components/customers/ContactDetailsPanel.tsx
- src/lib/customerPermissions.ts
- src/lib/customerPermissions.test.ts
- src/lib/omzet.ts
- src/lib/omzet.test.ts
- src/services/omzetService.ts
- src/services/directieService.ts
- src/services/rapportageService.ts
- src/services/livePoetsRevenue.test.ts
- src/components/rapportages/OmzetControle.tsx
- src/pages/rapportages/RapportageOmzet.tsx
- src/pages/rapportages/RapportagePoetsen.tsx
- src/pages/directie/DirectieDashboard.tsx
- src/pages/werkplaats/WerkplaatsFacturen.tsx
- AGENTS.md, roadmap.md, dit verslag; projectgeheugen bijgewerkt.

## Verificatie

- Unit-tests: maand zonder factuur, maand met factuur zonder totaalsprong, 31 oktober 23:30 NL, zonder uitvoerder; aanvullende uitsluitings- en roltests.
- Alle bestaande tests uitgevoerd; bekende voorraad-scopefout src/services/deliveredVehiclesQuery.ts:171 en de bestaande Deno e-mailtest die Vitest niet kan laden blijven ongemoeid.
- Automatische typecheck/build: laatste controle build OK.
- Geen SQL-schrijfcommando's, factuurfunctie, mailactie of accountaanmaak uitgevoerd. Geen tijdelijke databasegegevens achtergelaten.
- Beschikbare HEAD bij controle: 4d750629e6b1406ba4399c1a8c718fc1a38cab2e. Het platform beheert commits; geen afzonderlijke commit-ID voor deze wijzigingen beschikbaar.