ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check;
ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_status_check CHECK (status = ANY (ARRAY['aangevraagd','ingepland','bezig','gepauzeerd','afgerond','goedgekeurd','geannuleerd']));
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS paused_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS pause_reason text;