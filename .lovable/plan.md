# Wat er gebeurt met de BMW X5

Ik heb het in de database en logs nagekeken:

- Status van de inspectie staat sinds 6 minuten op `analyzing` zonder error.
- Edge function log toont alleen: `accept` → `start` → `60 frames` → `calling Anthropic with 60 images`.
- **Daarna helemaal niets meer** — geen "analysis OK", geen timeout, geen error.

Conclusie: de background-taak (`EdgeRuntime.waitUntil`) is stilletjes gestopt na het versturen van 60 base64-frames (~30-50 MB request body) naar Anthropic. De Supabase edge worker krijgt na het 202-antwoord geen garantie meer dat hij blijft leven; bij grote payloads + lange Anthropic-call wordt de worker geforceerd afgesloten zonder dat onze `catch` triggert. Daardoor zien jij én de UI niets gebeuren.

De UI heeft realtime aan staan (gecontroleerd in publicatie), dus zodra de status verandert ziet jij het direct — alleen verandert hij dus nooit als de worker afsterft.

# Plan

## 1. Live voortgang in de UI

Voeg een kolom `progress_text` (text) en `progress_updated_at` (timestamptz) toe aan `intake_inspections`. De edge function schrijft na elke fase een korte status:
- "Frames downloaden (12/60)"
- "Robin analyseert frames…"
- "Schades opslaan"
- "PDF genereren"

`IntakeInspectionList` toont deze tekst + verstreken tijd ("3 min 12 s") onder de badge. Zo zie jij meteen waar Robin staat.

## 2. Watchdog op `progress_updated_at` i.p.v. `created_at`

Probleem nu: een retry reset de leeftijd niet, en de watchdog draait alleen wanneer iemand toevallig een nieuwe inspectie start. Oplossing:
- Watchdog binnen edge function vergelijkt `progress_updated_at` (laatste levensteken) met "ouder dan 10 min" → mark `failed` met duidelijke reden.
- Daarbovenop een Postgres cron job (elke 5 min) die hetzelfde doet, zodat het ook zonder nieuwe invoke gebeurt. Dan blijft de UI nooit eeuwig op "Robin analyseert" staan.

## 3. Robuustere Anthropic-call

- Cap frames op **30** (was 60). De videoframe-extractor neemt evenwichtig samples; 30 is ruim genoeg voor een schadeanalyse en halveert de payload + responstijd.
- Wrap de fetch in een extra try/catch dat ook generieke network-errors logt en de status meteen op `failed` zet met de echte foutboodschap.
- Schrijf vlak vóór en vlak ná de Anthropic-call een `progress_text` update, zodat we in toekomst direct zien of het in de call zelf hangt.

## 4. Reset BMW X5 en testen

Na de migratie zet ik de huidige BMW X5 op `failed` met boodschap "Worker afgebroken — opnieuw proberen". Dan kan jij in de UI op "Opnieuw" klikken en zie je live de voortgang. Met 30 frames i.p.v. 60 verwacht ik dat hij binnen 60-90 sec klaar is.

## Technische details

| Verandering | Bestand |
|---|---|
| Migratie: `progress_text`, `progress_updated_at` toevoegen | nieuwe migration |
| Helper `updateProgress(supabase, id, text)` + 5 oproepen | `supabase/functions/intake-robin-analyse/index.ts` |
| Frame-cap op 30 + extra try/catch rond `fetch` | idem |
| Watchdog op `progress_updated_at` | idem |
| Postgres cron job (pg_cron) die `intake-robin-watchdog` aanroept | migration + nieuwe edge function `intake-robin-watchdog` |
| UI: toon `progress_text` + elapsed timer, refresh elke 10 s als fallback | `IntakeInspectionList.tsx`, `useIntakeInspections.ts` |
| Reset BMW X5 inspectie naar `failed` | migration |

Geen wijziging in de video-upload of frame-extractie zelf — die werkt prima (60 frames staan keurig in storage).
