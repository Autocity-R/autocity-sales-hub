CREATE OR REPLACE FUNCTION public.werkorder_factuur_niet_nodig(p_work_order_id uuid, p_reden text, p_toelichting text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'aftersales_manager')
          OR has_role(auth.uid(), 'operationeel_directeur')) THEN
    RAISE EXCEPTION 'Geen rechten om factuur-verplichting te wijzigen';
  END IF;
  IF p_reden NOT IN ('kosteloos', 'garantie', 'buiten_crm', 'anders') THEN
    RAISE EXCEPTION 'Ongeldige reden: %', p_reden;
  END IF;
  UPDATE public.work_orders
  SET factuur_niet_nodig = true,
      factuur_niet_nodig_reden = p_reden || CASE WHEN p_toelichting IS NOT NULL AND btrim(p_toelichting) <> '' THEN ': ' || btrim(p_toelichting) ELSE '' END,
      factuur_niet_nodig_door = auth.uid(),
      factuur_niet_nodig_op = now()
  WHERE id = p_work_order_id AND status = 'goedgekeurd';
  IF NOT FOUND THEN RAISE EXCEPTION 'Werkorder niet gevonden of niet goedgekeurd'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.werkorder_toch_factureren(p_work_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_intern boolean;
BEGIN
  SELECT discipline = 'werkplaats' AND COALESCE(origin, 'intern') = 'intern' AND external_customer IS NULL
    INTO v_intern FROM public.work_orders WHERE id = p_work_order_id;
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'aftersales_manager')
          OR has_role(auth.uid(), 'operationeel_directeur')
          OR (COALESCE(v_intern, false) AND public.mag_interne_werkorder_goedkeuren())) THEN
    RAISE EXCEPTION 'Geen rechten om factuur-verplichting te wijzigen';
  END IF;
  UPDATE public.work_orders
  SET factuur_niet_nodig = false,
      factuur_niet_nodig_reden = NULL,
      factuur_niet_nodig_door = NULL,
      factuur_niet_nodig_op = NULL
  WHERE id = p_work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Werkorder niet gevonden'; END IF;
END;
$function$;

DROP POLICY IF EXISTS wi_insert_directeur ON public.workshop_invoices;
CREATE POLICY wi_insert_directeur ON public.workshop_invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.werkplaats_rol() = 'operationeel_directeur'
              AND COALESCE(document_type, 'factuur') <> 'creditfactuur');

DROP POLICY IF EXISTS wi_update_directeur_concept ON public.workshop_invoices;
CREATE POLICY wi_update_directeur_concept ON public.workshop_invoices
  FOR UPDATE TO authenticated
  USING (public.werkplaats_rol() = 'operationeel_directeur' AND status = 'concept')
  WITH CHECK (public.werkplaats_rol() = 'operationeel_directeur'
              AND COALESCE(document_type, 'factuur') <> 'creditfactuur');