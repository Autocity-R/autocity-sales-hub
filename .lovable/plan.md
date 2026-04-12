

## Analyse: Import Status Update Geblokkeerd

### Root Cause Gevonden

Het probleem zit in de **status hiërarchie** in `sheets-import-webhook/index.ts`. De hiërarchie is:

```text
niet_gestart:        0
niet_aangemeld:      1
aangemeld:           2
aanvraag_ontvangen:  3  ← RDW status
aangekomen:          4  ← Transport status (auto fysiek aangekomen)
goedgekeurd:         5
bpm_betaald:         6
ingeschreven:        7
```

**Het probleem**: `aangekomen` (index 4) staat HOGER dan `aanvraag_ontvangen` (index 3). Maar in werkelijkheid is `aanvraag_ontvangen` een RDW-processtatus die NA de fysieke aankomst (`aangekomen`) plaatsvindt.

Wanneer de Google Sheet een update "Aanvraag ontvangen" stuurt voor een voertuig dat al op `aangekomen` staat, **blokkeert de hiërarchie-check op regel 204** dit als een "downgrade" (3 < 4). De update wordt overgeslagen met "Status downgrade not allowed".

**Bewijs**:
- Beide VINs staan op `import_status: aangekomen`, `import_status_highest: null`
- Er zijn **nul** entries in `vehicle_import_logs` voor deze VINs — de webhook werd nooit succesvol uitgevoerd
- Andere voertuigen die op `niet_gestart` stonden konden WEL naar `goedgekeurd` of `ingeschreven` springen (zie logs van 10 april)

### Oplossing

De status hiërarchie moet worden aangepast zodat `aangekomen` (transport = fysiek hier) LAGER staat dan de RDW-processtappen:

```text
niet_gestart:        0
niet_aangemeld:      1
aangemeld:           2
aangekomen:          3  ← VERLAAGD (transport status)
aanvraag_ontvangen:  4  ← VERHOOGD (RDW proces start)
goedgekeurd:         5
transport_geregeld:  5
onderweg:            5
afgemeld:            5
bpm_betaald:         6
herkeuring:          6
ingeschreven:        7
```

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/sheets-import-webhook/index.ts` | Hiërarchie indices aanpassen: `aangekomen: 3`, `aanvraag_ontvangen: 4`, `goedgekeurd: 5` → `goedgekeurd: 6`, transport statussen → 5, `bpm_betaald: 7`, `herkeuring: 7`, `ingeschreven: 8`. Ook `statusByIndex` updaten. |

### Na deployment

De edge function opnieuw deployen en testen met een curl-call om te verifiëren dat een voertuig met `aangekomen` nu WEL naar `aanvraag_ontvangen` kan worden geüpdatet.

