# LMS-koopcontracten leesbaar maken

## Aanpak
- Breng alle plekken samen waar opgeslagen en LMS-contracten vanuit het voertuigdossier worden geopend.
- Voeg één herbruikbare PDF-viewer toe op basis van `pdfjs-dist`, met standaard passend-in-breedte, min/plus, 100%, passend, nieuw tabblad en downloaden.
- Laat elke pagina afzonderlijk renderen en opnieuw schalen bij een gewijzigde vensterbreedte, zodat ook afbeelding-PDF’s op telefoonformaat passen.
- Toon een duidelijke fout als de signed URL ontbreekt of de PDF niet geladen kan worden.
- Sluit de viewer aan op de bestaande contractlinks in voertuigdetail, afgeleverd en het contractstatusoverzicht zonder de opslag- of ondertekenflow te wijzigen.

## Technisch
- De viewer gebruikt een flexibele 100%-container met begrensde hoogte en interne scroll; geen vaste containerbreedte of -hoogte.
- Pinch-zoom past de interne schaal aan op touchapparaten; normale scroll blijft beschikbaar.
- Signed URLs blijven via de bestaande private Storage-opvraging lopen.
- Afronding met TypeScript-controle en productie-build; niet publiceren.
