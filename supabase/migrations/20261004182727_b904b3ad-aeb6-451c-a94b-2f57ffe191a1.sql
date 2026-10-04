CREATE OR REPLACE FUNCTION public.guard_vehicle_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_inv int;
  v_parts int;
  v_wo_echt int;
BEGIN
  SELECT count(*) INTO v_inv FROM public.workshop_invoices WHERE vehicle_id = OLD.id;
  SELECT count(*) INTO v_parts FROM public.parts_orders WHERE vehicle_id = OLD.id;
  SELECT count(*) INTO v_wo_echt FROM public.work_orders
   WHERE vehicle_id = OLD.id
     AND NOT (discipline = 'poets' AND status = 'geannuleerd')
     AND ( status NOT IN ('ingepland', 'geannuleerd')
           OR started_at IS NOT NULL
           OR finished_at IS NOT NULL
           OR approved_at IS NOT NULL
           OR COALESCE(work_seconds, 0) > 0 );

  IF v_inv > 0 OR v_parts > 0 OR v_wo_echt > 0 THEN
    RAISE EXCEPTION 'VEHICLE_HAS_WORKSHOP_HISTORY: Dit voertuig kan niet worden verwijderd omdat er al echt werk aan is gedaan (% gestarte/afgeronde werkorder(s), % factu(u)r(en), % onderdelenbestelling(en)). Een inname of nog niet gestarte werkorders blokkeren het verwijderen niet.', v_wo_echt, v_inv, v_parts
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$function$;