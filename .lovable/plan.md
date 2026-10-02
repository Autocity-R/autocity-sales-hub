# Garantie-zoekfunctie vindt niet alle afgeleverde auto's

## Oorzaak (nagekeken in de database)
1. **Er komen maar 1000 auto's mee.**
   - Het zoekveld bij een nieuwe garantieclaim laadt alle afgeleverde en verkochte auto's met een klant: dat zijn er 1165.
   - De database geeft per keer maximaal 1000 auto's terug, de nieuwste eerst.
   - De Peugeot 5008 (VIN VF3MRHNSUPS023926) staat op plek 1042 en valt daarom buiten de lijst. Alle oudere auto's zijn op dezelfde manier onvindbaar.
2. **Het kenteken staat verkeerd opgeslagen.**
   - Bij deze auto staat als kenteken "3926" (de meldcode) en niet "HZR-63-X".
   - Zoeken op HZR-63-X vindt hem dus ook na de fix niet; zoeken op VIN of op 3926 wel.

## Wat we bouwen
1. **Zoeken in de database zelf.**
   - Het zoekveld laadt niet meer één grote lijst vooraf.
   - Zodra je 2 of meer tekens typt, zoekt het direct in alle afgeleverde en verkochte auto's, zonder grens van 1000.
   - Je kunt zoeken op kenteken (met of zonder streepjes, hoofd- of kleine letters), VIN of het laatste deel ervan, merk, model en klantnaam.
2. **Zelfde fix op de andere plekken met dit zoekveld:**
   - Garantie-inbox (een e-mail aan een auto koppelen)
   - Taakformulier
   - We kijken ook of andere lijsten met afgeleverde auto's op de grens van 1000 vastlopen.
3. **Kenteken van deze auto corrigeren naar HZR-63-X.** Dit gebeurt alleen na jouw akkoord: het is een wijziging in echte gegevens.
4. **Controle in de preview.**
   - Als aftersales een nieuwe claim openen en zoeken op "023926", "3926" en "hzr63x": de Peugeot moet verschijnen.
   - Ook een andere oude afgeleverde auto testen.

## Technisch
- `fetchDeliveredVehiclesForWarranty` krijgt een zoekparameter.
- Zoeken gebeurt in de database met `.or(license_number.ilike, vin.ilike, brand.ilike, model.ilike)` met `limit 50`.
- De klantnaam zoeken we apart in contacts (op `customer_id`).
- Voor kentekens halen we streepjes en spaties weg, net als in `src/lib/searchNormalize.ts`.
- `SearchableVehicleSelector`:
  - wacht kort na het typen en zoekt pas dan;
  - toont "Typ minimaal 2 tekens";
  - laat een al gekozen auto zien door hem apart op `id` op te halen.
- Niet publiceren.
