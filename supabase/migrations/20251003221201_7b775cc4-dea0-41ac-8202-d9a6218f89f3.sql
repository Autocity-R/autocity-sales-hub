-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to process lead emails every 15 minutes
SELECT cron.schedule(
  'process-lead-emails-sync',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url:='https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/process-lead-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Enable realtime for email_messages table
ALTER TABLE email_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE email_messages;

-- Enable realtime for email_logs table  
ALTER TABLE email_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE email_logs;