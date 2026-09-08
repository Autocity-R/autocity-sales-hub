# Cockpit: cijfers tellen pas bij goedkeuring

## Het probleem

De cockpit haalt werkorders op met de aanmaakdatum als peilmoment. Alles wat in een maand
is aangemeld/toegewezen valt daardoor in die maand, ook als het werk nog niet klaar of nog
niet goedgekeurd is. De omzet komt uit verstuurde facturen. Gevolg: meer "gedaan" werk dan
omzet, en bij schadeherstel loopt dat het meest uit de pas.

Vastgesteld in de cockpit-berekening: werkorders worden opgehaald op aanmaakdatum, en pas
daarna wordt binnen die selectie gekeken of ze afgerond of goedgekeurd zijn. Werk dat vorige
maand is aangemeld en deze maand is goedgekeurd valt daardoor in de verkeerde maand — of
helemaal buiten beeld.

## Wat er verandert

- Een klus telt mee in de maand waarin hij is **goedgekeurd**, niet bij toewijzing.
- Uitdeuken kent geen goedkeurstap meer (klaarmelden is eindstatus). Voor die discipline
  geldt het klaarmeldmoment als goedkeuring, anders zou uitdeukwerk nooit meetellen.
- Omzet blijft op factuurdatum staan, zoals nu.
- Aantallen, uren, gemiddelde doorlooptijd, omzet per uur en de medewerkerslijst gebruiken
  allemaal hetzelfde goedkeurmoment, zodat de blokken onderling kloppen.
- Openstaand werk en verouderde klussen blijven op aanmaakdatum staan — dat is juist de
  bedoeling van die blokken.

## Technische uitvoering

In `src/services/directieService.ts`:

1. Werkorders niet meer op `created_at` binnen de periode ophalen, maar over een ruimer
   venster (vanaf het begin van de 6-maands historie die er al wordt opgehaald) en daarna
   in code op periode filteren via een helper:
   ```text
   goedgekeurdOp(order) = discipline === "uitdeuk"
     ? (approved_at ?? finished_at)
     : approved_at
   ```
   Orders zonder dat moment vallen buiten de periodecijfers (ze zitten al in `ordersOpen`).
2. `orders` en `ordersPrev` in `DirectieRaw` vullen met deze goedkeur-gefilterde sets,
   zodat alle afgeleide functies automatisch meelopen.
3. `hoursOf` en `employeeKpis` de statuscheck laten vervangen door dezelfde
   goedkeur-helper, zodat er geen tweede definitie van "gereed" blijft bestaan.
4. `branchStats` ongemoeid laten qua omzetbron (verstuurde facturen), maar de order-set die
   het matcht is nu de goedgekeurde set — daardoor sluiten aantal en omzet op elkaar aan.
5. `flowStats`, `warrantyStats` en de open-werk-blokken blijven op `created_at`/`ordersOpen`.

Controle: `bunx tsgo --noEmit -p tsconfig.app.json`, plus in de cockpit van deze en vorige
maand nagaan dat aantallen en omzet per tak niet meer uiteenlopen.
