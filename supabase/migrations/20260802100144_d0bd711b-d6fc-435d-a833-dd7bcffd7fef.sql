ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS salesperson_id uuid,
  ADD COLUMN IF NOT EXISTS registered_by uuid;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS sold_registered_by uuid;

CREATE INDEX IF NOT EXISTS idx_contract_documents_salesperson_id
  ON public.contract_documents (salesperson_id);

COMMENT ON COLUMN public.contract_documents.salesperson_id IS 'De GESELECTEERDE verkoper (attributie), niet per definitie het ingelogde account';
COMMENT ON COLUMN public.contract_documents.registered_by IS 'Audit: het ingelogde account dat het contract invoerde';
COMMENT ON COLUMN public.vehicles.sold_registered_by IS 'Audit: het ingelogde account dat de verkoop registreerde (sold_by_user_id = verkoper)';