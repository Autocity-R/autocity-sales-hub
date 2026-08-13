ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS stored_at timestamptz,
  ADD COLUMN IF NOT EXISTS stored_by uuid;