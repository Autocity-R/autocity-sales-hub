# Roadmap

- [x] Bouwstap 14A: claimnummer, 234 claims backfill, zoeken en e-mailmatching (niet gepubliceerd)
- [x] Bouwstap 14B: contactwijzigingen in elke claimstatus met audit en werkplaatskoppeling; rollbacktest geslaagd
- [x] Bouwstap 14C: gedeelde Nog open-lijst; KJD-68-H 10 punten, G-437-PX 1 punt; SQL/unit-tests
- [ ] Bouwstap 14 ingelogde preview: external_unmanaged, /warranty redirect naar /auth; geen testsessie beschikbaar

- [x] Bouwstap 12A: Alle klanten voor operationeel directeur, bestaande B2B/B2C-klantrechten; geen RLS-wijzigingen
- [x] Bouwstap 12B: gedeelde live poetsomzet, facturen apart; unit-tests en SQL-maandcontrole (niet gepubliceerd)
- [ ] Bouwstap 12 ingelogde schermcontrole + OD-klant zoeken/detail: external_unmanaged Supabase biedt geen testsessie; alle pagina's tonen /auth

- [x] Garantieclaim HKN-61-B: ontbrekende autokoppeling hersteld voor handmatige claims; CRM-keuze, atomische planning, 6 tests en SQL-rolproef geslaagd; testdata volledig teruggedraaid (niet gepubliceerd)
- [ ] Garantieplanning ingelogd klikken: niet beschikbaar bij externe Supabase; HKN-61-B niet daadwerkelijk ingepland zonder gekozen datum/klant

- [x] Aftersales en operationeel directeur: bestaande B2B/B2C-klantgegevens aanpassen; 216 roltests geslaagd, beleid bevestigd (niet gepubliceerd)
- [ ] Klantrechten: SQL-praktijktest wacht op toestemming (test afgewezen); ingelogde kliktest niet beschikbaar bij externe Supabase

- [x] Vestiging B2C: 50 verkopen en €200.000 marge inclusief garantie; overige targets behouden (niet publiceren)

- [x] Goedkeuren-menu splitsen in Werkplaats en Schadeherstel; Werkplaats zonder terugsturen
- [x] LMS-koopcontracten tonen in één robuuste PDF-viewer in alle contractschermen
- [x] QR-checklist werkend zonder login (stap 1)
- [x] Bouwstap 2: A poets-afleveringen via afspraak, B voortgang-sortering, C B2C aflevermoment/checklist-%, D uitdeuk VERKOCHT B2C, E rechten directeur
- [x] Correctie stap 2: "Afleverafspraak inplannen" verborgen voor operationeel directeur
- [x] Bouwstap 3: leenauto-uitleenregistratie, historie + "Wie reed er?", claim-koppeling en verplichte inleveren-vraag

- [x] Bouwstap 4: operationeel_directeur krijgt Leenauto beheer/historie + werkplaats-agenda (niet gepubliceerd)

- [x] Bouwstap 5: Performance-cards per auto/discipline/werkdag groeperen, tijd als unie, verdachte timers, detail + omzet per onderdeel (niet gepubliceerd)
- [x] Onderzoek €0 afgerond: KVH-62-D wacht volgens factuurtrigger op alle interne spuitdelen; J-847-RR is extern
- [x] Vervolg Performance: gefactureerd, nog te factureren en externe klus apart tonen + testen (niet gepubliceerd)
- [x] Bouwstap 6: werktijden-instelling, auto-pauze (cron), uren afknippen op werktijd, pauzeren voor poetsers (niet gepubliceerd)
- [x] Bouwstap 9: medewerkers uit dienst zetten i.p.v. hard verwijderen (niet gepubliceerd)
- [x] Bouwstap 10: volledige werkhistorie per afgeleverde auto (niet gepubliceerd)
- [x] Bouwstap 11: omzet uit één bron (niet gepubliceerd)
- [ ] Website-reservering edge function — plan klaar, wacht op akkoord eigenaar
- [x] Bouwstap 13A: Historie-tijdlijn per auto (RPC voertuig_tijdlijn + tabblad in detail, werkplaats-sheet, afgeleverd-link) (niet gepubliceerd)
- [x] Bouwstap 13B: Nog te factureren (extern) blok + factuur_niet_nodig RPC + badge (niet gepubliceerd)

- [x] Bouwstap 16A: laadkabels (1/2, optioneel) bij inname + voertuigdetail, wie/wanneer, log + historie, 🔑/🔌 op kaarten (niet publiceren)
- [x] Bouwstap 16B: live werkplaatsstatus bij garantieclaims (badge, filter, 60 s alleen op garantiemenu, "afronden?"-signaal) (niet publiceren)
- [x] Bouwstap 16C: operationeel directeur maakt werkplaats- en schadeherstelopdrachten aan + garantie inplannen (niet publiceren)
- [ ] Bouwstap 16 ingelogde schermcontrole (OD/aftersales/garantiemenu): externe Supabase biedt geen testsessie

- [x] Bouwstap 17A: tijdregels per persoon (work_order_tijdregels + trigger), geen backfill (niet publiceren)
- [x] Bouwstap 17B: generiek overnemen (werkorder_overnemen, spuit_overnemen wrapper, knop voor monteurs)
- [x] Bouwstap 17C: uren per persoon in Performance/KPI/Directie/Mijn prestaties + "samen met", planning "A → B (overgenomen)"
- [ ] Bouwstap 17 ingelogde schermcontrole (monteur Overnemen in Mijn werk, Performance-detail): externe Supabase biedt geen testsessie

- [x] Bouwstap 18A: creditfacturen in de database (kolommen, RPC factuur_crediteren met dry-run, omzet in creditmaand, guard) (niet publiceren)
- [x] Bouwstap 18B: Crediteren-knop + dialoog + pdf "CREDITFACTUUR" + lijstbadges/filter in Facturen (niet publiceren)
- [x] Bouwstap 18C: credits correct in rapportages, cockpit, controle, klanten, historie per auto (niet publiceren)
