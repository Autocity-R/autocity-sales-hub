-- lovable-cron-fallback-reviewed: eigenaar vraagt expliciet elke 15 min; tijdgebonden (einde werkdag), goedkope SQL-only query, paused_at = exacte eindtijd
CREATE TABLE public.werkplaats_werktijden (
  weekday smallint PRIMARY KEY CHECK (weekday BETWEEN 1 AND 7),
  enabled boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '18:00',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.werkplaats_werktijden TO authenticated;
GRANT ALL ON public.werkplaats_werktijden TO service_role;
ALTER TABLE public.werkplaats_werktijden ENABLE ROW LEVEL SECURITY;
CREATE POLICY werktijden_read ON public.werkplaats_werktijden FOR SELECT TO authenticated USING (true);
CREATE POLICY werktijden_write ON public.werkplaats_werktijden FOR ALL TO authenticated
  USING (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'aftersales_manager') OR has_role(auth.uid(),'operationeel_directeur'))
  WITH CHECK (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'aftersales_manager') OR has_role(auth.uid(),'operationeel_directeur'));
CREATE TRIGGER werktijden_updated_at BEFORE UPDATE ON public.werkplaats_werktijden FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.werkplaats_werktijden (weekday, enabled) VALUES (1,true),(2,true),(3,true),(4,true),(5,true),(6,true),(7,false);

CREATE TABLE public.werkplaats_auto_pauze_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  discipline text,
  assigned_to uuid,
  started_at timestamptz NOT NULL,
  paused_at timestamptz NOT NULL,
  seconds_added integer NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.werkplaats_auto_pauze_log TO authenticated;
GRANT ALL ON public.werkplaats_auto_pauze_log TO service_role;
ALTER TABLE public.werkplaats_auto_pauze_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY auto_pauze_log_read ON public.werkplaats_auto_pauze_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'aftersales_manager') OR has_role(auth.uid(),'operationeel_directeur') OR has_role(auth.uid(),'werkplaats_chef'));

-- Alleen timers die NA dit moment gestart zijn worden automatisch gepauzeerd (bestaande lopende klussen pas na controle).
INSERT INTO public.system_config (key, value, updated_at)
SELECT 'werkplaats_auto_pauze_vanaf', now()::text, now()
WHERE NOT EXISTS (SELECT 1 FROM public.system_config WHERE key = 'werkplaats_auto_pauze_vanaf');

CREATE OR REPLACE FUNCTION public.werkplaats_auto_pauze(p_now timestamptz DEFAULT now(), p_dry_run boolean DEFAULT false)
RETURNS TABLE(work_order_id uuid, discipline text, assigned_to uuid, started_at timestamptz, pause_at timestamptz, seconds_added integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  r record; v_vanaf timestamptz; v_local timestamp; v_wt record; v_pause timestamptz; v_secs integer; v_n integer;
BEGIN
  SELECT NULLIF(value,'')::timestamptz INTO v_vanaf FROM system_config WHERE key = 'werkplaats_auto_pauze_vanaf' LIMIT 1;
  FOR r IN
    SELECT w.id, w.discipline AS disc, w.assigned_to AS who, w.started_at AS st, COALESCE(w.paused_seconds,0) AS ps
    FROM work_orders w
    WHERE w.status = 'bezig' AND w.started_at IS NOT NULL AND w.started_at <= p_now
      AND (v_vanaf IS NULL OR w.started_at >= v_vanaf)
  LOOP
    v_local := r.st AT TIME ZONE 'Europe/Amsterdam';
    SELECT * INTO v_wt FROM werkplaats_werktijden t WHERE t.weekday = extract(isodow FROM v_local)::int;
    IF NOT FOUND OR NOT v_wt.enabled OR v_local::time >= v_wt.end_time THEN
      v_pause := r.st; -- gestart buiten werktijd: niets extra tellen
    ELSE
      v_pause := (v_local::date + v_wt.end_time) AT TIME ZONE 'Europe/Amsterdam';
    END IF;
    CONTINUE WHEN v_pause > p_now;
    v_secs := GREATEST(0, floor(extract(epoch FROM (v_pause - r.st))))::int;
    IF NOT p_dry_run THEN
      UPDATE work_orders SET status = 'gepauzeerd', paused_seconds = r.ps + v_secs, paused_at = v_pause,
        pause_reason = 'Automatisch gepauzeerd: einde werkdag', started_at = NULL
      WHERE id = r.id AND status = 'bezig' AND started_at = r.st;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      CONTINUE WHEN v_n = 0;
      INSERT INTO werkplaats_auto_pauze_log (work_order_id, discipline, assigned_to, started_at, paused_at, seconds_added)
      VALUES (r.id, r.disc, r.who, r.st, v_pause, v_secs);
    END IF;
    work_order_id := r.id; discipline := r.disc; assigned_to := r.who; started_at := r.st; pause_at := v_pause; seconds_added := v_secs;
    RETURN NEXT;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.werkplaats_auto_pauze(timestamptz, boolean) FROM PUBLIC, anon, authenticated;

-- Poetser: eigen beurt pauzeren/hervatten
CREATE POLICY wo_select_poetser_gepauzeerd ON public.work_orders FOR SELECT TO authenticated
  USING (werkplaats_rol() = 'poetser' AND discipline = 'poets' AND status = 'gepauzeerd' AND assigned_to = auth.uid());
CREATE POLICY wo_update_poetser_pauze ON public.work_orders FOR UPDATE TO authenticated
  USING (werkplaats_rol() = 'poetser' AND discipline = 'poets' AND status = 'gepauzeerd' AND assigned_to = auth.uid())
  WITH CHECK (werkplaats_rol() = 'poetser' AND discipline = 'poets' AND status = 'gepauzeerd' AND assigned_to = auth.uid());

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'werkplaats-auto-pauze') THEN PERFORM cron.unschedule('werkplaats-auto-pauze'); END IF;
END $$;
SELECT cron.schedule('werkplaats-auto-pauze', '*/15 * * * *', $$SELECT public.werkplaats_auto_pauze()$$);