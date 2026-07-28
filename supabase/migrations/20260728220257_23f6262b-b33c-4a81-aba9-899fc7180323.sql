CREATE OR REPLACE FUNCTION public.ensure_showroom_poets_order(_vehicle_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_branch text;
  v_status text;
  v_id uuid;
  v_sort integer;
BEGIN
  IF _vehicle_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(branch, 'rotterdam'), status INTO v_branch, v_status
  FROM public.vehicles WHERE id = _vehicle_id;

  -- B2B-verkochte auto's hoeven niet gepoetst te worden (automatiek slaat over)
  IF v_status = 'verkocht_b2b' THEN
    RETURN NULL;
  END IF;

  -- openstaande herstelorders blokkeren
  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline IN ('spuit','uitdeuk')
      AND status NOT IN ('goedgekeurd','geannuleerd')
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline = 'poets'
      AND status NOT IN ('goedgekeurd','geannuleerd')
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline = 'poets'
      AND source = 'inname_auto'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10 INTO v_sort
  FROM public.work_orders WHERE discipline = 'poets' AND status IN ('ingepland','bezig');

  INSERT INTO public.work_orders (
    vehicle_id, discipline, poets_type, description, status,
    branch, source, origin, sort_order, assigned_to
  ) VALUES (
    _vehicle_id, 'poets', 'showroom', 'Showroom-poets na inname', 'ingepland',
    COALESCE(v_branch, 'rotterdam'), 'inname_auto', 'intern', COALESCE(v_sort, 10), NULL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;