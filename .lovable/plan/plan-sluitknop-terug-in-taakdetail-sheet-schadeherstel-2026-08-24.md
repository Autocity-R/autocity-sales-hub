# Plan: Sluitknop terug in taakdetail-sheet (schadeherstel)

## Probleem
In de schadeherstel-flow opent een kaart het `TaskDetailSheet` als bottom-sheet. Er is geen zichtbare manier om terug te gaan naar het hoofdmenu. Het standaard `X`-kruisje van shadcn `SheetContent` wordt afgedekt door de sticky voertuig-header (`z-10`) en is op mobiel niet bruikbaar.

## Oplossing
Voeg een altijd zichtbare sluitknop toe in de sticky header van `TaskDetailSheet`, zodat gebruikers in één klik terug zijn op de lijst.

## Stappen

1. **Sluitknop in sticky header (`src/components/werkplaats/TaskDetailSheet.tsx`)**
   - Plaats een `SheetPrimitive.Close` of gewone `<button>` rechts in de sticky voertuig-header.
   - Geef de knop een vinger-vriendelijke touch target (minimaal 44 × 44 px) en duidelijk label/aria-label "Sluiten".
   - Knop roept `onOpenChange(false)` aan.
   - Zorg dat de knop boven de header content uitsteekt (`z-20` of hoger) zodat hij nooit wordt afgedekt.

2. **Standaard shadcn-kruisje onderdrukken**
   - In `TaskDetailSheet` wordt `<SheetContent>` direct gebruikt. Geef `SheetContent` een className mee die de standaard `SheetPrimitive.Close` knop verbergt (`[&>[data-radix-collection-item]]:hidden` of vergelijkbaar), of vervang `SheetContent` door een lokale wrapper zonder die knop, zodat er geen dubbele/onzichtbare knop achterblijft.

3. **Mobiel vriendelijk maken**
   - Voeg een subtiele drag-handle bovenaan het bottom-sheet toe als visueel aanknopingspunt (niet verplicht, maar verhoort de verwachting op iOS/Android).
   - Behoud de bestaande "terug-sluits" via klikken buiten het sheet en de hardware-back-knop (werkt al via Radix Dialog).

4. **Consistentie controleren**
   - `TaskDetailSheet` wordt gebruikt in `WerkplaatsSchadeherstel`, `WerkplaatsUitdeuken`, `WerkplaatsPoetsen` en `MijnWerk`. De wijziging in de shared component lost het probleem voor alle vier op zonder aanpassingen in de callers.

5. **Testen**
   - Open schadeherstel op mobiele viewport (390 px).
   - Klik een kaart aan → sheet opent.
   - Controleer dat de sluitknop zichtbaar is en terugkeert naar de lijst.
   - Herhaal voor uitdeuken, poetsen en Mijn Werk.

## Bestanden die wijzigen
- `src/components/werkplaats/TaskDetailSheet.tsx`

## Niet in scope
- Gedrag van de actieknoppen onderaan (Start/Klaar) blijft onveranderd.
- Geen database- of edge-function wijzigingen.
