ALTER TABLE public.contract_signatures ADD COLUMN IF NOT EXISTS opened_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_contract_opened(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contract_signatures
     SET opened_at = now()
   WHERE token = _token
     AND opened_at IS NULL
     AND signed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_contract_opened(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_contract_v2(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.contract_documents%ROWTYPE;
  v_admin boolean := public.is_admin_or_owner();
BEGIN
  SELECT * INTO v_doc FROM public.contract_documents WHERE id = _contract_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF NOT (
    v_admin
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'verkoper')
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF v_doc.status = 'getekend' AND NOT v_admin THEN
    RETURN jsonb_build_object('error', 'signed_admin_only');
  END IF;

  UPDATE public.contract_documents
     SET status = 'geannuleerd', updated_at = now()
   WHERE id = _contract_id;

  UPDATE public.contract_signatures
     SET token_expires_at = now() - interval '1 second'
   WHERE contract_id = _contract_id
     AND signed_at IS NULL;

  DELETE FROM public.vehicle_files
   WHERE vehicle_id = v_doc.vehicle_id
     AND metadata->>'contract_id' = _contract_id::text;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_contract_v2(uuid) TO authenticated;