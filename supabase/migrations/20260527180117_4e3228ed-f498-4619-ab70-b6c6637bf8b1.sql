
-- Performance indexes for taxatie_valuations (17k+ rows with large JSONB)
CREATE INDEX IF NOT EXISTS idx_tax_val_created_at_jp
  ON public.taxatie_valuations (created_at DESC)
  WHERE jpcars_data IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tax_val_created_by_created_at
  ON public.taxatie_valuations (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tax_val_created_at
  ON public.taxatie_valuations (created_at DESC);
