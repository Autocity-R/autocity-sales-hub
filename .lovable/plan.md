

# Plan: QR Sticker optimaliseren voor DYMO 11354 (57x32mm)

## Probleem

De browser print gebruikt `@page { size: 101mm 54mm }` — meer dan 3x te groot voor jouw 11354 labels (57x32mm). Alle tekst en de QR code vallen buiten het printgebied.

## Nieuw sticker design (57x32mm)

```text
┌─────────────────────────────────────────┐
│ ┌─────────┐  VW Golf                   │
│ │ QR CODE │  Zwart                     │
│ │ 18x18mm │  XX-123-YY                 │
│ └─────────┘  VIN: WVWZZZ..456          │
└─────────────────────────────────────────┘
        57mm x 32mm
```

Alles wordt veel compacter:
- QR code: 18x18mm (nog steeds scanbaar)
- Tekst: 6-8pt
- Kenteken: 8pt bold (geen border/kader, past niet)
- Minimale padding (2mm)

## Wijzigingen

### 1. Browser print CSS aanpassen (`ChecklistQRDialog.tsx`)

De `handleBrowserPrint` functie krijgt een compleet nieuw CSS-blok:

```css
@page { size: 57mm 32mm; margin: 0; }
body {
  margin: 0; padding: 2mm;
  font-family: Arial, sans-serif;
  display: flex; gap: 2mm;
  align-items: center;
  width: 57mm; height: 32mm;
  overflow: hidden;
}
.qr img { width: 18mm; height: 18mm; }
.brand { font-size: 7pt; font-weight: bold; }
.color { font-size: 6pt; color: #555; }
.plate { font-size: 8pt; font-weight: bold; }
.vin { font-size: 5pt; color: #777; }
```

### 2. DYMO label formaten updaten (`dymoService.ts`)

- Toevoegen: **11354 (57x32mm)** als standaard formaat
- Dit formaat als default instellen
- XML template aanpassen met juiste bounds voor dit kleine label

### 3. Preview in dialog aanpassen (`ChecklistQRDialog.tsx`)

De sticker preview in de dialog wordt verkleind zodat het overeenkomt met hoe het er op de echte sticker uitziet — kleine QR, compacte tekst.

## Bestanden die wijzigen

| Bestand | Wat |
|---------|-----|
| `src/components/inventory/ChecklistQRDialog.tsx` | Browser print CSS naar 57x32mm, preview compacter |
| `src/services/dymoService.ts` | 11354 label formaat toevoegen als default |

## Resultaat

- Sticker past perfect op 57x32mm DYMO 11354 labels
- QR code is 18x18mm (scanbaar met telefoon)
- Merk, model, kleur, kenteken en VIN staan er compact op
- Werkt via de standaard browser print dialoog met DYMO geselecteerd

