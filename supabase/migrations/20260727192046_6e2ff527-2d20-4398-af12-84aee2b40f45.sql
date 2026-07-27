
-- Helper: maak showroom-poets order aan indien nodig (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_showroom_poets_order(_vehicle_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch text;
  v_id uuid;
  v_sort integer;
BEGIN
  IF _vehicle_id IS NULL THEN RETURN NULL; END IF;

  -- openstaande herstelorders blokkeren
  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline IN ('spuit','uitdeuk')
      AND status NOT IN ('goedgekeurd','geannuleerd')
  ) THEN
    RETURN NULL;
  END IF;

  -- bestaande (open) poets-order? dan niets doen
  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline = 'poets'
      AND status NOT IN ('goedgekeurd','geannuleerd')
  ) THEN
    RETURN NULL;
  END IF;

  -- al eerder automatisch aangemaakt en afgehandeld? niet opnieuw
  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE vehicle_id = _vehicle_id
      AND discipline = 'poets'
      AND source = 'inname_auto'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(branch, 'rotterdam') INTO v_branch FROM public.vehicles WHERE id = _vehicle_id;

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
$$;

-- 1. Transport binnenmelding -> automatische inname
CREATE OR REPLACE FUNCTION public.auto_create_intake_on_arrival()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.details->>'transportStatus','') = 'aangekomen'
     AND COALESCE(OLD.details->>'transportStatus','') IS DISTINCT FROM 'aangekomen' THEN

    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_intakes
      WHERE vehicle_id = NEW.id
        AND (status = 'open' OR created_at > now() - INTERVAL '90 days')
    ) THEN
      INSERT INTO public.vehicle_intakes (vehicle_id, status, branch, points)
      VALUES (NEW.id, 'open', COALESCE(NEW.branch, 'rotterdam'), '[]'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_intake_on_arrival ON public.vehicles;
CREATE TRIGGER trg_auto_create_intake_on_arrival
AFTER UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.auto_create_intake_on_arrival();

-- 2. Inname afgerond -> poets indien geen herstelwerk
CREATE OR REPLACE FUNCTION public.on_intake_approved_create_poets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'goedgekeurd' AND OLD.status IS DISTINCT FROM 'goedgekeurd' THEN
    PERFORM public.ensure_showroom_poets_order(NEW.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intake_approved_poets ON public.vehicle_intakes;
CREATE TRIGGER trg_intake_approved_poets
AFTER UPDATE ON public.vehicle_intakes
FOR EACH ROW EXECUTE FUNCTION public.on_intake_approved_create_poets();

-- 3. Laatste herstelorder goedgekeurd -> poets
CREATE OR REPLACE FUNCTION public.on_repair_approved_create_poets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.discipline IN ('spuit','uitdeuk')
     AND NEW.status = 'goedgekeurd'
     AND OLD.status IS DISTINCT FROM 'goedgekeurd' THEN
    -- alleen doorzetten als de inname van dit voertuig is afgerond
    IF EXISTS (
      SELECT 1 FROM public.vehicle_intakes
      WHERE vehicle_id = NEW.vehicle_id AND status = 'goedgekeurd'
    ) THEN
      PERFORM public.ensure_showroom_poets_order(NEW.vehicle_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_approved_poets ON public.work_orders;
CREATE TRIGGER trg_repair_approved_poets
AFTER UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.on_repair_approved_create_poets();
