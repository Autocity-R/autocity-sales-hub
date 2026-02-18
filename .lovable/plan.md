

# Fix: QR Sticker browser-print optimaliseren voor DYMO 11354

## Probleem

De "Print via browser" functie werkt niet goed omdat:
1. `@page { size: 57mm 32mm }` wordt door veel browsers genegeerd of anders geinterpreteerd
2. De browser voegt standaard marges toe die de layout verschuiven
3. De QR-code wordt van een externe API geladen (`api.qrserver.com`) - dit kan te laat laden of geblokkeerd worden
4. `overflow: hidden` knipt content onzichtbaar af in plaats van te schalen

## Oplossing

De browser-print functie in `ChecklistQRDialog.tsx` volledig herschrijven met een betrouwbare aanpak:

### 1. QR-code als inline SVG in plaats van externe afbeelding
- De QRCodeSVG component genereert al een SVG in de preview - we serialiseren die SVG direct naar de print HTML
- Geen externe API call meer, dus geen laadtijd of blokkade-risico

### 2. Robuustere print CSS
- Gebruik `@page { margin: 0; }` zonder `size` (die wordt vaak genegeerd)
- Instructie aan de gebruiker: selecteer "DYMO 11354" als papierformaat in het printdialoog
- Gebruik mm-gebaseerde afmetingen op de sticker container zelf
- Alle schaling binnen de container houden met `transform: scale()` als fallback

### 3. Compactere layout met veilige marges
- QR-code: 20mm x 20mm (past ruim in 32mm hoogte met marge)
- Tekst rechts naast QR met verkleinde fonts
- 2mm padding rondom als veilige zone
- `display: flex; align-items: center` voor verticale centrering

### 4. Print-instructie in de UI
- Kort bericht toevoegen: "Selecteer papierformaat 'DYMO 11354' en marges 'Geen' in het printvenster"
- Dit helpt de gebruiker de juiste instellingen te kiezen

## Technische wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/ChecklistQRDialog.tsx` | `handleBrowserPrint` herschrijven: SVG inline, betere CSS, print-tip in UI |

## Nieuwe handleBrowserPrint logica (kern)

```text
1. Pak de QRCodeSVG uit de DOM via ref of genereer SVG string direct
2. Bouw print HTML met:
   - @page { margin: 0; }
   - Container: width: 57mm, height: 32mm, display: flex, padding: 2mm
   - QR SVG inline (geen externe img)
   - Tekst met pt-gebaseerde fonts (7pt, 9pt, 5pt)
3. Open print window, schrijf HTML, trigger print na korte delay
```

## Verwacht resultaat

- Sticker print correct op DYMO 11354 labels via de browser
- Geen afhankelijkheid meer van externe QR API
- Gebruiker krijgt duidelijke instructie voor printinstellingen

