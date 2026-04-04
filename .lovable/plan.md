

# Fix Marco Dashboard — Alert tegels los van pipeline berekenen

## Probleem

De alert tegels ("Nog te betalen", "Klaar voor ophalen", "CMR kritiek") gebruiken `pipeline.nieuw.length` en `pipeline.aangekomen.length` als bron. Maar `classifyVehicle` plaatst een onbetaalde auto die al onderweg is in de "pickup" stap — niet in "nieuw". Daardoor toont "Nog te betalen" 0 terwijl er 35 onbetaalde auto's zijn.

Jouw correcte businessregels:
- **Nog te betalen**: alle auto's zonder `purchase_payment_status = 'volledig_betaald'`
- **Betaald, pickup niet verstuurd**: betaald maar `pickupDocumentSent` is niet true
- **Klaar voor ophalen**: betaald EN pickup verstuurd (maar nog niet onderweg/aangekomen)
- **CMR kritiek**: `transportStatus = 'aangekomen'` zonder cmrSent en papersReceived

## Wijziging

### `MarcoDashboard.tsx` — alerts blok herschrijven (regels 166-182)

De alert counts worden los berekend over alle gefilterde voertuigen, niet meer gekoppeld aan pipeline stappen:

```
alerts.nietBetaald = filtered waar paymentStatus !== 'volledig_betaald'
alerts.betaaldGeenPickup = filtered waar betaald EN pickupDocumentSent niet true
alerts.pickupGereed = filtered waar betaald EN pickupDocumentSent true EN niet onderweg/aangekomen
alerts.cmrKritiek = filtered waar transportStatus='aangekomen' EN cmrSent niet true EN papersReceived niet true
alerts.bpmTeLaat = ongewijzigd
alerts.inschrijvingTeLaat = ongewijzigd
```

### Alert tiles array uitbreiden van 5 naar 6

Voeg "Betaald, pickup niet verstuurd" toe als aparte tegel (oranje). Grid aanpassen naar 6 kolommen.

### Geen andere bestanden, geen database wijzigingen

Alleen het alerts blok en de alertTiles array in `MarcoDashboard.tsx` worden aangepast.

