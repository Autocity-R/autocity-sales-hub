SET lock_timeout = '10s';

-- 1) Kolommen + check (zelfde opzet als aantal_sleutels)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS aantal_laadkabels smallint,
  ADD COLUMN IF NOT EXISTS laadkabels_geregistreerd_door uuid,
  ADD COLUMN IF NOT EXISTS laadkabels_geregistreerd_op timestamptz;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_aantal_laadkabels_check CHECK (aantal_laadkabels IS NULL OR aantal_laadkabels IN (1, 2));

COMMENT ON COLUMN public.vehicles.aantal_laadkabels IS 'Aantal laadkabels bij inname (1 of 2). NULL = niet geregistreerd.';
COMMENT ON COLUMN public.vehicles.laadkabels_geregistreerd_door IS 'Gezet door trigger bij elke wijziging van aantal_laadkabels.';
COMMENT ON COLUMN public.vehicles.laadkabels_geregistreerd_op IS 'Gezet door trigger bij elke wijziging van aantal_laadkabels.';

-- 2) Logtabel
CREATE TABLE public.vehicle_inname_wijzigingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  veld text NOT NULL CHECK (veld IN ('aantal_sleutels', 'aantal_laadkabels')),
  oud smallint,
  nieuw smallint,
  gewijzigd_door uuid,
  gewijzigd_op timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_inname_wijzigingen_vehicle ON public.vehicle_inname_wijzigingen (vehicle_id, gewijzigd_op DESC);

GRANT SELECT ON public.vehicle_inname_wijzigingen TO authenticated;
GRANT ALL ON public.vehicle_inname_wijzigingen TO service_role;

ALTER TABLE public.vehicle_inname_wijzigingen ENABLE ROW LEVEL SECURITY;

-- Lezen = wie de auto zelf mag zien (vehicles-RLS geldt in de subquery). Schrijven alleen via trigger.
CREATE POLICY "Inname-log lezen als je de auto mag zien"
  ON public.vehicle_inname_wijzigingen FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_inname_wijzigingen.vehicle_id));

-- 3) Wie/wanneer zetten (BEFORE) — nooit handmatig te overschrijven
CREATE OR REPLACE FUNCTION public.vehicle_laadkabels_registratie()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.aantal_laadkabels IS NOT NULL THEN
      NEW.laadkabels_geregistreerd_door := auth.uid();
      NEW.laadkabels_geregistreerd_op := now();
    ELSE
      NEW.laadkabels_geregistreerd_door := NULL;
      NEW.laadkabels_geregistreerd_op := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.aantal_laadkabels IS DISTINCT FROM OLD.aantal_laadkabels THEN
    NEW.laadkabels_geregistreerd_door := auth.uid();
    NEW.laadkabels_geregistreerd_op := now();
  ELSE
    NEW.laadkabels_geregistreerd_door := OLD.laadkabels_geregistreerd_door;
    NEW.laadkabels_geregistreerd_op := OLD.laadkabels_geregistreerd_op;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_vehicle_laadkabels_registratie
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.vehicle_laadkabels_registratie();

-- 4) Log van sleutels + laadkabels (AFTER, SECURITY DEFINER want de log heeft geen schrijf-policy)
CREATE OR REPLACE FUNCTION public.vehicle_inname_wijziging_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.aantal_sleutels IS NOT NULL THEN
      INSERT INTO public.vehicle_inname_wijzigingen (vehicle_id, veld, oud, nieuw, gewijzigd_door)
      VALUES (NEW.id, 'aantal_sleutels', NULL, NEW.aantal_sleutels, auth.uid());
    END IF;
    IF NEW.aantal_laadkabels IS NOT NULL THEN
      INSERT INTO public.vehicle_inname_wijzigingen (vehicle_id, veld, oud, nieuw, gewijzigd_door)
      VALUES (NEW.id, 'aantal_laadkabels', NULL, NEW.aantal_laadkabels, auth.uid());
    END IF;
    RETURN NULL;
  END IF;

  IF NEW.aantal_sleutels IS DISTINCT FROM OLD.aantal_sleutels THEN
    INSERT INTO public.vehicle_inname_wijzigingen (vehicle_id, veld, oud, nieuw, gewijzigd_door)
    VALUES (NEW.id, 'aantal_sleutels', OLD.aantal_sleutels, NEW.aantal_sleutels, auth.uid());
  END IF;
  IF NEW.aantal_laadkabels IS DISTINCT FROM OLD.aantal_laadkabels THEN
    INSERT INTO public.vehicle_inname_wijzigingen (vehicle_id, veld, oud, nieuw, gewijzigd_door)
    VALUES (NEW.id, 'aantal_laadkabels', OLD.aantal_laadkabels, NEW.aantal_laadkabels, auth.uid());
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_vehicle_inname_wijziging_log_ins
  AFTER INSERT ON public.vehicles
  FOR EACH ROW
  WHEN (NEW.aantal_sleutels IS NOT NULL OR NEW.aantal_laadkabels IS NOT NULL)
  EXECUTE FUNCTION public.vehicle_inname_wijziging_log();

CREATE TRIGGER trg_vehicle_inname_wijziging_log_upd
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  WHEN (OLD.aantal_sleutels IS DISTINCT FROM NEW.aantal_sleutels
        OR OLD.aantal_laadkabels IS DISTINCT FROM NEW.aantal_laadkabels)
  EXECUTE FUNCTION public.vehicle_inname_wijziging_log();

-- 5) Historie: inname-wijzigingen als events in voertuig_tijdlijn (blok vóór de werkplaatsorders)
DO $do$
DECLARE
  d text;
BEGIN
  d := pg_get_functiondef('public.voertuig_tijdlijn(uuid, boolean)'::regprocedure);
  IF position('vehicle_inname_wijzigingen' IN d) = 0 THEN
    IF position('  -- ---- werkplaatsorders ----' IN d) = 0 THEN
      RAISE EXCEPTION 'Markering werkplaatsorders niet gevonden in voertuig_tijdlijn';
    END IF;
    d := replace(d, '  -- ---- werkplaatsorders ----', $blk$  -- ---- inname: sleutels / laadkabels (BOUWSTAP 16A) ----
  BEGIN
    RETURN QUERY
    SELECT l.gewijzigd_op, true, 'inname',
           CASE WHEN l.veld = 'aantal_laadkabels' THEN 'laadkabels' ELSE 'sleutels' END,
           'Inname: ' || CASE
             WHEN l.nieuw IS NULL THEN
               CASE WHEN l.veld = 'aantal_laadkabels' THEN 'laadkabels' ELSE 'sleutels' END || ' gewist'
             ELSE
               l.nieuw::text || ' ' ||
               CASE WHEN l.veld = 'aantal_laadkabels'
                    THEN CASE WHEN l.nieuw = 1 THEN 'laadkabel' ELSE 'laadkabels' END
                    ELSE CASE WHEN l.nieuw = 1 THEN 'sleutel' ELSE 'sleutels' END END
               || ' geregistreerd'
           END,
           CASE WHEN l.oud IS NOT NULL THEN 'Was: ' || l.oud::text END,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = l.gewijzigd_door),
           'vehicle_inname_wijzigingen', l.id::text, l.vehicle_id <> v_me.id
    FROM public.vehicle_inname_wijzigingen l
    WHERE l.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- werkplaatsorders ----$blk$);
    EXECUTE d;
  END IF;
END $do$;