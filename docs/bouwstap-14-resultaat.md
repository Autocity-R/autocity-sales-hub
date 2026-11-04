# Bouwstap 14 — resultaat

Niet gepubliceerd. Geen mails of testmails verstuurd, geen facturen aangemaakt, geen echte auto-/contactgegevens gewijzigd. Alleen de toegestane claimnummer-backfill is uitgevoerd. Website-reservering bleef ongemoeid.

## Claimnummers
- 2025: 51 claims, GC-2025-0001 t/m GC-2025-0051.
- 2026: 183 claims, GC-2026-0001 t/m GC-2026-0183.
- Geen ontbrekende of dubbele nummers; tellers 51 en 183.
- Oudste: 21-10-2025, GC-2025-0001. Nieuwste: 04-11-2026, GC-2026-0183.
- Claim `4e237ffb-6cf0-45c0-9c2b-4edf4006e360` = **GC-2026-0183**.
- BEFORE-trigger gebruikt een atomische upsert op de jaarteller (Postgres rij-lock) en weigert nummerwijzigingen. UUID blijft sleutel.

## Contactgegevens
Er was geen blokkade specifiek door inplannen: de contactvelden waren uitsluitend leesbaar, de algemene bewerkknop ontbrak voor OD en bij opgeloste claims. De afzonderlijke knop werkt onafhankelijk van status; claimbewerkers en OD kunnen corrigeren.

De atomische SECURITY INVOKER RPC `garantie_contact_wijzigen` slaat claim-overrides op, werkt optioneel de klantkaart bij onder bestaande contacts-RLS en logt wijzigingen. Bij fout wordt alles teruggedraaid. Klant zoeken op naam/telefoon/email/kenteken via `garantie_klant_zoeken`; nieuwe CRM-klant via bestaand formulier waar de rol mag aanmaken.

Werkorders met een bestaande `external_customer`-kopie worden vernieuwd. Interne garantieorders krijgen niet zomaar zo'n kopie: dat zou ze in de bestaande externe factuurselectie brengen. Werkplaats-calendar-sync haalt de actuele claim/CRM-gegevens op; bestaande gekoppelde events worden na correctie opnieuw gesynchroniseerd. Herinneringen lezen de nieuwe gegevens zonder gewijzigde ontvangerselectie of mailtekst. Verkoopagenda/appointments zijn nooit gewijzigd; bestaande afleverafspraak wordt uitsluitend gelezen.

## E-mailverwerking
Voorheen matchte process-garantie-emails primair via replyheaders, daarna afzender/ontvanger; claimrelaties gebruikten UUID. Die paden blijven bestaan. Nieuwe begrensde GC-referenties (en volledige UUID-referenties) worden vóór de afzenderfallback opgelost, uitsluitend bij overeenkomend klant-emailadres. Meerdere/conflicterende nummers worden niet automatisch aan een claim gekoppeld. Garantie-agent kan dezelfde referentie alleen-lezen oplossen; prompt en dossier-mailteksten zijn niet aangepast. Verzonden onderwerpen/HTML blijven ongewijzigd. Processors zijn niet aangeroepen om echte mails te verwerken tijdens tests.

## Nog open
Gedeeld `VehicleOpenPoints` vóór de tijdlijn in alle drie historie-ingangen; SECURITY INVOKER `voertuig_open_punten`, exacte VIN/genormaliseerde kentekenmatching ≥6 tekens, bestaande RLS, geen prijzen. Orders, onderdelen, taken, claims, B2C-checklist en factuurpunten volgens factuurleesrollen. Datumdeadlines worden op NL-kalenderdag beoordeeld; afgerond = Wacht op goedkeuring.

