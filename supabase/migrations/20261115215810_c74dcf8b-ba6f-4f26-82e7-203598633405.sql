SET lock_timeout = '10s';

-- 1. Tijdregels per persoon
CREATE TABLE public.work_order_tijdregels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  gestart_op timestamptz NOT NULL,
  gestopt_op timestamptz NULL,
  stop_reden text NULL CHECK (stop_reden IS NULL OR stop_reden IN ('pauze','auto_pauze','klaar','overgenomen','geannuleerd','goedgekeurd')),
  vooraf_seconden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_order_tijdregels_order_idx ON public.work_order_tijdregels (work_order_id);
CREATE INDEX work_order_tijdregels_user_idx ON public.work_order_tijdregels (user_id, gestart_op);
CREATE INDEX work_order_tijdregels_gestart_idx ON public.work_order_tijdregels (gestart_op);
CREATE UNIQUE INDEX work_order_tijdregels_een_open ON public.work_order_tijdregels (work_order_id) WHERE gestopt_op IS NULL;

GRANT SELECT ON public.work_order_tijdregels TO authenticated;
GRANT ALL ON public.work_order_tijdregels TO service_role;
ALTER TABLE public.work_order_tijdregels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tijdregels lezen: leiding of eigen regels" ON public.work_order_tijdregels
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.werkplaats_rol() IN ('owner','admin','manager','aftersales_manager','werkplaats_chef','operationeel_directeur')
  );

-- 2. Overnames-log
CREATE TABLE public.work_order_overnames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  van_user_id uuid NULL REFERENCES public.profiles(id),
  naar_user_id uuid NOT NULL REFERENCES public.profiles(id),
  overgenomen_op timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX work_order_overnames_order_idx ON public.work_order_overnames (work_order_id, overgenomen_op);

GRANT SELECT ON public.work_order_overnames TO authenticated;
GRANT ALL ON public.work_order_overnames TO service_role;
ALTER TABLE public.work_order_overnames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Overnames lezen als je de werkorder mag zien" ON public.work_order_overnames
  FOR SELECT TO authenticated
  USING (
    van_user_id = auth.uid() OR naar_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_id)
  );

-- 3. Trigger: tijdregels bijhouden
CREATE OR REPLACE FUNCTION public.work_order_tijdregel_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_stop timestamptz;
  v_reden text;
BEGIN
  BEGIN
    v_user := COALESCE(NEW.assigned_to, auth.uid());

    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'bezig' AND v_user IS NOT NULL THEN
        INSERT INTO work_order_tijdregels (work_order_id, user_id, gestart_op, vooraf_seconden)
        VALUES (NEW.id, v_user, COALESCE(NEW.started_at, now()), COALESCE(NEW.paused_seconds, 0))
        ON CONFLICT (work_order_id) WHERE gestopt_op IS NULL DO NOTHING;
      END IF;
      RETURN NULL;
    END IF;

    IF OLD.status = 'bezig' AND NEW.status IS DISTINCT FROM 'bezig' THEN
      -- verlaat 'bezig': open regel sluiten
      v_stop := CASE NEW.status
        WHEN 'gepauzeerd' THEN COALESCE(NEW.paused_at, now())
        WHEN 'afgerond' THEN COALESCE(NEW.finished_at, now())
        ELSE now() END;
      v_reden := CASE NEW.status
        WHEN 'gepauzeerd' THEN CASE WHEN COALESCE(NEW.pause_reason, '') ILIKE 'Automatisch%' THEN 'auto_pauze' ELSE 'pauze' END
        WHEN 'afgerond' THEN 'klaar'
        WHEN 'goedgekeurd' THEN 'goedgekeurd'
        WHEN 'geannuleerd' THEN 'geannuleerd'
        ELSE 'pauze' END;
      UPDATE work_order_tijdregels
         SET gestopt_op = GREATEST(gestart_op, v_stop), stop_reden = v_reden
       WHERE work_order_id = NEW.id AND gestopt_op IS NULL;

    ELSIF OLD.status IS DISTINCT FROM 'bezig' AND NEW.status = 'bezig' THEN
      -- start of hervatten: eventuele achtergebleven open regel sluiten, nieuwe openen
      UPDATE work_order_tijdregels
         SET gestopt_op = GREATEST(gestart_op, COALESCE(NEW.started_at, now())), stop_reden = 'pauze'
       WHERE work_order_id = NEW.id AND gestopt_op IS NULL;
      IF v_user IS NOT NULL THEN
        INSERT INTO work_order_tijdregels (work_order_id, user_id, gestart_op, vooraf_seconden)
        VALUES (NEW.id, v_user, COALESCE(NEW.started_at, now()), COALESCE(OLD.paused_seconds, 0))
        ON CONFLICT (work_order_id) WHERE gestopt_op IS NULL DO NOTHING;
      END IF;

    ELSIF OLD.status = 'bezig' AND NEW.status = 'bezig' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      -- andere uitvoerder terwijl er gewerkt wordt
      UPDATE work_order_tijdregels
         SET gestopt_op = GREATEST(gestart_op, now()), stop_reden = 'overgenomen'
       WHERE work_order_id = NEW.id AND gestopt_op IS NULL;
      IF v_user IS NOT NULL THEN
        INSERT INTO work_order_tijdregels (work_order_id, user_id, gestart_op, vooraf_seconden)
        VALUES (NEW.id, v_user, now(), COALESCE(NEW.paused_seconds, 0))
        ON CONFLICT (work_order_id) WHERE gestopt_op IS NULL DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- de timer op de vloer mag nooit blokkeren door de urenregistratie
    RAISE WARNING 'work_order_tijdregel_sync faalde voor %: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.work_order_tijdregel_sync() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_work_order_tijdregel_upd
  AFTER UPDATE OF status, assigned_to ON public.work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION public.work_order_tijdregel_sync();

