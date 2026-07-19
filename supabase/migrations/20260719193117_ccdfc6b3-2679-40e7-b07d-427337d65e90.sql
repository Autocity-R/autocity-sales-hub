
-- Signature PNG voor verkoper (opgeslagen als data-URL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_png text;

-- Snapshot van verkoper-handtekening op contract
ALTER TABLE public.contract_documents
  ADD COLUMN IF NOT EXISTS salesperson_signature_png text;

-- Update get_contract_by_token om nieuwe kolom mee te leveren
CREATE OR REPLACE FUNCTION public.get_contract_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sig public.contract_signatures%ROWTYPE;
  v_doc public.contract_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_sig FROM public.contract_signatures WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_sig.signed_at IS NOT NULL THEN RETURN jsonb_build_object('error', 'already_signed'); END IF;
  IF v_sig.token_expires_at < now() THEN RETURN jsonb_build_object('error', 'expired'); END IF;
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
    'warranty_package_name', v_doc.warranty_package_name,
    'warranty_price', v_doc.warranty_price,
    'trade_in_vehicle', v_doc.trade_in_vehicle,
    'trade_in_value', v_doc.trade_in_value,
    'accessories', v_doc.accessories,
    'financing_conditional', v_doc.financing_conditional,
    'financing_party', v_doc.financing_party,
    'special_terms', v_doc.special_terms,
    'total_price', v_doc.total_price,
    'main_photo_url', v_doc.main_photo_url,
    'delivery_date', v_doc.delivery_date,
    'salesperson_name', v_doc.salesperson_name,
    'salesperson_email', v_doc.salesperson_email,
    'salesperson_signature_svg', v_doc.salesperson_signature_svg,
    'salesperson_signature_png', v_doc.salesperson_signature_png,
    'sent_at', v_doc.sent_at,
    'token_expires_at', v_sig.token_expires_at,
    'created_at', v_doc.created_at
  );
END;
$function$;
