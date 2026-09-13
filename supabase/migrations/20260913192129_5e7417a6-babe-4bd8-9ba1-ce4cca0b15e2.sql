ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS soh_pct numeric(4,1),
  ADD COLUMN IF NOT EXISTS aantal_sleutels smallint;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_soh_pct_range CHECK (soh_pct IS NULL OR (soh_pct >= 0 AND soh_pct <= 100));

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_aantal_sleutels_check CHECK (aantal_sleutels IS NULL OR aantal_sleutels IN (1,2));

COMMENT ON COLUMN public.vehicles.soh_pct IS 'Gemeten accu-gezondheid (State of Health) in procent, alleen EV/hybride. NULL = niet gemeten.';
COMMENT ON COLUMN public.vehicles.aantal_sleutels IS 'Aantal sleutels bij inname (1 of 2). NULL = onbekend.';