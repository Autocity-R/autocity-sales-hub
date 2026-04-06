

## Lisa Afleverplanner — Dashboard + Chat Tools

### Wat er gebouwd wordt

**2 bestanden:**
1. `src/components/ai-agents/dashboards/LisaDashboard.tsx` — volledig herschrijven
2. `supabase/functions/hendrik-ai-chat/index.ts` — Lisa tools + handler toevoegen

---

### 1. Lisa Dashboard (herschrijven)

Het huidige dashboard toont 3 simpele KPI-kaartjes. Wordt vervangen door een operationeel planningsdashboard met de prioriteitenmatrix.

**Data query:** Alle `verkocht_b2c` voertuigen + appointments type `aflevering` + profiles voor verkopersnamen.

**Checklist parsing:** Per voertuig wordt `details->preDeliveryChecklist` uitgelezen. Elke item heeft een `description` (bijv. "Onderhoudsbeurt", "APK keuren", "Deukje herstellen") en `completed` boolean. Lisa's dashboard toont de concrete beschrijvingen, niet alleen aantallen.

**Layout:**

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 🔴 Rode Zone │ 🟢 Quick Win │ 🟡 Bel Klant │ 📅 Aflevering│
│ >14d wacht   │ Snel klaar   │ Klaar, geen  │ Vandaag: X   │
│ X auto's     │ X auto's     │ afspraak: X  │ Week: X      │
└──────────────┴──────────────┴──────────────┴──────────────┘

Per sectie uitklapbaar:
🔴 BMW X3 (6458) — 2 dagen — 0/5 checklist — aangekomen
   Te doen: Onderhoudsbeurt, APK keuren, Deukje herstellen,
            Afdekkapje achter ruitenwisser, Kapje handgreep
   → Veel werk, niet snel klaar

🟢 BMW X1 (KFJ-83-G) — 10 dagen — 0/1 checklist — ingeschreven
   Te doen: klaar
   → Quick win, morgen afleverbaar

🟡 Nissan Qashqai (JXL-39-T) — 16 dagen — 4/4 ✅ — ingeschreven
   Verkoper: Mario → Bellen voor afspraak
```

**Categorisatie-logica:**
- Rode Zone: `sold_date` > 14 dagen geleden
- Quick Wins: `import_status = 'ingeschreven'` + checklist max 3 open items met eenvoudig werk (beurt/APK/schoonmaken/opladen)
- Vergeten Klanten: checklist 100% afgevinkt + ingeschreven + geen afleverafspraak
- Werk in Uitvoering: overige verkocht_b2c

Elke auto toont de concrete checklist beschrijvingen zodat je ziet wat er moet gebeuren en hoe complex het is.

---

### 2. Lisa Chat Tools (hendrik-ai-chat)

Toevoegen aan `index.ts` (zelfde patroon als Marco):

**Detectie:**
```typescript
const isLisaAgent = agentName.toLowerCase().includes('lisa') ||
                    agentCapabilities.includes('delivery-planning');
```

**`getLisaTools()` — 6 tools:**

| Tool | Beschrijving | Wat het retourneert |
|------|-------------|---------------------|
| `get_daily_planning` | "Dagplanning voor werkplaats/aftersales. Bij 'planning vandaag', 'wat doen we vandaag'." | Alle verkocht_b2c per prioriteit, met per auto de concrete checklist items (beschrijvingen) |
| `get_red_zone` | "Auto's waar klant >14 dagen wacht." | Gesorteerd op dagen, met checklist beschrijvingen |
| `get_quick_wins` | "Auto's die snel klaar kunnen: ingeschreven + korte/eenvoudige checklist." | Met per item wat er precies moet |
| `get_forgotten_customers` | "Klaar maar geen afleverafspraak." | Met verkoper naam |
| `get_delivery_appointments` | "Afleverafspraken vandaag/week." | Uit appointments tabel |
| `get_vehicle_delivery_status` | "Status van een specifiek voertuig." | Checklist items + status per item + wie het heeft afgevinkt |

**Cruciaal — checklist context per tool:**

Elk tool retourneert per voertuig niet alleen "3/5 checklist" maar de concrete beschrijvingen:

```json
{
  "brand": "BMW",
  "model": "X3 xDrive 30e M Sport",
  "license": "6458",
  "days_waiting": 2,
  "import_status": "aangekomen",
  "salesperson": "Mario",
  "checklist_total": 5,
  "checklist_done": 0,
  "checklist_open_items": [
    "Onderhoudsbeurt uitvoeren",
    "APK keuren",
    "Afdenkkapje handgreep links voor plaatsen",
    "Restyle deukje linker achter scherm herstellen",
    "Afdekkapje achter ruitenwisser plaatsen"
  ],
  "checklist_done_items": [],
  "complexity": "hoog",
  "can_deliver": false,
  "blocker": "niet ingeschreven + 5 open items"
}
```

**Complexity redenering** — Lisa begrijpt wat elk punt inhoudt:
- "Beurt", "APK", "Opladen", "Volle tank", "Schoonmaken" → snel/eenvoudig
- "Uitdeuken", "Spotrepair", "Herstellen", "Onderdelen bestellen" → kost meer tijd
- "SOH check", "Draadloos laden checken" → technisch maar kort

De tool classificeert per auto:
- `laag` = alleen eenvoudige items (beurt, APK, tank, schoonmaken)
- `middel` = mix van eenvoudig en complex
- `hoog` = meerdere complexe items (uitdeuken, spuitwerk, onderdelen)

Dit geeft Lisa de context om te zeggen: "De Kia EV6 heeft 1 checklist punt maar dat punt bevat 6 taken waaronder uitdeuken en spotrepair — dat is niet snel klaar."

---

### 3. Live data context voor Lisa

In `buildLiveDataContext()` een Lisa-sectie toevoegen met compacte afleversamenvatting:
- Rode zone count
- Quick wins count
- Vergeten klanten count
- Afleveringen vandaag/week

---

### Technisch overzicht

| Wijziging | Bestand | Impact |
|-----------|---------|--------|
| Dashboard herschrijven | `LisaDashboard.tsx` | Prioriteitenmatrix met checklist beschrijvingen |
| Lisa detectie + tools | `hendrik-ai-chat/index.ts` | `isLisaAgent`, `getLisaTools()`, `handleLisaToolCall()` |
| Tool handler | `hendrik-ai-chat/index.ts` | 6 tools met checklist context en complexity scoring |
| Live data context | `hendrik-ai-chat/index.ts` | Lisa-specifieke samenvatting in buildLiveDataContext |

### Resultaat
- Dashboard toont direct wat er per auto moet gebeuren (concrete taken, niet alleen aantallen)
- Lisa in chat begrijpt "1 checklist punt met 6 taken" vs "3 simpele punten"
- "Maak een planning voor vandaag" → gestructureerde werklijst met concrete taken per auto
- "Welke auto kan snel weg?" → quick wins met uitleg waarom ze snel klaar zijn
- "Wie moet gebeld worden?" → vergeten klanten met verkoper naam

