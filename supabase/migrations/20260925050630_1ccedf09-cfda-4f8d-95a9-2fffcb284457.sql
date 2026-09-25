CREATE OR REPLACE FUNCTION public.set_vehicle_checklist(p_vehicle_id uuid, p_checklist jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF jsonb_typeof(p_checklist) <> 'array' THEN RAISE EXCEPTION 'Checklist moet een lijst zijn'; END IF;
  UPDATE public.vehicles
     SET details = jsonb_set(coalesce(details, '{}'::jsonb), '{preDeliveryChecklist}', p_checklist)
   WHERE id = p_vehicle_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Geen rechten om deze checklist op te slaan'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_vehicle_checklist(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vehicle_checklist(uuid, jsonb) TO authenticated;