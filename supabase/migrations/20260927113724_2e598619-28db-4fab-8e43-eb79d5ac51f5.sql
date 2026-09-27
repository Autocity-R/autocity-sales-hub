-- Repo-sync van live-migratie 'werkplaats_auto_pauze_poets_pas_na_publiceren' (idempotent).
-- Poets-werkorders alleen automatisch pauzeren als system_config.werkplaats_auto_pauze_poets = 'aan'
-- (standaard 'uit' zolang de gepubliceerde app nog geen Hervatten-knop voor poetsers heeft).
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('werkplaats_auto_pauze_poets', 'uit', now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.werkplaats_auto_pauze(p_now timestamp with time zone DEFAULT now(), p_dry_run boolean DEFAULT false)
RETURNS TABLE(work_order_id uuid, discipline text, assigned_to uuid, started_at timestamp with time zone, pause_at timestamp with time zone, seconds_added integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
#variable_conflict use_column
DECLARE
  r record; v_vanaf timestamptz; v_poets boolean; v_local timestamp; v_wt record; v_pause timestamptz; v_secs integer; v_n integer;
BEGIN
  SELECT NULLIF(value,'')::timestamptz INTO v_vanaf FROM system_config WHERE key = 'werkplaats_auto_pauze_vanaf' LIMIT 1;
  SELECT COALESCE((SELECT value FROM system_config WHERE key = 'werkplaats_auto_pauze_poets' LIMIT 1), 'uit') = 'aan' INTO v_poets;
  FOR r IN
    SELECT w.id, w.discipline AS disc, w.assigned_to AS who, w.started_at AS st, COALESCE(w.paused_seconds,0) AS ps
    FROM work_orders w
    WHERE w.status = 'bezig' AND w.started_at IS NOT NULL AND w.started_at <= p_now
      AND (v_vanaf IS NULL OR w.started_at >= v_vanaf)
      AND (v_poets OR w.discipline <> 'poets')
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