CREATE TRIGGER trg_work_order_tijdregel_ins
  AFTER INSERT ON public.work_orders
  FOR EACH ROW
  WHEN (NEW.status = 'bezig')
  EXECUTE FUNCTION public.work_order_tijdregel_sync();

-- 4. Generiek overnemen
CREATE OR REPLACE FUNCTION public.werkorder_overnemen(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rol text := public.werkplaats_rol();
  w record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;

  SELECT id, discipline, status, assigned_to, branch INTO w
  FROM work_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Klus niet gevonden'; END IF;

  IF w.discipline = 'spuit' THEN
    IF v_rol NOT IN ('schadeherstel','owner','admin','manager','aftersales_manager','werkplaats_chef') THEN
      RAISE EXCEPTION 'Geen rechten om over te nemen';
    END IF;
  ELSIF w.discipline = 'werkplaats' THEN
    IF v_rol NOT IN ('monteur','werkplaats_chef','aftersales_manager','owner','admin','manager') THEN
      RAISE EXCEPTION 'Geen rechten om over te nemen';
    END IF;
    IF v_rol = 'monteur' AND w.branch IS NOT NULL AND w.branch IS DISTINCT FROM public.current_user_branch() THEN
      RAISE EXCEPTION 'Deze klus hoort bij een andere vestiging';
    END IF;
  ELSE
    RAISE EXCEPTION 'Overnemen kan alleen bij werkplaats- en schadeherstelklussen';
  END IF;

  IF w.status <> 'gepauzeerd' THEN RAISE EXCEPTION 'Klus is niet (meer) gepauzeerd'; END IF;
  IF w.assigned_to = v_uid THEN RAISE EXCEPTION 'Dit is al jouw klus'; END IF;

  UPDATE work_orders SET assigned_to = v_uid WHERE id = p_id AND status = 'gepauzeerd';
  INSERT INTO work_order_overnames (work_order_id, van_user_id, naar_user_id) VALUES (p_id, w.assigned_to, v_uid);
END $$;

REVOKE EXECUTE ON FUNCTION public.werkorder_overnemen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.werkorder_overnemen(uuid) TO authenticated;

-- spuit_overnemen blijft (gepubliceerde frontend) en gebruikt de generieke functie
CREATE OR REPLACE FUNCTION public.spuit_overnemen(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.werkplaats_rol() NOT IN ('schadeherstel','owner','admin','manager','aftersales_manager','werkplaats_chef') THEN
    RAISE EXCEPTION 'Geen rechten om over te nemen';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE id = p_id AND discipline = 'spuit') THEN
    RAISE EXCEPTION 'Klus is niet (meer) gepauzeerd';
  END IF;
  PERFORM public.werkorder_overnemen(p_id);
END $$;

-- 5. Monteurs zien gepauzeerde werkplaatsklussen van collega's (eigen vestiging) om over te nemen
CREATE POLICY wo_select_monteur_gepauzeerd ON public.work_orders
  FOR SELECT TO authenticated
  USING (
    public.werkplaats_rol() = 'monteur'
    AND discipline = 'werkplaats'
    AND status = 'gepauzeerd'
    AND (branch IS NULL OR branch = public.current_user_branch())
  );

-- 6. Historie per auto: overnames
DO $do$
DECLARE
  v_def text;
  v_marker text := '  -- ---- werkplaatsorders ----';
  v_block text := $blk$  -- ---- werkorder overgenomen ----
  BEGIN
    RETURN QUERY
    SELECT o.overgenomen_op, true, 'werkplaats', 'order_overgenomen',
           'Overgenomen van ' || coalesce((SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = o.van_user_id), 'onbekend')
             || ' door ' || coalesce((SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = o.naar_user_id), 'onbekend'),
           public._discipline_label(w.discipline),
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = o.naar_user_id),
           'work_order_overnames', o.id::text, w.vehicle_id <> v_me.id
    FROM public.work_order_overnames o
    JOIN public.work_orders w ON w.id = o.work_order_id
    WHERE w.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

$blk$;
BEGIN
  v_def := pg_get_functiondef('public.voertuig_tijdlijn(uuid, boolean)'::regprocedure);
  IF position(v_marker IN v_def) = 0 THEN
    RAISE EXCEPTION 'marker niet gevonden in voertuig_tijdlijn';
  END IF;
  IF position('order_overgenomen' IN v_def) = 0 THEN
    v_def := replace(v_def, v_marker, v_block || v_marker);
    EXECUTE v_def;
  END IF;
END $do$;