

## Lisa Automatische Dagplanning — Edge Function + Excel Export + Cron

### Wat er gebouwd wordt

1. **Nieuwe Edge Function** `supabase/functions/lisa-dagplanning/index.ts`
2. **Nieuwe Storage bucket** `lisa-planningen`
3. **Cron job** ma-vr 08:00
4. **Dashboard download knop** in `LisaDashboard.tsx`
5. **config.toml** update
6. **Checklist tekst-parsing fix** in dashboard + edge function (het "1 punt = meerdere taken" probleem)

---

### 1. Edge Function `lisa-dagplanning/index.ts`

Haalt alle `verkocht_b2c` voertuigen op met details, parsed checklist beschrijvingen, en genereert een Excel met 4 tabs via `npm:xlsx`.

**Checklist tekst-parsing** (fix voor het Range Rover probleem):
Elke `description` wordt gesplitst op `, ` / ` + ` / ` incl. ` om werkelijke taken te tellen. Elk onderdeel wordt apart beoordeeld op complexiteit (SIMPLE vs COMPLEX regex). Dit bepaalt de "Werklast" kolom (Snel / Normaal / Zwaar).

**Tab 1 "Werkplaats"** — Mechanisch werk + carrosserie, gesorteerd op urgentie:
- Rode zone auto's eerst (>14 dagen), dan rest
- Kolommen: Auto, Kenteken, Dagen wacht, Werklast, Open werk (concrete taken), Import status, Verkoper

**Tab 2 "Verkopers Bellen"** — Checklist 100% + ingeschreven + geen afspraak:
- Per verkoper gegroepeerd
- Kolommen: Auto, Kenteken, Dagen wacht, Verkoper, Status

**Tab 3 "Werk in Uitvoering"** — Wacht op kenteken, checklist alvast starten:
- Kolommen: Auto, Kenteken, Dagen wacht, Open werk, Import status, Blokkade

**Tab 4 "Overzicht"** — Tellingen:
- Totaal verkocht B2C wachtend
- Rode zone count
- Quick wins count
- Verkopers bellen count
- Afleveringen vandaag/week

Na generatie:
- Upload naar Storage bucket `lisa-planningen` met filename `dagplanning-YYYY-MM-DD.xlsx`
- Genereer signed URL (24 uur geldig)
- Return URL in response

**On-demand modus**: Wanneer aangeroepen vanuit dashboard (POST met `{ "mode": "download" }`), return de signed URL direct. Wanneer via cron (geen body), genereer en sla op.

---

### 2. Storage bucket

Naam: `lisa-planningen`, private, via migration of handmatig aanmaken.

---

### 3. Cron job

```sql
SELECT cron.schedule(
  'lisa-dagplanning-08u',
  '0 6 * * 1-5',  -- 06:00 UTC = 08:00 CET, ma-vr
  $$
  SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/lisa-dagplanning',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

### 4. Dashboard download knop (`LisaDashboard.tsx`)

Bovenaan het dashboard, naast de KPI-kaarten:
- Knop "Download Dagplanning" die `supabase.functions.invoke('lisa-dagplanning', { body: { mode: 'download' } })` aanroept
- Na response: open signed URL in nieuw tabblad
- Loading state tijdens generatie

**Checklist parsing fix** ook in het dashboard: `classifyComplexity` wordt aangepast om descriptions te splitsen op delimiters voordat complexiteit wordt bepaald. De Range Rover Velar met "Onderhoudsbeurt incl. APK, Beschadigingen achterbumper bijwerken + bij slot achterklep binnenzijde, Mattenset, Beide laadkabels leveren" wordt dan correct als "hoog" geclassificeerd i.p.v. "laag".

---

### 5. config.toml

```toml
[functions.lisa-dagplanning]
verify_jwt = false
```

---

### Bestanden

| Bestand | Actie |
|---------|-------|
| `supabase/functions/lisa-dagplanning/index.ts` | Nieuw — Excel generatie + Storage upload |
| `supabase/config.toml` | Edit — lisa-dagplanning registreren |
| `src/components/ai-agents/dashboards/LisaDashboard.tsx` | Edit — download knop + checklist parsing fix |
| Storage bucket `lisa-planningen` | Nieuw |
| Cron job `lisa-dagplanning-08u` | Nieuw (via SQL insert) |

### Geen email in eerste versie
Claude's plan noemt email via de bestaande `email_queue` tabel. Dit kan als vervolgstap, maar de prioriteit is eerst de Excel generatie + download + cron correct werkend krijgen. Email bijlage-ondersteuning toevoegen is een logische volgende stap.

