select cron.schedule(
  'import-status-from-email-elk-uur',
  '20 * * * *',
  $$
  select extensions.net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/import-status-from-email',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c"}'::jsonb,
    body := '{"days":2}'::jsonb
  ) as request_id;
  $$
);