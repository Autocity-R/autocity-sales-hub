# Bulk-taxatie Excel → JP Cars: volledige documentatie

## Doel
Eén compleet, zelfstandig leesbaar document dat de volledige bulk-taxatieflow beschrijft, zodat je het in een ander project kunt analyseren en nabouwen — inclusief alle prompts, whitelists en mappingtabellen verbatim.

## Op te leveren
Nieuw bestand `docs/bulk-taxatie-excel-naar-jpcars.md` met:

1. **Architectuuroverzicht** — welke laag wat doet (browser → parser-agent → JP Cars → portal → interne historie → adviesagent → opslag), met ASCII-flowdiagram.
2. **Stap 1: Excel inlezen** — `findHeaderRow()` verbatim inclusief de trefwoordenlijst, fallback-regels, `sheet_to_json`-opties, `combinedDescription`-samenvoeging en rij-validatie.
3. **Stap 2: parser-agent** — de volledige system prompt en user prompt van `analyze-excel-vehicles` verbatim (bouwjaar-extractie, vermogens-extractie, de complete JP Cars optie-whitelist, meertalige detectieregels), het exacte outputschema per voertuig, batchgrootte 150 + 1s delay, `max_tokens 65536`.
4. **Stap 3: robuustheidslaag** — JSON-fence stripping, partial-JSON recovery (twee methodes), bouwjaar-regex-fallback, validatiecriteria en de debug-logging die aangeeft waarom een rij faalt.
5. **Stap 4: JP Cars-vertaling** — alle mappingtabellen verbatim: `mapFuelType`, `mapGearType`, `mapBodyType`, `mapColor`, `determineFourDoors`, `mapOptionsToJPCars` (opties als één spatie-gescheiden string), plus het exacte requestbody-formaat, endpoint `POST /api/valuate/extended` en query params.
6. **Stap 5: vangnetten** — HP-retry bij `ERROR_INVALID_CAR`, partial-data acceptatie, veldnamen van de response (`stat_turnover_ext` voor ETR, `percents` voor min/max, APR-breakdown).
7. **Stap 6: verwerkingslus** — sequentiële verwerking per voertuig, timeouts (30/45/15/60s), `withRetry`/`withTimeout`/delays, eenmalige feedbackcache, opslag in `taxatie_valuations`.
8. **Bijlage A: Arval-specifieke valkuilen** — wat er typisch misgaat bij dit soort lijsten (banner-rijen, datumkolommen als registratiedatum, kW in plaats van pk, opties in één vrije-tekstkolom, ontbrekend model bij enkel een uitvoeringsnaam) en welk onderdeel van de flow dat opvangt.
9. **Bijlage B: overzetkaart** — welke bestanden je nodig hebt en met welke verantwoordelijkheid, zodat de flow los van dit CRM te implementeren is.

## Technische details
- Bronbestanden voor de verbatim inhoud: `src/hooks/useBulkTaxatie.ts`, `supabase/functions/analyze-excel-vehicles/index.ts`, `supabase/functions/analyze-excel-vehicles-claude/index.ts`, `supabase/functions/jpcars-lookup/index.ts`, `src/services/taxatieService.ts`, `src/types/bulkTaxatie.ts`.
- Ook de Claude-variant wordt beschreven: verschil in API-schil (Anthropic Messages + tool_use) bij identieke prompt-inhoud.
- Alleen documentatie: geen wijzigingen aan code, edge functions of database.

## Acceptatiecriteria
- [ ] Alle prompts en whitelists staan verbatim in het document, niet samengevat.
- [ ] Alle vier mappingfuncties staan volledig uitgeschreven.
- [ ] Het document is zelfstandig te lezen zonder de codebase erbij.
- [ ] Geen bestaande code gewijzigd.
