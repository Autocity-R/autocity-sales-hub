-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing weekly sales reset job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('reset-weekly-sales-every-monday');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- Schedule weekly sales reset every Monday at 00:00
SELECT cron.schedule(
  'reset-weekly-sales-every-monday',
  '0 0 * * 1',  -- Every Monday at midnight (00:00)
  $$
  SELECT
    net.http_post(
      url:='https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/reset-weekly-sales',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2Fncm1veWZ5aW1kb2F5bmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyOTM1OTEsImV4cCI6MjA2Mzg2OTU5MX0.vzCFGEJv13gHlu9wRPg9czQZtLiUZXN74rWOyOdBf3c"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);

-- One-time reset: Delete all old weekly sales records
DELETE FROM weekly_sales;

-- Initialize weekly sales for current week with all active salespeople
DO $$
DECLARE
  week_start date;
  week_end date;
BEGIN
  -- Calculate current week start (Monday)
  week_start := (CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE)::int + INTERVAL '1 day')::date;
  week_end := week_start + INTERVAL '6 days';
  
  -- Insert new weekly records for all salespeople with 0 sales
  INSERT INTO weekly_sales (salesperson_id, salesperson_name, week_start_date, week_end_date, b2b_sales, b2c_sales, total_sales)
  SELECT 
    p.id,
    COALESCE(TRIM(p.first_name || ' ' || p.last_name), p.email) as salesperson_name,
    week_start,
    week_end,
    0 as b2b_sales,
    0 as b2c_sales,
    0 as total_sales
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'verkoper';
END $$;