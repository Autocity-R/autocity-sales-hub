

## Plan: Lloyd ochtendmail tijdelijk uitschakelen

### Huidige situatie
De Lloyd ochtendmail (Blok 1: gisteren gedaan, Blok 2: urgente afleveringen) is **al volledig geïmplementeerd** in `lisa-dagplanning/index.ts`:
- `getGisterGedaan()` — regel 246
- `getUrgentAfleveringen()` — regel 290  
- `buildLloydOchtendEmail()` — regel 339
- Email queue insert — regel 833-848

### Wat te doen
**Bestand: `supabase/functions/lisa-dagplanning/index.ts`**

Rond regel 833-848: de Lloyd ochtendmail sectie wrappen in een feature flag. In plaats van direct in `email_queue` te inserten, voeg een `const LLOYD_OCHTENDMAIL_ACTIEF = false;` toe bovenaan het bestand. De email wordt alleen gequeued als deze flag `true` is.

Dit betekent:
- Alle code blijft staan en wordt getest (queries draaien gewoon)
- Er wordt **geen email verstuurd** naar Lloyd
- Console log toont wat er zou zijn verstuurd (voor debugging)
- Als je klaar bent met de garantie tab opruiming, zet je de flag op `true`

### Wat NIET verandert
- Excel generatie, Email 1 (dagplanning), Email 2 (verkopers) — alles blijft actief
- De queries en HTML builder blijven intact

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | Feature flag toevoegen, email insert conditioneel maken |

