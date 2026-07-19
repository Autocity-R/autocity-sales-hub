-- ============================================================
-- Fase 1 — Koopcontract 2.0 datamodel
-- ============================================================

-- 1) contract_documents
CREATE TABLE public.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  customer_id text,
  branch text NOT NULL DEFAULT 'rotterdam' CHECK (branch IN ('rotterdam','heerhugowaard')),
  status text NOT NULL DEFAULT 'concept' CHECK (status IN ('concept','verstuurd','getekend','geannuleerd')),
  contract_type text NOT NULL CHECK (contract_type IN ('b2b','b2c')),

  -- Snapshots (reproduceerbaar document)
  vehicle_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Prijzen
  sale_price_ex numeric(12,2),
  btw_type text CHECK (btw_type IN ('marge','btw')),
  warranty_package text,
  warranty_price numeric(12,2),
  trade_in_vehicle jsonb,
  trade_in_value numeric(12,2),
  special_terms text,
  total_price numeric(12,2),

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_documents TO authenticated;
GRANT ALL ON public.contract_documents TO service_role;

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_documents select by branch or admin"
  ON public.contract_documents FOR SELECT TO authenticated
  USING (
    public.is_admin_or_owner()
    OR branch = public.current_user_branch()
  );

CREATE POLICY "contract_documents insert by branch or admin"
  ON public.contract_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_owner()
    OR branch = public.current_user_branch()
  );

CREATE POLICY "contract_documents update by branch or admin"
  ON public.contract_documents FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_owner()
    OR branch = public.current_user_branch()
  )
  WITH CHECK (
    public.is_admin_or_owner()
    OR branch = public.current_user_branch()
  );

CREATE POLICY "contract_documents delete admin only"
  ON public.contract_documents FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

CREATE INDEX idx_contract_documents_vehicle ON public.contract_documents(vehicle_id);
CREATE INDEX idx_contract_documents_branch_status ON public.contract_documents(branch, status);
CREATE INDEX idx_contract_documents_created_at ON public.contract_documents(created_at DESC);

CREATE TRIGGER trg_contract_documents_updated_at
  BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Contractnummer sequence per (branch, jaar)
CREATE TABLE public.contract_number_sequences (
  branch text NOT NULL CHECK (branch IN ('rotterdam','heerhugowaard')),
  year integer NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  PRIMARY KEY (branch, year)
);

GRANT ALL ON public.contract_number_sequences TO service_role;
ALTER TABLE public.contract_number_sequences ENABLE ROW LEVEL SECURITY;
-- Alleen security-definer trigger schrijft hier; geen policies voor authenticated/anon.

CREATE OR REPLACE FUNCTION public.assign_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_branch_code text;
  v_seq integer;
BEGIN
  IF NEW.contract_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_branch_code := CASE NEW.branch
    WHEN 'rotterdam' THEN 'RTD'
    WHEN 'heerhugowaard' THEN 'HHW'
    ELSE 'RTD'
  END;

  INSERT INTO public.contract_number_sequences (branch, year, last_seq)
    VALUES (NEW.branch, v_year, 1)
  ON CONFLICT (branch, year) DO UPDATE
    SET last_seq = public.contract_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  NEW.contract_number := format('AC-%s-%s-%s', v_branch_code, v_year, lpad(v_seq::text, 4, '0'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_documents_assign_number
  BEFORE INSERT ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.assign_contract_number();

-- 3) contract_signatures
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  signed_at timestamptz,
  signer_name text,
  signer_email text,
  signer_ip text,
  signature_data text,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Alleen via joined contract_document (branch-scope). Geen anon.
CREATE POLICY "contract_signatures select via contract"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_documents cd
      WHERE cd.id = contract_signatures.contract_id
        AND (public.is_admin_or_owner() OR cd.branch = public.current_user_branch())
    )
  );

CREATE POLICY "contract_signatures insert via contract"
  ON public.contract_signatures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contract_documents cd
      WHERE cd.id = contract_signatures.contract_id
        AND (public.is_admin_or_owner() OR cd.branch = public.current_user_branch())
    )
  );

CREATE POLICY "contract_signatures update via contract"
  ON public.contract_signatures FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_documents cd
      WHERE cd.id = contract_signatures.contract_id
        AND (public.is_admin_or_owner() OR cd.branch = public.current_user_branch())
    )
  );

CREATE INDEX idx_contract_signatures_contract ON public.contract_signatures(contract_id);
CREATE INDEX idx_contract_signatures_token ON public.contract_signatures(token);

CREATE TRIGGER trg_contract_signatures_updated_at
  BEFORE UPDATE ON public.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Publieke tekenlink-RPC: enige manier voor anon om een contract op te halen.
CREATE OR REPLACE FUNCTION public.get_contract_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sig public.contract_signatures%ROWTYPE;
  v_doc public.contract_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_sig FROM public.contract_signatures WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_sig.signed_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_signed');
  END IF;

  IF v_sig.token_expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  SELECT * INTO v_doc FROM public.contract_documents WHERE id = v_sig.contract_id;
  IF NOT FOUND OR v_doc.status = 'geannuleerd' THEN
    RETURN jsonb_build_object('error', 'cancelled');
  END IF;

  RETURN jsonb_build_object(
    'contract_id', v_doc.id,
    'contract_number', v_doc.contract_number,
    'branch', v_doc.branch,
    'contract_type', v_doc.contract_type,
    'status', v_doc.status,
    'vehicle_snapshot', v_doc.vehicle_snapshot,
    'customer_snapshot', v_doc.customer_snapshot,
    'company_snapshot', v_doc.company_snapshot,
    'sale_price_ex', v_doc.sale_price_ex,
    'btw_type', v_doc.btw_type,
    'warranty_package', v_doc.warranty_package,
    'warranty_price', v_doc.warranty_price,
    'trade_in_vehicle', v_doc.trade_in_vehicle,
    'trade_in_value', v_doc.trade_in_value,
    'special_terms', v_doc.special_terms,
    'total_price', v_doc.total_price,
    'token_expires_at', v_sig.token_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_by_token(text) TO anon, authenticated, service_role;