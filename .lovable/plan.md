

# Fix: Sticker draaien naar liggend (landscape)

## Probleem

De sticker wordt staand (portrait) geprint waardoor de inhoud over 2 stickers verdeeld wordt. De 57x32mm sticker moet liggend (landscape) geprint worden zodat alles op 1 label past.

## Oplossing

Twee wijzigingen nodig:

### 1. Browser Print CSS (`ChecklistQRDialog.tsx`)

In de `handleBrowserPrint` functie de `@page` richting omdraaien en landscape forceren:

```css
@page { size: 57mm 32mm landscape; margin: 0; }
```

Daarnaast een extra print-specifieke landscape hint toevoegen:

```css
@media print {
  html { width: 57mm; height: 32mm; }
}
```

### 2. DYMO XML Template (`dymoService.ts`)

De `PaperOrientation` staat al op `Landscape`, maar voor de zekerheid controleren dat dit correct is en dat de width/height van het label in de XML kloppen voor landscape orientatie.

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/inventory/ChecklistQRDialog.tsx` | `@page` size landscape toevoegen, body dimensies aanpassen |
| `src/services/dymoService.ts` | Width/height waarden controleren voor landscape orientatie |

## Resultaat

Sticker print liggend op 1 enkele DYMO 11354 label met QR links en tekst rechts.

