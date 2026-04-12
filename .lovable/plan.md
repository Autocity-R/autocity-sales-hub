

## Plan: Cron jobs herschedulen met service_role key

### Query check — klaar

Alle drie bestanden (`BpmHuysTab.tsx`, `marco-bpm-check/index.ts`, `marco-bpm-weekoverzicht/index.ts`) gebruiken de Supabase JS client met `vehicle_id` UUID lookups. Geen raw SQL met LIKE of RIGHT. De frontend meldcode matching in `BpmHuysTab.tsx` gebruikt `v.vin.slice(-4)` — correct JavaScript. **Geen code aanpassingen nodig.**

### Cron jobs — actie vereist

Beide Marco cron jobs moeten herescheduled worden met de service_role key via SQL:

```sql
SELECT cron.unschedule('marco-bpm-dagcheck-08u');
SELECT cron.unschedule('marco-bpm-weekoverzicht');

SELECT cron.schedule('marco-bpm-dagcheck-08u', '0 6 * * 1-5',
  $$ SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/marco-bpm-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODI5MzU5MSwiZXhwIjoyMDYzODY5NTkxfQ._PQu0imG938iL7cx8HJxLconejlhuQspXHgUuCvYr1E"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

SELECT cron.schedule('marco-bpm-weekoverzicht', '0 7 * * 1',
  $$ SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/marco-bpm-weekoverzicht',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODI5MzU5MSwiZXhwIjoyMDYzODY5NTkxfQ._PQu0imG938iL7cx8HJxLconejlhuQspXHgUuCvYr1E"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
```

Dit wordt uitgevoerd via de Supabase SQL insert tool (niet via migratie — bevat service_role key).

### Bestanden

| Bestand | Actie |
|---------|-------|
| `BpmHuysTab.tsx` | Geen wijziging nodig |
| `marco-bpm-check/index.ts` | Geen wijziging nodig |
| `marco-bpm-weekoverzicht/index.ts` | Geen wijziging nodig |
| Cron jobs | Herschedulen via SQL met service_role key |

