

## Plan: BPM Huys tab omzetten naar pipeline met 4 kolommen

### Wat verandert

**Bestand**: `src/components/ai-agents/dashboards/BpmHuysTab.tsx` — volledig herschrijven

De huidige 3 gestapelde secties + handmatig formulier worden vervangen door:

**4 kolommen naast elkaar** (grid layout), dezelfde stijl als de Marco Pipeline:

| Kolom | Titel | Conditie | Badge |
|-------|-------|----------|-------|
| Aangemeld | bpmRequested=true, geen `auto_opgenomen` in log | Oranje als >7 dagen |
| Wacht op papieren | `auto_opgenomen` gelogd, geen `papieren_verstuurd` | Actie door ons |
| Papieren verstuurd | `papieren_verstuurd` gelogd, import_status nog niet `aanvraag_ontvangen` | Rood als >3 dagen wachten |
| Factuur | Placeholder — "Binnenkort beschikbaar" | Leeg |

**Basisfilter** (query): alle vehicles met `bpmRequested=true`, `isTradeIn=false`, status niet `verkocht_b2c/verkocht_b2b/afgeleverd`, en `import_status` niet in `aanvraag_ontvangen/goedgekeurd/bpm_betaald/ingeschreven`. Zodra RDW de aanvraag ontvangt verdwijnt de auto automatisch.

**Handmatig formulier** blijft onderaan — meldcode zoeken via `vin.slice(-4)`, type kiezen (Auto opgenomen / Papieren verstuurd), opslaan.

### Layout

Bovenaan: 4 kolom-kaarten met tellingen (klikbaar om detail te tonen)
Daaronder: detail tabel van geselecteerde kolom
Onderaan: handmatig invoer formulier

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/ai-agents/dashboards/BpmHuysTab.tsx` | Herschrijven — pipeline layout |

Edge functions en MarcoDashboard blijven ongewijzigd.

