-- Create cron job to process lead emails every 5 minutes
SELECT cron.schedule(
  'process-lead-emails-every-5-minutes',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/process-lead-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);