ALTER TABLE public.garantie_email_threads
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_garantie_email_threads_vehicle_id
  ON public.garantie_email_threads(vehicle_id);