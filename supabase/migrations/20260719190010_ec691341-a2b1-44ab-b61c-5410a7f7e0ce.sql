ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS financing_conditional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_party text,
  ADD COLUMN IF NOT EXISTS accessories jsonb NOT NULL DEFAULT '[]'::jsonb;