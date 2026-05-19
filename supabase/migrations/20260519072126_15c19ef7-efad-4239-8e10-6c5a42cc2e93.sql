ALTER TABLE public.intake_damages 
  ADD COLUMN IF NOT EXISTS detectie_blok TEXT,
  ADD COLUMN IF NOT EXISTS detectie_bewijs TEXT;