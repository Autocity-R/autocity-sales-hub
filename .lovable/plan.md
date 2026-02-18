

# QR Sticker vergroten en centreren

## Probleem

De QR-code en tekst zijn te klein om te scannen/lezen. De QR-code staat linksboven in een hoek in plaats van gecentreerd, wat erop wijst dat de content niet de volledige labelruimte benut.

## Oplossing

De print-layout aanpassen in `ChecklistQRDialog.tsx`:

### 1. QR-code vergroten
- Van **20mm x 20mm** naar **26mm x 26mm** -- bijna de volledige hoogte van het label (32mm minus 2x 2mm padding = 28mm)
- Dit maakt de QR-code veel beter scanbaar

### 2. Tekst vergroten
- Merk/Model: van 7pt naar **9pt**
- Kenteken: van 9pt naar **12pt**
- Kleur: van 6pt naar **7pt**
- VIN: van 5pt naar **6pt**

### 3. Verticale centrering forceren
- `align-items: center` en `justify-content: center` toevoegen aan body voor print
- `margin: auto` op de sticker container zodat deze gecentreerd wordt op het label, niet linksboven

### 4. Overflow verwijderen
- `overflow: hidden` verwijderen van html/body -- dit kan de QR-code afsnijden

## Technisch

**Bestand:** `src/components/inventory/ChecklistQRDialog.tsx`

Wijzigingen in de `handleBrowserPrint` CSS:
- `.qr` en `.qr svg`: width/height naar 26mm
- Font-sizes verhogen
- Body: `display: flex; justify-content: center; align-items: center` ook voor print
- `overflow: hidden` verwijderen van html/body

