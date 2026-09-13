# Directie-cockpit: goedkeuringen duidelijk splitsen

## Doel
- Verwijder het blok **Top 5 auto's — herstel-omzet** uit de operationeel-directeurcockpit.
- Maak zichtbaar welk afgerond werk nog op goedkeuring wacht, apart voor **Werkplaats** en **Schadeherstel**.

## Aanpak
1. Voeg in de cockpit een blok **Wacht op goedkeuring** toe met twee duidelijke kolommen:
   - Werkplaats
   - Schadeherstel
2. Toon per kolom het aantal en de relevante opdrachten, met kenteken, auto, werkzaamheden, medewerker en afrondingsdatum.
3. Laat het blok doorlinken naar het bestaande goedkeuringsscherm.
4. Deel ook het bestaande goedkeuringsscherm visueel op in aparte secties voor Werkplaats en Schadeherstel, zonder de goedkeur- of terugstuurwerking te veranderen.
5. Verwijder het Top 5-blok en de bijbehorende ongebruikte cockpitberekening/export.

## Technische details
- Gebruik alleen afgeronde orders (`status = afgerond`) voor disciplines `werkplaats` en `spuit`.
- Bestaande vestigingsfilters en rollen blijven ongewijzigd.
- Geen databasewijzigingen.
- Controleer na afloop de types en beide schermen op desktop en mobiel.
