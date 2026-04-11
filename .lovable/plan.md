

## Plan: Fix remaining Alex infrastructure issues (3 items)

### Already Fixed (no action needed)
- Chat routing → `alex-ceo-chat` is working (logs confirm successful responses)
- The `rpc().catch()` bug was already fixed and redeployed

### Action 1: Deploy `alex-dagelijkse-briefing` and `alex-leermoment`
Both edge functions exist in the codebase but have never been deployed (0 logs). Deploy both using the deploy tool.

### Action 2: Fix `alex-leermoment-ma` cron job — replace anon key with service_role key
The cron job currently uses the **anon key** (`role: anon`). This must be the **service_role key** because the function writes to Supabase tables. 

Execute SQL via migration tool:
```sql
SELECT cron.unschedule('alex-leermoment-ma');
SELECT cron.schedule(
  'alex-leermoment-ma',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/alex-leermoment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```
(SERVICE_ROLE_KEY replaced with actual key from cron job `alex-ceo-briefing-07u` which already has the correct key)

### Action 3: Trigger first briefing manually
After deployment, invoke `alex-dagelijkse-briefing` via curl to populate memory tables (`alex_market_memory`, `alex_insights`). This kickstarts Alex's learning cycle.

### Samenvatting

| # | Actie | Type |
|---|-------|------|
| 1 | Deploy `alex-dagelijkse-briefing` + `alex-leermoment` | Deploy |
| 2 | Fix cron job key van anon → service_role | SQL (via insert tool, niet migratie) |
| 3 | Trigger eerste briefing handmatig | Edge function invoke |

