CREATE OR REPLACE FUNCTION public.garantie_werkorder_inplannen(
 p_claim_id uuid, p_description text, p_planned_at timestamptz,
 p_assigned_to uuid DEFAULT NULL, p_is_rush boolean DEFAULT false,
 p_customer_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
 c public.warranty_claims%ROWTYPE;
 v_id uuid;
 v_customer uuid;
 v_plate text;
 v_matches uuid[];
 v_order uuid;
 v_sort integer;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.werkplaats_rol() = ANY(ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','verkoper','operationeel_directeur'])) THEN
   RAISE EXCEPTION 'Geen toestemming om garantieclaims in te plannen' USING ERRCODE='42501';
 END IF;
 SELECT * INTO c FROM public.warranty_claims WHERE id=p_claim_id FOR UPDATE;
 IF NOT FOUND OR (NOT public.is_admin_or_owner() AND c.branch IS DISTINCT FROM public.current_user_branch()) THEN
   RAISE EXCEPTION 'Garantieclaim niet beschikbaar in uw vestiging' USING ERRCODE='42501';
 END IF;
 IF p_planned_at IS NULL OR nullif(btrim(p_description),'') IS NULL THEN
   RAISE EXCEPTION 'Datum, tijd en werkzaamheden zijn verplicht' USING ERRCODE='22023';
 END IF;
 SELECT id INTO v_order FROM public.work_orders WHERE warranty_claim_id=c.id AND status<>'geannuleerd' ORDER BY created_at DESC LIMIT 1;
 IF v_order IS NOT NULL THEN RETURN v_order; END IF;
 v_customer := coalesce(p_customer_id,c.customer_id);
 IF v_customer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contacts WHERE id=v_customer AND type IN ('b2b','b2c')) THEN
   RAISE EXCEPTION 'Selecteer een bestaande particuliere of zakelijke klant' USING ERRCODE='22023';
 END IF;
 IF p_assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id WHERE p.id=p_assigned_to AND p.actief AND r.role IN ('monteur','werkplaats_chef','aftersales_manager')) THEN
   RAISE EXCEPTION 'Selecteer een actieve werkplaatsmedewerker' USING ERRCODE='22023';
 END IF;
 v_id := c.vehicle_id;
 IF v_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=v_id AND (public.is_admin_or_owner() OR status IS DISTINCT FROM 'verkocht_b2c' OR branch=public.current_user_branch() OR branch IS NULL)) THEN
     RAISE EXCEPTION 'Gekoppelde auto niet beschikbaar' USING ERRCODE='42501';
   END IF;
 ELSE
   IF nullif(btrim(c.manual_vehicle_brand),'') IS NULL OR nullif(btrim(c.manual_vehicle_model),'') IS NULL THEN
     RAISE EXCEPTION 'Vul merk en model in bij de garantieclaim' USING ERRCODE='22023';
   END IF;
   v_plate := upper(regexp_replace(coalesce(c.manual_license_number,''),'[^a-zA-Z0-9]','','g'));
   IF length(v_plate)>=6 THEN
     PERFORM pg_advisory_xact_lock(hashtextextended('garantie-auto:' || c.branch || ':' || v_plate,0));
     SELECT array_agg(id) INTO v_matches FROM public.vehicles WHERE branch=c.branch AND upper(regexp_replace(coalesce(license_number,''),'[^a-zA-Z0-9]','','g'))=v_plate;
     IF coalesce(array_length(v_matches,1),0)>1 THEN
       RAISE EXCEPTION 'Meerdere auto’s met dit kenteken: koppel eerst de juiste auto aan de claim' USING ERRCODE='22023';
     END IF;
     v_id := v_matches[1];
   END IF;
   IF v_id IS NULL THEN
     INSERT INTO public.vehicles(brand,model,license_number,status,branch,customer_id,details)
       VALUES(btrim(c.manual_vehicle_brand),btrim(c.manual_vehicle_model),nullif(btrim(c.manual_license_number),''),'extern',c.branch,v_customer,
       jsonb_build_object('externalWorkshop',true,'excludeFromStock',true,'showroomOnline',false,'warrantyClaimId',c.id)) RETURNING id INTO v_id;
   END IF;
 END IF;
 UPDATE public.warranty_claims SET vehicle_id=v_id,customer_id=v_customer WHERE id=c.id;
 SELECT CASE WHEN p_is_rush THEN coalesce(min(sort_order),0)-10 ELSE coalesce(max(sort_order),0)+10 END INTO v_sort FROM public.work_orders WHERE discipline='werkplaats' AND status IN ('ingepland','bezig','gepauzeerd');
 INSERT INTO public.work_orders(vehicle_id,discipline,description,status,sort_order,source,origin,warranty_claim_id,planned_at,assigned_to,is_rush,branch,created_by)
 VALUES(v_id,'werkplaats',btrim(p_description),'ingepland',v_sort,'garantie','intern',c.id,p_planned_at,p_assigned_to,coalesce(p_is_rush,false),c.branch,auth.uid()) RETURNING id INTO v_order;
 RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.garantie_werkorder_inplannen(uuid,text,timestamptz,uuid,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.garantie_werkorder_inplannen(uuid,text,timestamptz,uuid,boolean,uuid) TO authenticated;