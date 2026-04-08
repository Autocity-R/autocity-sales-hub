

## Plan: Lloyd Ochtendmail toevoegen aan lisa-dagplanning

### Samenvatting
Voeg een derde email toe aan de bestaande `lisa-dagplanning` edge function: een persoonlijke ochtendmail voor Lloyd met gisteren afgeronde checklist items en urgente open punten bij aankomende afleveringen.

### Wijzigingen in `supabase/functions/lisa-dagplanning/index.ts`

**1. Twee nieuwe query-functies toevoegen:**

- `getGisterGedaan(supabase)` — Query alle checklist items met `completedAt` gisteren, gegroepeerd per auto. Gebruikt `jsonb_array_elements` op `details->'preDeliveryChecklist'` voor `verkocht_b2c` voertuigen.

- `getUrgentAfleveringen(supabase)` — Query afleveringen vandaag+morgen die nog open checklist items hebben. Join appointments met vehicles, filter op `type='aflevering'`, niet geannuleerd, starttime vandaag of morgen, met open items.

**2. Nieuwe HTML builder `buildLloydOchtendEmail()`:**

Professionele HTML email in dezelfde Calibri stijl als bestaande emails:

- **Header**: Navy blauw (#1F3864) met "Goedemorgen Lloyd — Aftersales update [dag datum]"
- **Blok 1 — GISTEREN GEDAAN**: Toon-logica op basis van aantal (0=waarschuwing, 1-4=kan meer, 5-9=goed, 10+=uitstekend). Lijst per auto met kenteken, taken en wie.
- **Blok 2 — LET OP**: Aankomende afleveringen met open punten. ⚠️ voor >2 open items, 📌 voor 1-2 items. Toont klantnaam, datum/tijd, en open taken.
- **Footer**: Lisa — Afleverplanning Auto City

**3. Email 3 invoegen (na verkoper emails, rond regel 633):**

Insert in `email_queue` met:
- `senderEmail: "aftersales@auto-city.nl"`
- `to: ["lloyd@auto-city.nl"]`
- Subject: `Goedemorgen Lloyd — Aftersales update ${dagNaam} ${datum}`
- Body: output van `buildLloydOchtendEmail()`

Geen bijlage — dat zit al bij email 1. Dit is een aparte, persoonlijke briefing.

### Wat NIET verandert
- Excel generatie (ongewijzigd)
- Email 1 (Lloyd dagplanning met Excel bijlage)
- Email 2 (Verkoper notificaties)
- Download mode
- Idempotency guard
- Cron job

### Technisch overzicht

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | 2 query functies + HTML builder + email insert toevoegen |

