ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_for_date date;

CREATE INDEX IF NOT EXISTS idx_work_orders_planned_at_extern
  ON public.work_orders (planned_at)
  WHERE origin = 'extern';