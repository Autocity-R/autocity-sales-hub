-- Betaalstatus van een werkplaatsfactuur omzetten; ook voor operationeel_directeur,
-- zonder de brede wi_rw-schrijfrechten uit te breiden.
CREATE OR REPLACE FUNCTION public.factuur_betaalstatus_zetten(p_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur'])) THEN
    RAISE EXCEPTION 'Geen rechten om de betaalstatus te wijzigen';
  END IF;
  IF p_status NOT IN ('open','betaald') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.workshop_invoices
     SET payment_status = p_status, paid_at = CASE WHEN p_status = 'betaald' THEN now() ELSE NULL END
   WHERE id = p_id AND invoice_kind NOT IN ('intern') AND payment_status <> 'nvt';
  IF NOT FOUND THEN RAISE EXCEPTION 'Factuur niet gevonden of betaling n.v.t.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.factuur_betaalstatus_zetten(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factuur_betaalstatus_zetten(uuid, text) TO authenticated, service_role;