- **KJD-68-H:** 10 punten: 2 werkplaatsorders (gepauzeerd sinds planning 26-10 09:46 NL, ingepland 13-11 13:00 NL) en 8 checklistpunten: Onderhoudsbeurt, APK, 12V accu, trilling stuur/banden, volladen, vrij van storingen, onderhoud boardcomputer, beide laadkabels. Gepauzeerde order is te laat.
- **G-437-PX:** 1 ingeplande poetsorder, Showroom-poets na inname; zonder geplande datum/uitvoerder/deadline.
- RPC met SQL vergeleken; gemeten 19,176 ms en 24,450 ms, onder 300 ms (read-only controleverbinding).
- Optionele extra N-open badge niet toegevoegd: geen aanvullende zware query per kaart.

## Tests en beperkingen
- Nieuwe nummer/contact/open-punten en referentietests slagen; volledige suite: 357 tests geslaagd, 1 bekende failure `deliveredVehiclesQuery.ts:171`; daarnaast bekende https-importfout in emailMime.test.ts.
- Harness typecheck/build: build OK. Geen handmatige build/typecheck uitgevoerd.
- SQL tijdelijke inserts: opvolgende unieke nummers, onveranderbaar nummer, contactaudit; alles rollback, nul testclaims en onveranderde tellers bevestigd.
- Ingelogde contact-RPC met tijdelijk claimrecord en owner-rolcontext in rollback geslaagd. Een eerste proef ontbrak de verplichte branch; gecorrigeerde proef slaagde.
- **Twee werkelijk gelijktijdige aparte SQL-sessies zijn niet getest**; de rij-lockveiligheid is door de atomische teller-upsert geborgd, de opvolgtest gebruikte één transactie.
- Preview geprobeerd: /warranty → /auth. Externe Supabase biedt geen owner.test@-testsessie; ingelogde schermcontrole en daadwerkelijke Google-eventvernieuwing niet geverifieerd.
- Nieuwe migratiewaarschuwing (teller zonder policy) opgelost. 118 bestaande security-findings zijn niet gewijzigd.

## Migratie-SQL en functies
Volledige SQL staat in de door de migratietool aangemaakte bestanden:
`20261104223945_f6850d91-2ba8-4b29-8042-9a4fc0d0732d.sql`,
`20261104223956_9396c837-183f-4afe-aca5-95bd8919772f.sql`,
`20261104224036_84b3db92-3bbd-4924-85e0-9632acbe705d.sql`,
`20261104224124_a09b319a-12d3-4f2a-92da-eff0ef1f2ead.sql`,
`20261104224409_2094e8dd-f847-48b3-b316-36e347fb86dd.sql`,
`20261104224432_f0c094e2-74a1-436c-a59b-5a4c5b871d8a.sql`,
`20261104224503_66873a26-a876-4a3f-9e85-e0acbc20a548.sql`,
`20261104231130_364e2371-fcf4-4c52-8a62-803a443bcda9.sql`,
`20261104231428_a74f815b-57c9-4c1f-8407-a4c888db9c3d.sql`.

Nieuw: `warranty_claim_nummer_toekennen`, `warranty_claim_contact_log`, `garantie_contact_wijzigen`, `garantie_klant_zoeken`, `voertuig_open_punten`; uitgebreid `voertuig_tijdlijn` en `voertuig_werkhistorie`.

## Bestanden
Nieuwe helpers/tests: claimNumber, vehicleOpenPoints, garantieClaimReference; nieuwe schermonderdelen ClaimNumber, ClaimContactEditor, VehicleOpenPoints. Aangepast warrantyCustomer(+test), warrantyService, warranty types, Warranty-pagina/lijst/detail, VehicleTimeline, DeliveryChecklistHistory, TaskDetailSheet, SaraDashboard, GarantieInbox, WarrantyReports, AftersalesDashboard, MijnWerk, WerkplaatsPlanning/Agenda/Autos, LoanCarHistory. Functies process-garantie-emails, garantie-agent, werkplaats-calendar-sync, werkplaats-afspraak-herinnering. AGENTS.md en roadmap.md bijgewerkt.

Laatste gecontroleerde HEAD tijdens validatie: `4692b1d3946684b51761fd644e30cceac8116cee`. Commits worden door het platform beheerd, niet handmatig aangemaakt.