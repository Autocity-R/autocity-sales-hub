# Performance-omzet uitsplitsen

## Resultaat
- Performance-cards en details tonen afzonderlijk **Gefactureerd** en **Nog te factureren**.
- Alleen goedgekeurde interne werkplaats- en spuitorders zonder interne factuur tellen als nog te factureren: werkplaats €300 per order, spuitwerk €300 per onderdeel.
- Bij wachtend spuitwerk wordt vermeld dat de factuur volgt na goedkeuring van alle onderdelen, inclusief de nog openstaande onderdelen van dezelfde auto.
- Externe klussen krijgen een duidelijk label. Een gekoppelde verstuurde externe factuur wordt getoond; zonder koppeling wordt geen bedrag geschat.
- De medewerkerstabel krijgt **Nog te factureren** als aparte waarde naast de bestaande omzet; bestaande omzetrapportages en KPI-berekeningen blijven ongewijzigd.

## Technische uitvoering
- Voeg in de gedeelde performance-logica een geteste omzetclassificatie toe op basis van orderstatus, discipline, origin, parts en factuurkoppelingen.
- Gebruik dezelfde classificatie in de medewerkerstabel, cards en detailweergave.
- Verrijk openstaande onderdelen vanuit de reeds geladen werkorders van hetzelfde voertuig en dezelfde discipline.
- Voeg unit-tests toe voor €300 per werkplaatsorder, €300 per spuitdeel, uitsluiting van reeds gefactureerde en niet-goedgekeurde orders, en externe klussen.

## Verificatie
- Controleer in de preview dat KVH-62-D €0 gefactureerd en €900 nog te factureren toont met open onderdelen.
- Controleer dat J-847-RR als externe klus verschijnt zonder verzonnen omzet.
- Draai typecheck en tests; de bekende bestaande fout in `deliveredVehiclesQuery.ts:171` mag als enige blijven.
- Geen databasewijzigingen en niet publiceren.
