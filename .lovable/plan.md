
## Wat ik gevonden heb

Ik heb de Postgres-logs van de afgelopen periode geanalyseerd en de oorzaak gevonden:

- Tabel `taxatie_valuations` staat op **17.183 rijen** met daarin grote JSONB-velden (`jpcars_data`, `vehicle_data`, `portal_analysis`, `ai_advice`, `internal_comparison`).
- Er lopen queries op deze tabel die **62.000 ms en 66.000 ms** duren, en één query crasht met `canceling statement due to statement timeout`. De query is een `SELECT *` met `count(exact)` zonder enige filter.
- Zolang zo'n query loopt, blokkeert hij een Postgres-connectie. Bij meerdere tegelijk raken alle PostgREST-connecties bezet → álles in de app voelt traag (dashboards, lijsten, login refresh).

Bronnen die teveel ophalen:

1. `KevinFastMovers.tsx` — laadt 1000 rijen × `jpcars_data + vehicle_data` (grote JSONB) zonder filter.
2. `KevinTopModels.tsx` — laadt 500 rijen × `jpcars_data`.
3. `fetchTaxatieHistory` in `taxatieService.ts` — laadt 100 rijen met álle grote JSONB-kolommen mee.
4. Mogelijk een extern `SELECT *` zonder filter (Supabase Studio of edge function) — ook deze breekt door de statement-timeout.

De Edge Function logs (Robin, email-queue, garantie) zien er gezond uit — die zijn niet de oorzaak.

## Wat ik wil doen

### 1. Database: aggregatie-tabel + index

- Nieuwe materialized table `taxatie_market_aggregates` met per `make|model|fuel|bodyType|buildYear`: `avg_etr`, `avg_days_in_stock`, `avg_price`, `count`, `last_updated`. Gevuld door een dagelijkse cron (pg_cron) of trigger.
- Index op `taxatie_valuations(created_at DESC) WHERE jpcars_data IS NOT NULL` zodat de huidige queries snel zijn zolang de aggregaten nog niet gebruikt worden.
- Index op `taxatie_valuations(created_by, created_at DESC)` voor history per gebruiker.

### 2. Kevin dashboards laten praten met aggregaten

- `KevinFastMovers` en `KevinTopModels` lezen uit `taxatie_market_aggregates` in plaats van 500-1000 rijen JSONB. Geen client-side aggregatie meer.
- Resultaat: queries gaan van seconden naar < 50 ms en sturen ~50 KB i.p.v. enkele MB's.

### 3. Taxatie history slanker maken

- `fetchTaxatieHistory` alleen lichte kolommen ophalen (`id, created_at, license_plate, status, vehicle_data->>'brand', vehicle_data->>'model', ai_advice->>'price_suggestion'`). Detail-JSON pas laden bij openen van één rapport.
- Stale-time omhoog in React Query (5 min) — past bij bestaande caching-conventie.

### 4. Statement timeout verlagen voor `anon`/`authenticated`

- Huidig PostgREST timeout is hoog genoeg om queries 60s+ te laten draaien en connecties te blokkeren. Verlagen naar **8 seconden** voor `authenticated` rol. Slechte queries falen snel i.p.v. de hele app trekken.

### 5. Verificatie

- Na deployment: dashboard openen, `browser--performance_profile` draaien, Postgres-logs opnieuw checken op `duration:` en `statement timeout`. Verwacht: geen queries > 1s meer op `taxatie_valuations`.

## Technische details

```text
Voor:  KevinFastMovers → SELECT jpcars_data, vehicle_data FROM taxatie_valuations
                         WHERE jpcars_data IS NOT NULL
                         ORDER BY created_at DESC LIMIT 1000;   (~5-15s, ~3 MB)

Na:    KevinFastMovers → SELECT * FROM taxatie_market_aggregates
                         WHERE count >= 2 ORDER BY avg_etr DESC; (<50ms, ~50KB)
```

```sql
-- nieuwe tabel
CREATE TABLE public.taxatie_market_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text, model text, fuel text, body_type text, build_year int,
  avg_etr numeric, avg_days_in_stock numeric, avg_price numeric,
  min_price numeric, max_price numeric, sample_count int,
  last_refreshed_at timestamptz DEFAULT now(),
  UNIQUE(make, model, fuel, body_type, build_year)
);
GRANT SELECT ON public.taxatie_market_aggregates TO authenticated;
GRANT ALL    ON public.taxatie_market_aggregates TO service_role;
ALTER TABLE public.taxatie_market_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.taxatie_market_aggregates
  FOR SELECT TO authenticated USING (true);

-- index voor lopende queries tot aggregaat klaar is
CREATE INDEX CONCURRENTLY idx_tax_val_created_at_jp
  ON public.taxatie_valuations (created_at DESC)
  WHERE jpcars_data IS NOT NULL;
```

Aggregatie-refresh: SQL-functie + pg_cron (1× per nacht). Code-changes blijven in `services/taxatieService.ts` en de twee Kevin-componenten.

## Wat NIET in deze stap

- Geen wijziging aan Robin / intake-pijplijn (daar werken we vandaag al apart aan).
- Geen wijziging aan email-queue / garantie functions.
- Geen UI-redesign — alleen data-laag.
