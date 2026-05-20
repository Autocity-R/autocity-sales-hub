## Robin v8 — Edge function updates

Alle wijzigingen in `supabase/functions/intake-robin-analyse/index.ts`. Prompt staat al live.

### 1. Footer label
`drawCentralFooter` (~regel 1058):
- `Robin v0.5 (proof of concept)` → `Robin v8`

### 2. Schade-blok opschonen (`drawDamage`, ~regel 625)
Detail-tabel volgens v8 spec:
- Locatie, Type schade, Ernst, Zekerheid, Afmeting, (Kosten als geen twijfel), Aanbevolen actie, Prioriteit, Claim potentieel
- Verwijder rijen: "Realism check", "Detectie-methode", "Detectie-bewijs"
- Verwijder "Inspectie methode" sectie volledig
- Vervang `d.detectie_bewijs` door `d.beschrijving || d.detectie_bewijs` (backwards compatible) als korte beschrijving onder de tabel

### 3. Cirkel i.p.v. rechthoek op bbox
- `embedFrame` (~regel 735): vervang `drawRectangle` met 3× `drawEllipse` (gestapelde rode cirkels, padding ×1.15)
- Zelfde aanpassing in `drawZoomCrop` (~regel 768)

### 4. Voertuiggegevens inkorten (`drawVoertuiggegevens`, ~regel 533)
Behoud: Merk/Model, Kenteken, VIN, Bouwjaar, Kilometerstand, Gem. km/jaar
Verwijder: Status in CRM, Inkoopdatum, Inkoopprijs, Kleur, Meldcode (laatste 4 VIN)

### 5. Deploy & test
- Deploy `intake-robin-analyse`
- Test op BMW X5 GVX-49-T (verwacht: 1 zekere schade voorbumper rechts, €300-500, geen claim)
- Test op tweede auto met meerdere kleine schades (geen overrapportage, cirkel op échte schade)
- Verifieer: footer toont "Robin v8", geen ruimte-check/camera-uitleg in beschrijvingen

Niets aan prompt, DB-schema of frontend hoeft te wijzigen.