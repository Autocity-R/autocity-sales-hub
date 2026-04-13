SELECT cron.schedule(
  'process-garantie-emails-elke-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/process-garantie-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODI5MzU5MSwiZXhwIjoyMDYzODY5NTkxfQ._PQu0imG938iL7cx8HJxLconejlhuQspXHgUuCvYr1E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);