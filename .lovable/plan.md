

## Daan B2B Analyse — Geüpdatet Implementatieplan

### Twee correcties van Manus verwerkt

**Correctie 1**: Claude Auto-Intelligentie parser toevoegen als pre-processor voor JP Cars queries. De `vehicles` tabel bevat al rijke model-beschrijvingen (bijv. "Q5 Sportback 55 TFSI S Line", "Seal U DM-i 1.5 phev Boost") — Claude parseert deze naar gestructureerde velden (brandstof, transmissie, uitvoering) zodat JP Cars appels met appels vergelijkt.

**Correctie 2**: Email naar hendrik@auto-city.nl (niet daan@auto-city.nl).

### Bestaande infrastructuur (niet bouwen)
- Storage bucket `daan-analyses` (actief)
- Cron job `daan-b2b-analyse-08u` (ma-vr 06:00 UTC)
- `JPCARS_API_TOKEN`, `ANTHROPIC_API_KEY` als secrets

### Te bouwen: 3 bestanden

---

### 1. Edge Function: `supabase/functions/daan-b2b-analyse/index.ts` (nieuw)

**Flow in volgorde:**

1. **Idempotency guard** — check `email_queue` voor vandaag's "B2B Analyse"
2. **Offline voorraad ophalen** — ~53 auto's met `showroomOnline = false/null`, `isTradeIn = false/null`, `purchase_price > 0`
3. **Claude batch parse (NIEUW)** — stuur alle `brand + " " + model` beschrijvingen in 1 batch naar Anthropic API (ANTHROPIC_API_KEY, model `claude-sonnet-4-6`). Output: gestructureerde JSON met merk, model, uitvoering, brandstof, transmissie per auto. Temperature 0.1.
4. **JP Cars API per uniek merk+model** — gebruik Claude's output om specifiekere queries te bouwen: `make`, `model`, `fuel`, `transmission`, `build_year_min/max`, `keyword` (uitvoering). Rate limiting 200ms delay. Hergebruik `api.nl.jp.cars/api/cars/list` met `include_sold=true`.
5. **B2B kans berekening** — per gevonden dealer listing:
   - Skip als `sold_since = null` (niet verkocht)
   - Skip als `sold_since > 40` dagen
   - Skip als `days_in_stock > 50` dagen  
   - `maxOnzeprijs = dealerVerkoopprijs - 3000`
   - `onzeMarge = maxOnzeprijs - inkoopprijs`
   - Skip als `onzeMarge < 3000`
   - Score: STERK (marge ≥ 4000) of MOGELIJK
6. **Excel genereren** via `xlsx-js-style` — 3 tabs (Sterke kansen, Mogelijke kansen, Overzicht), zelfde branding als Lisa
7. **Upload naar `daan-analyses` bucket**
8. **Email naar hendrik@auto-city.nl** via `email_queue` met Excel als attachment

Support `{ mode: 'download' }` body voor dashboard gebruik (alleen JSON response, geen email).

---

### 2. Dashboard: `src/components/ai-agents/dashboards/DaanDashboard.tsx` (vervangen)

Vier secties:

- **KPI Strip**: Sterke kansen (groen), Mogelijke kansen (oranje), Offline auto's (rood), Verkopen deze maand (blauw)
- **B2B Kansen tabel**: Invoke edge function met `mode: download`, tabel met dealer links, Download Excel knop, tabs Sterk/Mogelijk
- **Offline voorraad**: Query vehicles met `showroomOnline = false/null`, gesorteerd op dagen in bezit
- **Team Performance**: Query `weekly_sales` voor deze maand, per verkoper B2C vs norm (10)

---

### 3. Config: `supabase/config.toml` (edit)

```toml
[functions.daan-b2b-analyse]
verify_jwt = false
```

---

### Technisch overzicht

| Bestand | Actie |
|---------|-------|
| `supabase/functions/daan-b2b-analyse/index.ts` | Nieuw — edge function met Claude parser + JP Cars + Excel + email |
| `src/components/ai-agents/dashboards/DaanDashboard.tsx` | Vervangen — 4 secties dashboard |
| `supabase/config.toml` | Edit — functie registreren |

Geen database migraties nodig. Claude gebruikt bestaande `ANTHROPIC_API_KEY`. JP Cars gebruikt bestaande `JPCARS_API_TOKEN`.

