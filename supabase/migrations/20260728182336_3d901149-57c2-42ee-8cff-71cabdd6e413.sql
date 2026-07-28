CREATE OR REPLACE FUNCTION public.guard_external_workshop_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'extern' THEN
    -- Nooit online / nooit naar portalen
    IF COALESCE((NEW.details->>'showroomOnline')::boolean, false) = true THEN
      NEW.details := jsonb_set(COALESCE(NEW.details, '{}'::jsonb), '{showroomOnline}', 'false'::jsonb);
    END IF;
    NEW.details := jsonb_set(COALESCE(NEW.details, '{}'::jsonb), '{externalWorkshop}', 'true'::jsonb);
    NEW.details := jsonb_set(NEW.details, '{excludeFromStock}', 'true'::jsonb);
    NEW.online_since_date := NULL;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'extern'
     AND NEW.status IN ('voorraad', 'verkocht_b2b', 'verkocht_b2c', 'afgeleverd', 'leenauto') THEN
    RAISE EXCEPTION 'Een extern werkplaats-voertuig kan niet naar een verkoopstatus worden omgezet';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_external_workshop_vehicle ON public.vehicles;
CREATE TRIGGER trg_guard_external_workshop_vehicle
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.guard_external_workshop_vehicle();