ALTER TABLE public.warranty_claims
  ADD COLUMN IF NOT EXISTS kosten_uren numeric,
  ADD COLUMN IF NOT EXISTS kosten_arbeid numeric,
  ADD COLUMN IF NOT EXISTS kosten_onderdelen numeric,
  ADD COLUMN IF NOT EXISTS kosten_totaal numeric,
  ADD COLUMN IF NOT EXISTS kosten_notitie text,
  ADD COLUMN IF NOT EXISTS kosten_ingevuld_door uuid,
  ADD COLUMN IF NOT EXISTS kosten_ingevuld_op timestamptz;

CREATE INDEX IF NOT EXISTS idx_warranty_claims_kosten_totaal ON public.warranty_claims (kosten_totaal);