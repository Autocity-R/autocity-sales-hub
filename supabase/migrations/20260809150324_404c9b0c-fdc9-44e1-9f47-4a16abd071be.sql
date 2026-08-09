ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS administratie_notified_at timestamptz;