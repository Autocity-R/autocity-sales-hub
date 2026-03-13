

# QR Sticker aanpassen voor Brother QL-1100 (62mm labels)

## Situatie
Je bent overgestapt van DYMO naar een Brother QL-1100 die 62mm brede continuous labels gebruikt. De huidige print layout is geoptimaliseerd voor DYMO 57×32mm. Aangezien Brother geen DYMO Web Service gebruikt, is de "Print via browser" knop het relevante pad.

## Wijzigingen

### 1. `src/components/inventory/ChecklistQRDialog.tsx` — Browser print layout
- **@page size**: `57mm 32mm landscape` → `62mm 40mm` (62mm breed, ~40mm lang — passend voor de content)
- **body**: breedte/hoogte aanpassen naar 62×40mm, padding van 2mm → 3mm voor meer ademruimte
- **QR code**: van 22mm → 30mm (grotere QR, beter scanbaar)
- **Fontsizes opschalen**: brand 8pt→10pt, color 7pt→8pt, plate 10pt→14pt, VIN 6pt→7pt
- **Preview tekst**: "57×32mm" → "62×40mm"
- **Print instructie**: papierformaat aanpassen naar 62mm

### 2. `src/components/inventory/ChecklistQRDialog.tsx` — QR preview
- QRCodeSVG `size` van 76 → 100 zodat de preview overeenkomt met het grotere label
- viewBox in serialisatie aanpassen van `"0 0 76 76"` → `"0 0 100 100"`

### 3. `src/services/dymoService.ts` — Optioneel opruimen
DYMO-specifieke code kan blijven staan (doet niets als er geen DYMO is), maar de DYMO-waarschuwing in de dialog past al: "Geen DYMO printer gevonden" → aanpassen naar generieke tekst "Gebruik 'Print via browser' om te printen" aangezien je nu Brother gebruikt.

### 4. `src/components/inventory/ChecklistQRDialog.tsx` — UI teksten
- DYMO waarschuwing verwijderen/aanpassen: geen verwarrende "Installeer DYMO" melding meer
- Print instructie updaten: "Stel papierformaat in op **62mm** breedte"

