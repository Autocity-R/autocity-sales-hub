## Robin AI Inname Inspector — Implementatieplan (v2, akkoord met aanvullingen)

Status: scope vastgesteld. Wacht op `Robin_Inname_Rapport_Tiguan_v5.pdf` als layout-referentie, dan start migratie.

### MVP scope (fase 1 — morgen testbaar)

1. **Database migratie**: `intake_inspections` + `intake_damages` + 3 storage buckets (`intake-videos`, `intake-frames`, `intake-reports`, privé) met RLS `authenticated`. Robin row in `ai_agents`.
2. **FileCategory uitbreiding**: `"inname_rapport"` toevoegen aan `src/types/inventory.ts`.
3. **FilesTab integratie**: nieuwe sectie bovenaan "🤖 Robin Inname Inspectie" met:
   - lijst bestaande inspecties (datum, categorie, schade-count, kosten-range, claim-indicator, PDF-link)
   - grote knop "Nieuwe inname inspectie starten" → opent `IntakeInspectionDialog`
4. **`IntakeInspectionDialog`**:
   - inputs: bouwjaar + km-stand
   - `<input type=file accept="video/*" capture="environment">` → opent direct camera op telefoon
   - korte instructie-tekst: *"Loop langzaam rondom de auto (30-90 sec). Begin voorzijde, ga naar rechts, achter, links. Maak korte stops bij elk paneel. Film ook close-up van velgen en dashboard met km-stand zichtbaar."*
   - client-side frame extractie via `<video>` + `<canvas>` (helper `videoFrameExtractor.ts`)
   - frame-cap: `targetFrames = min(60, floor(videoDuration * 2))`, evenredig over video verdeeld
   - upload frames naar `intake-frames/{inspection_id}/frame_001.jpg` … met progress
   - insert `intake_inspections` row → invoke `intake-robin-analyse` edge function
   - realtime subscribe op die row → live status `analyzing → generating_pdf → completed`
5. **Edge function `intake-robin-analyse`** (één function, doet analyse + PDF):
   - input: `{ inspection_id }`
   - haalt voertuig op (year, mileage) → bepaalt categorie A/B/C
   - download alle frames → base64 → Anthropic vision call (`claude-sonnet-4-20250514`, max_tokens 8000, max 60 images per call)
   - system prompt = volledige Robin prompt incl. **expliciete eis: `frame_referentie` per schade in formaat `frame_023`**
   - parse JSON via `parseClaudeResponse`
   - schrijf naar `intake_inspections` + `intake_damages`
   - **PDF generatie met pdf-lib** volgens Tiguan v5 layout (zie sectie hieronder)
   - upload naar `intake-reports/{inspection_id}.pdf`
   - insert in `vehicle_files` met `category='inname_rapport'` → verschijnt automatisch in Documenten tab
   - update `status='completed'`
6. **Robin in `ai_agents`** registreren (chat-case in `hendrik-ai-chat` = fase 2).

### PDF layout (Tiguan v5 als template)

4 pagina's, pdf-lib + standaard fonts + embedded JPEGs:

- **Pagina 1 — Cover**: Auto City logo, donkerblauw header bar `#1F3864`, voertuiggegevens-tabel (merk/model/bouwjaar/km/categorie) met gele highlight `#FFF3CD` op bouwjaar/km/km-per-jaar rijen, samenvatting_team in geel highlight-vak.
- **Pagina 2 — Schade detail**: per schade een blok met:
  - kop (locatie + type + ernst)
  - **embedded frame screenshot** uit `intake-frames/{inspection_id}/frame_XXX.jpg` op basis van `frame_referentie` (volledig frame, geen crop in MVP)
  - tabel: afmeting, aanbevolen actie, kosten-range, prioriteit
  - redenering-tekst
- **Pagina 3 — Inspectie overzicht**: alle onderdelen-tabel (OK / SCHADE / NIET_ZICHTBAAR) + reparatie-ladder met groene/gele highlights op aanbevolen acties.
- **Pagina 4 — Claim + kosten**: showroom_plan (totale kosten min-max, doorlooptijd, planning per discipline) + claim_advies blok.

Kleuren: donkerblauw `#1F3864` (headers), geel `#FFF3CD` (highlights), groen `#D4EDDA` / geel `#FFF3CD` (acties tabel).

### Robin system prompt — toevoeging

Aan het bestaande prompt-blok (uit jouw briefing) één regel toevoegen in OUTPUT FORMAT:

> `"frame_referentie": string` — verplicht, formaat exact `frame_001` t/m `frame_060`, verwijzend naar het meest representatieve frame waar deze schade het duidelijkst zichtbaar is. Eén frame per schade.

### Technische beslissingen (recap)

| Onderwerp | Keuze |
|---|---|
| Frame extractie | Client-side (canvas), max 60, evenredig verdeeld |
| Edge functions | Eén: `intake-robin-analyse` (analyse + PDF) |
| AI model | `claude-sonnet-4-20250514`, max_tokens 8000 |
| JSON parsing | `parseClaudeResponse` (bestaand helper) |
| PDF library | `pdf-lib` via `npm:pdf-lib` (Deno-vriendelijk) |
| DB writes in edge | `service_role` client (cron-pattern) |
| Camera trigger | `<input accept="video/*" capture="environment">` |
| Status updates | Supabase realtime op `intake_inspections` |
| Frame-foto's in PDF | Volledig frame via `frame_referentie`, geen crop |

### Fase 2 (na succesvolle test)

- Robin chat-case in `hendrik-ai-chat` met 5 tools (`get_recent_inspections`, `get_inspection_by_vehicle`, `get_inspection_details`, `search_damages`, `get_robin_memory`).
- Agent memory koppeling (zelfde patroon als Sara/Alex).
- Close-up crops per schade in PDF (Sharp/Canvas in edge).
- Taxatie PDF discrepancy check (taxatie_pdf_url upload + parsing).

### Bestanden die aangemaakt/gewijzigd worden

**Nieuw:**
- `supabase/functions/intake-robin-analyse/index.ts`
- `src/components/inventory/intake/IntakeInspectionDialog.tsx`
- `src/components/inventory/intake/IntakeInspectionList.tsx`
- `src/utils/videoFrameExtractor.ts`
- `src/hooks/useIntakeInspections.ts`

**Gewijzigd:**
- `src/types/inventory.ts` — `FileCategory` += `"inname_rapport"`
- `src/components/inventory/detail-tabs/FilesTab.tsx` — Robin sectie bovenaan

**Migratie:**
- 2 tabellen + RLS + 3 buckets + bucket-policies + Robin agent insert

### Volgorde

1. **Wacht op Tiguan v5 PDF** (jij stuurt deze)
2. Migratie uitvoeren (vraagt jouw goedkeuring)
3. Edge function `intake-robin-analyse` met pdf-lib renderer
4. Frame extractor + dialog + lijst
5. FilesTab integratie
6. Smoke test met 1 echte auto

Klaar om te starten zodra ik de v5 PDF heb. Stuur die en ik trigger de migratie.