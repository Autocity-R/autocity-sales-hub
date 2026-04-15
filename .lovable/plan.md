

## Plan: JP Cars cron job naar service_role key

### Wat
`jpcars-sync-hourly` (jobid 7) draait met de anon key. Vervangen door service_role key.

### Hoe
Via SQL tool (niet migratie — bevat secrets):

```sql
SELECT cron.unschedule(7);

SELECT cron.schedule('jpcars-sync-hourly', '0 * * * *',
  $$ SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/jpcars-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODI5MzU5MSwiZXhwIjoyMDYzODY5NTkxfQ._PQu0imG938iL7cx8HJxLconejlhuQspXHgUuCvYr1E"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
```

### Bestanden
Geen codewijzigingen. Alleen SQL uitvoering via de SQL tool.

