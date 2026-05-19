## Doel

Robin's rapport opschonen én elke schade visueel verduidelijken met een echte ingezoomde uitsnede van de plek waar de schade zit.

## Probleem in huidige output

1. **Te veel meldingen** — system prompt zegt "MEER detectie dan minder, bij twijfel ALTIJD melden". Resultaat: 33 items op één auto, overzicht weg.
2. **Vuil = kras** — geen instructie om eerst onderscheid te maken tussen vuil/water/stof en echte beschadiging.
3. **Geen twijfel-niveau** — alles wordt als bevestigde schade gerapporteerd, mét kosten, ook als Robin twijfelt.
4. **Detailfoto is niet écht ingezoomd** — `closeup_frame_referentie` pakt nu gewoon een ander volledig videoframe. De inspecteur ziet daardoor geen duidelijke close-up van de schade zelf.

## Plan

### 1. System prompt van Robin herschrijven

In `ai_agents.system_prompt` (record `Robin`):

**a. Filosofie omkeren naar kwaliteit boven kwantiteit**
- Weghalen: "MEER detectie dan minder", "vals alarm kost maar 30 sec".
- Vervangen door: 5 zekere schades > 30 mogelijke. Inspecteur moet erop kunnen vertrouwen.
- Minimum: alleen melden wat duidelijk zichtbaar is op ≥ 2 frames (of 1 frame als expliciet ingezoomd).

**b. Verplichte vuil-check vóór elke kras/lakschade-melding**
Nieuw blok dat Robin dwingt om eerst te onderscheiden:
- **Vuil/water/stof** — vlekkig, onregelmatig, druppel-/veegpatroon, loopt over panelen, verandert per frame.
- **Echte kras** — scherpe lijn, zelfde plek in meerdere frames, blijft staan ongeacht hoek.
- **Echte lakschade** — scherp afgebakende vlek, geen veegpatroon.

Als de auto duidelijk vuil is (vermeld in `auto_conditie`): drempel voor kras/lak omhoog → alleen bij overduidelijke gevallen.

**c. Drie zekerheidsniveaus**
Verplicht veld `confidence`: `zeker` / `waarschijnlijk` / `twijfel`.
- `zeker` + `waarschijnlijk` → in hoofdtabel, met kosten.
- `twijfel` → aparte sectie "Nader onderzoek aanbevolen", géén kostencalculatie, met expliciete reden ("kan vuil zijn, afspoelen en herbeoordelen").

**d. Bounding box verplicht voor visuele verduidelijking** (zie stap 4)
Robin moet per schade `bbox` teruggeven: `{ x, y, w, h }` als percentages 0-1 op het gekozen frame, die het schadegebied strak omsluit (met ~10% padding). Plus `closeup_caption` die kort uitlegt wat je in de uitsnede ziet (bijv. "lichte kras 4 cm, schuin naar onderen, op deurpaneel").

### 2. Edge function: confidence verwerken

`supabase/functions/intake-robin-analyse/index.ts`:
- `intake_damages` insert uitbreiden met `confidence`.
- Items met `confidence='twijfel'` krijgen geen kostenberekening.
- `schade_count` / `totale_kosten_min|max` tellen alleen `zeker` + `waarschijnlijk`.

### 3. Database

Migratie: kolom `confidence` (text, default `'zeker'`) op `intake_damages`.

### 4. Echte zoom-crop in de PDF (visuele verduidelijking)

In de PDF-renderer (`drawDamage` in dezelfde edge function):

- Na het tonen van de overzichtsfoto: pak het frame waarop de schade zit, lees Robin's `bbox`, en **crop dat gebied programmatisch** met `pdf-lib` + een image-crop helper (we tekenen de originele JPEG in een gekromd vlak met geschaalde coördinaten — geen externe library nodig).
- Render de uitsnede minimaal 2-3× zo groot als hij op het oorspronkelijke frame stond, met een rode rechthoek-overlay op de overzichtsfoto die exact aangeeft welke regio is uitgezoomd.
- Voeg `closeup_caption` eronder als bijschrift.
- Fallback: als `bbox` ontbreekt of ongeldig is, val terug op de huidige `closeup_frame_referentie` (gedrag van nu).

Resultaat per schade:
```
[Overzichtsfoto met rood kader om schadegebied]
[Grote uitvergrote crop van datzelfde kader]
Bijschrift: wat je in de uitsnede ziet
```

### 5. PDF herstructureren — overzicht terug

Bovenaan een **samenvatting**: aantal zeker / waarschijnlijk / twijfel + totale geschatte kosten (alleen zeker+waarschijnlijk).
Daarna **sectie "Bevestigde schades"** (zeker + waarschijnlijk) — hoofdtabel met de nieuwe zoom-crops.
Daarna **sectie "Nader onderzoek aanbevolen"** (twijfel) — kleinere foto's, geen kostenkolom, met reden van twijfel.

## Technisch overzicht

| Wijziging | Waar |
|---|---|
| Prompt herschrijven (filosofie, vuil-check, confidence, bbox) | `ai_agents` tabel record Robin |
| `confidence` kolom toevoegen | migratie op `intake_damages` |
| Confidence opslaan + summary filteren | `intake-robin-analyse/index.ts` (insert + summary) |
| Bbox-crop + rood overlay-kader in PDF | `intake-robin-analyse/index.ts` (PDF gedeelte, `drawDamage` + `embedFrame`) |
| PDF in 2 secties met samenvatting | zelfde file |

Niets aan video-extractie of UI-list verandert — dit gaat over inhoud, betrouwbaarheid en visualisatie van het rapport.

## Verwacht resultaat

- Hoofdtabel: ~5-10 items i.p.v. 33 — alleen wat er echt toe doet.
- Vuile auto: dramatisch minder valse kras-meldingen; verdachte plekken in "nader onderzoek".
- Per schade een grote, scherpe zoom-crop met rood kader op de overzichtsfoto → inspecteur ziet meteen wáár en wát.
- Bovenaan in één oogopslag: "4 bevestigd, 6 nader onderzoek, geschatte kosten € X".
