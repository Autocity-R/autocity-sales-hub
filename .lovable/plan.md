

# Fix: QR Sticker print - clipping en positionering oplossen

## Analyse van het probleem

Na onderzoek van de huidige code zijn er drie samenhangende problemen:

1. **QR-code wordt afgeknipt**: De QR-code van 26mm zit in een container van 26mm, maar de SVG viewBox past mogelijk niet exact, waardoor randen wegvallen en de code onscanbaar wordt
2. **Content linksboven**: De `body` heeft `display: flex` met centering, maar de `.sticker` div heeft ook `width: 57mm; height: 32mm` -- twee geneste containers met dezelfde afmetingen + flex centering veroorzaakt onvoorspelbaar gedrag
3. **Tekst valt weg ("Mercedes")**: De `.info` div heeft `overflow: hidden` en de tekst met 9pt font is te groot voor de resterende ~25mm breedte

## Oorzaak

Het kernprobleem is dubbele containers: zowel `body` als `.sticker` claimen exact 57x32mm. De browser weet niet welke hij moet gebruiken voor de pagina-layout. Daarnaast knipt `overflow: hidden` op `.info` de tekst af zonder waarschuwing.

## Oplossing

De print-HTML drastisch vereenvoudigen -- geen geneste containers meer, directe layout op body:

### 1. Enkele container (geen wrapper)
- Verwijder de `.sticker` wrapper -- gebruik `body` direct als de layout container
- `body`: width 57mm, height 32mm, padding 2mm, display flex, align-items center

### 2. QR-code verkleinen voor betrouwbaarheid
- QR van **26mm naar 22mm** -- geeft 2mm "lucht" rondom zodat er niets wordt afgeknipt
- Expliciet `padding: 1mm` op de QR container als veiligheidsmarge

### 3. Tekst overflow fix
- `overflow: hidden` verwijderen van `.info`
- Font-sizes iets verkleinen: brand 8pt, plate 10pt
- `word-break: break-all` op brand zodat lange namen als "Mercedes-Benz" wrappen in plaats van verdwijnen

### 4. SVG viewBox veiligstellen
- Na het serialiseren van de SVG, een `viewBox` attribuut forceren zodat de QR altijd volledig rendert
- `preserveAspectRatio="xMidYMid meet"` toevoegen

## Technische wijzigingen

**Bestand:** `src/components/inventory/ChecklistQRDialog.tsx`

Wijzigingen in `handleBrowserPrint`:

```text
HTML structuur:
  <body>  (was: <body><div class="sticker">...</div></body>)
    <div class="qr">SVG</div>
    <div class="info">...</div>
  </body>

CSS:
  body {
    width: 57mm; height: 32mm;
    padding: 2mm;
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  .qr { width: 22mm; height: 22mm; padding: 1mm; }
  .info { overflow: visible; word-break: break-word; }
  .brand { font-size: 8pt; }
  .plate { font-size: 10pt; }
```

SVG post-processing:
- Na serialisatie: regex-replace om `viewBox` te garanderen
- `preserveAspectRatio` toevoegen

## Preview in dialog ook updaten
- QR preview grootte aanpassen zodat het overeenkomt met de print output
- Visueel klopt het dan met wat er daadwerkelijk geprint wordt

## Verwacht resultaat

- QR-code volledig zichtbaar en scanbaar (22mm met 1mm marge)
- Tekst wraps in plaats van wegvallen
- Geen dubbele container-conflicten meer
- Content gecentreerd op het label

