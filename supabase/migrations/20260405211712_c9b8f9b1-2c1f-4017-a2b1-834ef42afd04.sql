
ALTER TABLE public.jpcars_voorraad_monitor
  ADD COLUMN IF NOT EXISTS price_purchase numeric,
  ADD COLUMN IF NOT EXISTS price_catalog numeric,
  ADD COLUMN IF NOT EXISTS competitive_set_size integer,
  ADD COLUMN IF NOT EXISTS window_size_own integer,
  ADD COLUMN IF NOT EXISTS stat_turnover_int integer,
  ADD COLUMN IF NOT EXISTS stat_turnover_ext integer,
  ADD COLUMN IF NOT EXISTS tdc numeric,
  ADD COLUMN IF NOT EXISTS days_to_show integer,
  ADD COLUMN IF NOT EXISTS days_since_proposal integer,
  ADD COLUMN IF NOT EXISTS apr_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS options jsonb;
