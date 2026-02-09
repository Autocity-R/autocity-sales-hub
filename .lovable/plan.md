

# QR Sticker groter en gecentreerd maken

## Probleem

De huidige sticker-inhoud is klein en staat linksboven in plaats van gecentreerd op het 57x32mm label.

## Wijzigingen in `src/components/inventory/ChecklistQRDialog.tsx`

### Browser Print CSS aanpassen in `handleBrowserPrint`:

- **Centreren**: `justify-content: center` en `align-items: center` toevoegen aan body
- **QR code groter**: van 18mm naar 22mm
- **Tekst groter**: brand van 7pt naar 8pt, plate van 8pt naar 10pt, color van 6pt naar 7pt, VIN van 5pt naar 6pt
- **Padding**: van 2mm naar 1.5mm (meer ruimte voor content)

### Preview in dialog aanpassen:

- QR code `size` van 64 naar 76
- Tekst iets groter in de preview

## Resultaat

Label-inhoud vult het sticker-oppervlak beter en staat gecentreerd.

