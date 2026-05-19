## Diagnose

De BMW X5 `GVX-49-T` heeft nu een inspectie die al ~30 minuten op `analyzing` staat:

- `id`: `17d251a3-11c5-4e17-a9fa-7e7356b479de`
- `status`: `analyzing`
- `frames_extracted`: `60`
- `error_message`: leeg
- er zijn nog geen `intake_damages` opgeslagen

Dit wijst niet op een normale analyse die nog bezig is, maar op een edge function die doorloopt/afbreekt zonder dat de database naar `failed` wordt gezet. In echte scenario’s is dit niet betrouwbaar genoeg.

Belangrijkste oorzaken die ik zie:

1. De frontend roept de edge function aan en wacht indirect op een lange AI/PDF-run. Als Supabase/Anthropic timeout of platform-kill optreedt, blijft de DB-status hangen op `analyzing`.
2. De edge function heeft geen eigen timeouts rondom Anthropic, frame-downloads en PDF-generatie.
3. Er is geen watchdog die oude `analyzing`/`generating_pdf` records automatisch als `failed` markeert.
4. `supabase/config.toml` bevat nog geen expliciete entry voor `intake-robin-analyse`, waardoor deployment/config minder duidelijk is dan bij de andere functies.
5. De UI toont `analyzing` oneindig; er is geen “duurt te lang / opnieuw proberen” toestand.

## Plan

### 1. Edge function echt asynchroon maken

Pas `supabase/functions/intake-robin-analyse/index.ts` aan zodat de HTTP-call direct terugkomt met `202 Accepted` zodra de analyse is gestart.

Daarna loopt de zware verwerking in `EdgeRuntime.waitUntil(...)`:

```text
request binnen
  validate inspection_id
  zet status = analyzing
  start processInspection(...) via EdgeRuntime.waitUntil
  return 202 direct naar frontend

background processInspection
  frames laden
  Anthropic analyse
  JSON parsen/herstellen
  damages opslaan
  PDF maken
  status completed of failed zetten
```

Hierdoor krijgt de frontend niet meer een 500/timeout op de invoke terwijl de verwerking nog bezig is.

### 2. Harde timeouts en duidelijke foutstatussen toevoegen

Voeg interne timeouts toe voor risicostappen:

- Anthropic-call: bijvoorbeeld 180 seconden
- frame-download verwerking: fail-fast bij storage-problemen
- PDF-generatie/upload: fout netjes wegschrijven

Als een stap faalt, wordt altijd dit gezet:

```text
status = failed
error_message = duidelijke korte oorzaak
```

Geen stille `analyzing` meer.

### 3. Watchdog tegen hangende inspecties

Voeg bij start van de edge function een cleanup toe voor oude lopende inspecties:

```text
status in ('analyzing', 'generating_pdf')
created_at ouder dan 20 minuten
=> failed met error_message = 'Analyse timeout — opnieuw proberen'
```

Dit voorkomt dat oude inspecties permanent blijven spinnen.

### 4. BMW X5 huidige vastloper resetten

Na de codewijziging reset ik de huidige BMW X5 inspectie:

```text
17d251a3-11c5-4e17-a9fa-7e7356b479de
analyzing -> failed
error_message -> Analyse timeout — opnieuw proberen
```

Daarna kun je opnieuw starten, of ik kan dezelfde bestaande frames opnieuw laten analyseren als de edge function klaar staat.

### 5. Config expliciet maken

Voeg aan `supabase/config.toml` toe:

```toml
[functions.intake-robin-analyse]
verify_jwt = false
```

Dit sluit aan bij de rest van jullie functies en voorkomt onduidelijkheid rond function-config.

### 6. UI betrouwbaarder maken

In de intake-lijst:

- Toon een inspectie die langer dan 20 minuten op `analyzing`/`generating_pdf` staat als “Vastgelopen”.
- Toon de foutmelding zodra `failed` wordt gezet.
- Optioneel: voeg een knop “Opnieuw proberen” toe bij failed/hangende inspecties, die dezelfde `inspection_id` opnieuw naar de edge function stuurt.

## Resultaat

Na implementatie is de Robin-flow testbaar in een realistisch scenario:

- de upload stopt niet stil;
- de UI blijft niet oneindig laden;
- timeouts worden zichtbaar;
- mislukte analyses kunnen opnieuw gestart worden;
- succesvolle analyses lopen door tot PDF/document zonder dat de browser-call hoeft open te blijven.