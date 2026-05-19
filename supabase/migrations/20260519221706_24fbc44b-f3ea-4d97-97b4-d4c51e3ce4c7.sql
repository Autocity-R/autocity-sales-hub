ALTER TABLE public.intake_damages 
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'zeker',
  ADD COLUMN IF NOT EXISTS bbox jsonb;

ALTER TABLE public.intake_damages
  ADD CONSTRAINT intake_damages_confidence_check 
  CHECK (confidence IN ('zeker','waarschijnlijk','twijfel'));