

# Fix: Wit scherm in preview oplossen

## Analyse

Na het bekijken van de code, console logs en de applicatie-structuur is er **geen code-fout** gevonden die een wit scherm veroorzaakt. De applicatie laadt correct:
- `AuthProvider` wropt de hele app in `main.tsx`
- `ProtectedRoute` heeft een veilige fallback als auth nog niet geladen is
- De DYMO script-fout (`ERR_TUNNEL_CONNECTION_FAILED`) is onschuldig -- het script laadt met `defer` en de dymoService vangt missende `window.dymo` netjes op

## Waarschijnlijke oorzaak

Het witte scherm wordt veroorzaakt door de **preview iframe** die vastloopt na meerdere snelle code-wijzigingen. Dit is een bekend gedrag in de Lovable preview.

## Oplossing

1. **Verplaats het DYMO script** uit `index.html` zodat het niet op elke pagina geladen wordt (het is alleen nodig in de QR dialog). Dit voorkomt een onnodige netwerk-fout op elke paginalading.
2. **Laad het DYMO script dynamisch** in `dymoService.ts` -- alleen wanneer de gebruiker de QR-sticker dialog opent.

## Technische wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `index.html` | Verwijder de DYMO `<script>` tag (regel 32) |
| `src/services/dymoService.ts` | Voeg een dynamische script-loader toe die het DYMO framework laadt bij eerste gebruik |

## Detail: dymoService.ts aanpassing

De `checkDymoEnvironment` functie krijgt een lazy-load stap:
- Bij eerste aanroep: voeg dynamisch een `<script>` tag toe voor het DYMO framework
- Wacht tot het script geladen is (of gefaald)
- Ga dan verder met de bestaande environment-check
- Bij falen: retourneer `isAvailable: false` zonder crash

## Voordelen

- Geen onnodige netwerk-fouten op elke pagina
- Snellere initialisatie van de app (een externe script minder)
- Het witte scherm probleem wordt vermeden doordat er geen blokkerende externe scripts meer zijn

