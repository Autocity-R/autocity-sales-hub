# Directie-cockpit opruimen en Goedkeuren splitsen

## Doel
- Verwijder het blok **Top 5 auto's — herstel-omzet** uit de operationeel-directeurcockpit.
- Splits het bestaande menu **Goedkeuren** duidelijk op in **Werkplaats** en **Schadeherstel**.

## Aanpak
1. Deel het bestaande goedkeuringsscherm op in aparte secties voor Werkplaats en Schadeherstel.
2. Toon bij iedere sectie een duidelijk aantal wachtende opdrachten en behoud de huidige opdrachtinformatie en goedkeurknop.
3. Verwijder bij Werkplaats de knop **Terugsturen**; werkplaatsopdrachten kunnen hier alleen worden goedgekeurd.
4. Behoud bij Schadeherstel zowel **Goedkeuren** als **Terugsturen**.
5. Verwijder het Top 5-blok en de bijbehorende ongebruikte cockpitberekening/export.

## Technische details
- Gebruik alleen afgeronde orders (`status = afgerond`) voor disciplines `werkplaats` en `spuit`.
- Bestaande vestigingsfilters en rollen blijven ongewijzigd.
- Geen databasewijzigingen.
- Controleer na afloop de types, de cockpit en het goedkeuringsscherm op desktop en mobiel.
