

## Lisa Dagplanning — Professionele Excel Layout Implementatie

### Probleem
De huidige `lisa-dagplanning/index.ts` genereert een kale Excel zonder styling (geen kleuren, geen secties, geen badges). Claude heeft een exacte layout specificatie gemaakt met kleuren, sectie-headers, werklast badges en afwisselende rij-achtergronden.

### Technische uitdaging
`npm:xlsx` (SheetJS community) ondersteunt geen cell styling. We moeten overstappen naar `xlsx-js-style` (een fork met volledige style support) die beschikbaar is via `npm:xlsx-js-style` in Deno.

### Wat er verandert

**1 bestand:** `supabase/functions/lisa-dagplanning/index.ts` — volledig herschrijven

### Aanpak

**Import wijziging:**
```typescript
import XLSX from "npm:xlsx-js-style";
```

**Styling systeem:** Alle kleuren exact zoals gespecificeerd (DARK_NAVY `1F3864`, ROOD_H `C00000`, etc.). Helper functies voor:
- `makeTitle(text)` — rij 1, merged, 14pt bold wit op navy
- `makeSubtitle(text)` — rij 2, italic 9pt grijs
- `makeSpacer()` — 6px hoog, lichtgrijs
- `makeSectionHeader(text, color)` — merged, 11pt bold wit op sectie-kleur
- `makeColumnHeaders(cols, color)` — 9pt bold wit, gecentreerd
- `makeDataRow(data, bgColor, altColor, index)` — afwisselend gekleurd

**Tab 1 "🔧 Werkplaats" (7 kolommen):**
- Sectie 1: Afleveringen morgen (groen) — appointments voor morgen
- Sectie 2: Rode zone (rood) — >14 dagen, gesorteerd op dagen DESC
- Sectie 3: Kenteken OK + checklist open (groen)
- Werklast badge met emoji + tijdsinschatting
- Open werk als bullet list (`• taak1\n• taak2`)
- Dagen wacht kleurcodering (rood >14d, oranje 7-14d)

**Tab 2 "📞 Verkopers Bellen" (6 kolommen):**
- Oranje styling
- Urgentie-logica: >14 dagen = "URGENT — bel vandaag nog!" in rood bold

**Tab 3 "🔵 Werk in Uitvoering" (6 kolommen):**
- Blauwe styling
- Import status labels (bijv. "Aangekomen (Marco)")

**Tab 4 "📊 Overzicht" (4 kolommen):**
- Per categorie een rij met eigen achtergrondkleur
- Totaalrij onderaan in grijs

**Werklast classificatie verbeterd:**
```
Zwaar keywords: spuit, inlak, lakschade, beschadig, uitdeuk, spotrepair, restyle, distributieriem
→ "🔴 Zwaar\n~halve dag+"

Normaal keywords: apk, beurt, banden, camera, trekhaak
→ "🟡 Normaal\n~X uur"

Rest → "⚡ Snel\n~30 min"
```

**Excel opmaak details:**
- Font: Calibri overal
- Borders: thin #BFBFBF op alle cellen
- Freeze panes: rij 1-3 vast (A4)
- Gridlines: uit
- Wrap text aan op alle data cellen
- Row heights: titel 36px, data 52-65px

**Data logica blijft hetzelfde** — alleen de presentatie wordt professioneel. Dezelfde queries, dezelfde categorisatie, dezelfde storage upload + signed URL.

### Resultaat
Elke dag om 08:00 een professionele, kleurgecodeerde Excel die je kunt uitprinten en op het whiteboard hangen in de werkplaats.

