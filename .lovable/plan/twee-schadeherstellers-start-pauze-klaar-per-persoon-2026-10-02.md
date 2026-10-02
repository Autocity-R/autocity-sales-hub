# Twee schadeherstellers: Start / Pauze / Klaar per persoon

## Wat er nu misgaat
- Mehmet Senses (nieuw, rol schadeherstel) en Yousry werken in hetzelfde menu Schadeherstel.
- De database-regels voor schadeherstel kennen de status "gepauzeerd" niet. Een gepauzeerde klus kan een schadehersteller dus niet zien en niet hervatten. Alleen beheerders kunnen dat nu.
- Een klus die op naam van een collega staat (nu 2 gepauzeerde klussen van Yousry) mag de ander niet starten. De app laat de Start-knop toch zien. Klik je erop, dan gebeurt er niets en krijg je ook geen melding. Dat is precies wat Mehmet ziet.
- Er staan 10 ingeplande klussen zonder naam. Die kan iedereen starten.

## Wat we bouwen
1. **Eén klik per persoon.** Elke schadehersteller ziet bij elke kaart:
   - **Start** bij een vrije klus. De klus komt dan op jouw naam.
   - **Pauze** en **Klaar** bij je eigen lopende klus.
   - **Verder** bij je eigen gepauzeerde klus.
2. **Klussen van een collega.** Die tonen "Bezig — Yousry" of "Gepauzeerd — Yousry", zonder Start-knop. Zo kan niemand meer op een knop drukken die niets doet.
3. **Overnemen (optioneel, zie vraag).** Een knop "Overnemen" bij een gepauzeerde klus van een collega. De al gewerkte tijd blijft bewaard.
4. **Filter bovenaan:** "Mijn klussen" / "Vrij" / "Alles".
5. **Duidelijke melding.** Lukt een actie niet door rechten, dan komt er een melding in beeld in plaats van stilte.
6. **Rechten in de database aanpassen:**
   - Een schadehersteller mag zijn eigen klus pauzeren en hervatten.
   - Hij ziet ook de gepauzeerde klussen van collega's.
   - Hij kan geen klussen van anderen wijzigen, behalve via Overnemen als we dat bouwen.
7. **Test met twee testaccounts:**
   - Mehmet start een klus, pauzeert, gaat verder en meldt Klaar.
   - Yousry kan Mehmets lopende klus niet bedienen.
   - De uren worden per persoon goed geteld.

## Technisch
- Migratie: in de beleidsregels `wo_select` en `wo_update` komt `gepauzeerd` erbij voor de rol schadeherstel. Bijwerken mag alleen bij `assigned_to = auth.uid()` of bij een vrije klus. Overnemen loopt via een security-definer functie `spuit_overnemen(id)`, alleen voor gepauzeerde klussen.
- `WerkplaatsSchadeherstel.tsx`:
  - De knoplogica kijkt naar `mine` / vrij / collega.
  - Updates controleren met `.select()` dat er een rij is gewijzigd. Is dat niet zo, dan verschijnt een melding.
  - Het filter wordt toegevoegd.
- Unit-test voor de knoplogica (welke knop zie je in welke situatie).
- De poets-verwijderknop voor de operationeel directeur blijft openstaan. De database-wijziging daarvoor is nog niet uitgevoerd en kan in dezelfde migratie mee.
- Niet publiceren.
