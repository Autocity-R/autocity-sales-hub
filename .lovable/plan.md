

# Plan: Afleverafspraak voor niet-klare voertuigen

## Probleem

Momenteel kan een afleverafspraak alleen ingepland worden als een voertuig 100% checklist-compleet is EN de importstatus "ingeschreven" is. In de praktijk worden afspraken soms eerder gepland wanneer er nog kleine werkzaamheden openstaan.

## Wijzigingen

### 1. ChecklistTab.tsx — DeliveryAppointmentCard altijd tonen

De conditie op regel 252 wijzigen: de `DeliveryAppointmentCard` tonen zodra het voertuig B2C-verkocht is, ongeacht checklist-voortgang of importstatus. Als het voertuig nog niet helemaal klaar is, een waarschuwingstekst tonen ("Let op: dit voertuig is nog niet volledig klaar voor aflevering").

- `isReadyForDelivery && !hasDeliveryAppointment` → `!hasDeliveryAppointment`
- De card titel/beschrijving aanpassen: als niet klaar, tekst wijzigen naar "Afleverafspraak inplannen" ipv "Klaar voor levering!"
- Zelfde logica voor het "al ingepland" blok op regel 259: `isReadyForDelivery &&` verwijderen

### 2. DeliveryAppointmentCard.tsx — Waarschuwing bij niet-klaar

Een optionele `isReady` prop toevoegen. Als `false`: oranje styling ipv groen, waarschuwingstekst dat het voertuig nog niet volledig klaar is maar de afspraak alvast gepland kan worden.

### 3. VehicleB2CTableRow.tsx — Badge tonen bij afspraak ongeacht status

Regel 206: de afspraakbadge (blauwe "Afspraak gepland" badge met datum) ook tonen wanneer het voertuig NIET klaar is maar WEL een actieve afspraak heeft. De groene "Klaar voor levering" badge blijft alleen verschijnen bij daadwerkelijk klare voertuigen.

Huidige logica:
```
{readyForDelivery && (hasActiveDeliveryAppointment ? <blue badge> : <green badge>)}
```
Nieuwe logica:
```
{hasActiveDeliveryAppointment ? <blue badge> : readyForDelivery ? <green badge> : null}
```

### 4. InventoryB2C.tsx — "Afspraak gepland" filter corrigeren

Het "scheduled" filter (regel 125-130) toont nu voertuigen met afspraak die NIET klaar zijn. Dit aanpassen zodat het ALLE voertuigen met een afspraak toont, ongeacht klaar-status. De extra filter op regel 127-130 verwijderen.

## Samenvatting impact

| Bestand | Wijziging |
|---------|-----------|
| ChecklistTab.tsx r252, r259 | `isReadyForDelivery` conditie verwijderen |
| DeliveryAppointmentCard.tsx | `isReady` prop toevoegen, waarschuwing bij niet-klaar |
| VehicleB2CTableRow.tsx r206 | Afspraakbadge onafhankelijk van klaar-status |
| InventoryB2C.tsx r125-130 | "Scheduled" filter toont alle voertuigen met afspraak |

