CREATE OR REPLACE FUNCTION public.get_checklist_by_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vid uuid; r jsonb;
BEGIN
  SELECT vehicle_id INTO v_vid FROM checklist_access_tokens WHERE token = p_token LIMIT 1;
  IF v_vid IS NULL THEN RAISE EXCEPTION 'Ongeldige link'; END IF;
  SELECT jsonb_build_object('vehicle_id', v.id, 'brand', v.brand, 'model', v.model,
    'license_number', v.license_number, 'color', v.color, 'vin', v.vin, 'year', v.year,
    'status', v.status, 'import_status', v.import_status,
    'checklist', COALESCE(v.details->'preDeliveryChecklist', '[]'::jsonb))
  INTO r FROM vehicles v WHERE v.id = v_vid;
  IF r IS NULL THEN RAISE EXCEPTION 'Ongeldige link'; END IF;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.toggle_checklist_item_by_token(p_token text, p_item_id text, p_completed boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vid uuid; v_status text; v_list jsonb; v_idx int; v_name text; v_new jsonb;
BEGIN
  SELECT vehicle_id INTO v_vid FROM checklist_access_tokens WHERE token = p_token LIMIT 1;
  IF v_vid IS NULL THEN RAISE EXCEPTION 'Ongeldige link'; END IF;
  SELECT status, COALESCE(details->'preDeliveryChecklist','[]'::jsonb) INTO v_status, v_list
    FROM vehicles WHERE id = v_vid FOR UPDATE;
  IF v_status IS DISTINCT FROM 'verkocht_b2c' THEN RAISE EXCEPTION 'Link verlopen'; END IF;
  SELECT (o - 1)::int INTO v_idx FROM jsonb_array_elements(v_list) WITH ORDINALITY e(el, o)
    WHERE el->>'id' = p_item_id LIMIT 1;
  IF v_idx IS NULL THEN RAISE EXCEPTION 'Checklist-item niet gevonden'; END IF;
  IF auth.uid() IS NOT NULL THEN
    SELECT NULLIF(trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), '') INTO v_name
      FROM profiles WHERE id = auth.uid();
  END IF;
  v_name := COALESCE(v_name, 'Medewerker (via QR)');
  IF p_completed THEN
    v_new := (v_list->v_idx) || jsonb_build_object('completed', true, 'completedAt', to_jsonb(now()), 'completedByName', v_name);
  ELSE
    v_new := ((v_list->v_idx) - 'completedAt' - 'completedByName') || jsonb_build_object('completed', false);
  END IF;
  UPDATE vehicles SET details = jsonb_set(COALESCE(details,'{}'::jsonb), ARRAY['preDeliveryChecklist', v_idx::text], v_new)
    WHERE id = v_vid;
  RETURN (SELECT details->'preDeliveryChecklist' FROM vehicles WHERE id = v_vid);
END $$;

REVOKE ALL ON FUNCTION public.get_checklist_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_checklist_item_by_token(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_checklist_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_checklist_item_by_token(text, text, boolean) TO anon, authenticated;