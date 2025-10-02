-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the email queue processor to run every minute
-- Use DO block to safely handle existing jobs
DO $$
BEGIN
  -- Try to unschedule if it exists, ignore if it doesn't
  PERFORM cron.unschedule('process-email-queue-every-minute');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    NULL;
END $$;

-- Now schedule the job
SELECT cron.schedule(
  'process-email-queue-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/process-email-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);