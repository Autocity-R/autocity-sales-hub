

## Test Emails met Echte Data naar hendrik@auto-city.nl

### Wat er moet gebeuren
Beide edge functions (`lisa-dagplanning` en `lisa-email-checklist-reminder`) triggeren met de echte database data, maar **alle emails tijdelijk naar hendrik@auto-city.nl** sturen in plaats van naar Lloyd en de verkopers. Na de test de code terugzetten.

### Huidige echte data (uit database)
- **20+ verkocht_b2c voertuigen** met echte kentekens, merken, verkopers
- **6 auto's zonder checklist** (BYD Seal U, Audi Q4, Hyundai Ioniq 5, Skoda Enyaq, VW ID.4 77kWh Pro, VW ID.4 77kWh Business) — allen van Daan Leyte
- **Verkopers**: Daan Leyte, Martijn Zuyderhoudt, Mario Kroon, Hendrik (jij)

### Stappen

**Stap 1: Tijdelijke test-override in `lisa-dagplanning/index.ts`**
- Regel 544: `to: ["lloyd@auto-city.nl"]` → `to: ["hendrik@auto-city.nl"]`
- Regel 574: `to: [group.email]` → `to: ["hendrik@auto-city.nl"]`
- Deploy

**Stap 2: Tijdelijke test-override in `lisa-email-checklist-reminder/index.ts`**
- `to: [group.email]` → `to: ["hendrik@auto-city.nl"]`
- Deploy

**Stap 3: Trigger beide functies**
- `curl lisa-dagplanning` → genereert Excel + queued Lloyd email + verkoper emails
- `curl lisa-email-checklist-reminder` → queued checklist reminder emails
- `curl process-email-queue` → verstuurt alles

**Stap 4: Revert code**
- Zet alle `to:` velden terug naar de originele ontvangers
- Deploy

### Resultaat: 3 emails in jouw inbox
1. **Dagplanning Lloyd** — samenvatting + Excel bijlage
2. **Verkoper klaar voor aflevering** — auto's die afleverklaar zijn (als er auto's in die categorie vallen)
3. **Checklist ontbreekt reminder** — 6 auto's zonder checklist

Alle emails met echte data, echte layouts, geen mockdata.

