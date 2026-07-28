CREATE OR REPLACE FUNCTION public.guard_vehicle_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo int;
  v_inv int;
  v_intake int;
BEGIN
  SELECT count(*) INTO v_wo FROM public.work_orders WHERE vehicle_id = OLD.id;
  SELECT count(*) INTO v_inv FROM public.workshop_invoices WHERE vehicle_id = OLD.id;
  SELECT count(*) INTO v_intake FROM public.vehicle_intakes WHERE vehicle_id = OLD.id;

  IF v_wo > 0 OR v_inv > 0 OR v_intake > 0 THEN
    RAISE EXCEPTION 'VEHICLE_HAS_WORKSHOP_HISTORY: Dit voertuig heeft werkplaats-afspraken of -historie (% werkorder(s), % factu(u)r(en), % inname(s)) en kan niet worden verwijderd.', v_wo, v_inv, v_intake
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS a_guard_vehicle_delete ON public.vehicles;
CREATE TRIGGER a_guard_vehicle_delete
BEFORE DELETE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.guard_vehicle_delete();