SET lock_timeout = '10s';

-- 1. Kolommen + constraints
ALTER TABLE public.workshop_invoices
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'factuur',
  ADD COLUMN IF NOT EXISTS credit_van_invoice_id uuid REFERENCES public.workshop_invoices(id),
  ADD COLUMN IF NOT EXISTS credit_reden text,
  ADD COLUMN IF NOT EXISTS gecrediteerd_door uuid,
  ADD COLUMN IF NOT EXISTS gecrediteerd_op timestamptz;

ALTER TABLE public.workshop_invoices
  ADD CONSTRAINT workshop_invoices_document_type_check CHECK (document_type IN ('factuur','creditfactuur')),
  ADD CONSTRAINT workshop_invoices_credit_koppeling_check CHECK ((document_type = 'creditfactuur') = (credit_van_invoice_id IS NOT NULL)),
  DROP CONSTRAINT workshop_invoices_status_check,
  ADD CONSTRAINT workshop_invoices_status_check CHECK (status IN ('concept','verstuurd','definitief'));

CREATE INDEX IF NOT EXISTS workshop_invoices_credit_van_idx
  ON public.workshop_invoices (credit_van_invoice_id) WHERE credit_van_invoice_id IS NOT NULL;

-- 2. Bedrag als tekst voor meldingen
CREATE OR REPLACE FUNCTION public._eur(p numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT '€ ' || replace(to_char(round(coalesce(p,0), 2), 'FM999999990.00'), '.', ',')
$$;

-- 3. Guard: creditfacturen alleen via de RPC, daarna niet meer aan te passen of te verwijderen
CREATE OR REPLACE FUNCTION public.workshop_invoice_credit_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_rpc boolean := coalesce(current_setting('app.factuur_crediteren', true), '') = '1';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.document_type = 'creditfactuur' THEN
      RAISE EXCEPTION 'Een creditfactuur kan niet worden verwijderd';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.document_type = 'creditfactuur' AND NOT v_rpc THEN
      RAISE EXCEPTION 'Creditfacturen worden alleen aangemaakt via Crediteren';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT v_rpc AND (
       NEW.document_type IS DISTINCT FROM OLD.document_type
    OR NEW.credit_van_invoice_id IS DISTINCT FROM OLD.credit_van_invoice_id
    OR NEW.credit_reden IS DISTINCT FROM OLD.credit_reden
    OR NEW.gecrediteerd_door IS DISTINCT FROM OLD.gecrediteerd_door
    OR NEW.gecrediteerd_op IS DISTINCT FROM OLD.gecrediteerd_op) THEN
    RAISE EXCEPTION 'Creditgegevens kunnen niet handmatig worden gewijzigd';
  END IF;
  IF OLD.document_type = 'creditfactuur' AND NOT v_rpc AND (
       NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
    OR NEW.invoice_kind IS DISTINCT FROM OLD.invoice_kind
    OR NEW.lines IS DISTINCT FROM OLD.lines
    OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.vat IS DISTINCT FROM OLD.vat
    OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.customer IS DISTINCT FROM OLD.customer
    OR NEW.vehicle IS DISTINCT FROM OLD.vehicle
    OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
    OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id
    OR NEW.source_work_order_ids IS DISTINCT FROM OLD.source_work_order_ids
    OR NEW.branch IS DISTINCT FROM OLD.branch
    OR NEW.tak IS DISTINCT FROM OLD.tak
    OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Een creditfactuur kan niet worden aangepast';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_workshop_invoice_credit_guard ON public.workshop_invoices;
CREATE TRIGGER trg_workshop_invoice_credit_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.workshop_invoices
  FOR EACH ROW EXECUTE FUNCTION public.workshop_invoice_credit_guard();

-- 4. Omzetdatum/tak: creditfactuur = dag van creditering (NL), tak van het origineel
CREATE OR REPLACE FUNCTION public.workshop_invoice_fill_omzet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_ids uuid[] := public.invoice_order_ids(NEW.source_work_order_ids, NEW.work_order_id);
  v_spuit boolean; v_appr timestamptz; v_done timestamptz; v_sl boolean; v_orig_tak text;
BEGIN
  IF NEW.document_type = 'creditfactuur' THEN
    SELECT o.tak INTO v_orig_tak FROM public.workshop_invoices o WHERE o.id = NEW.credit_van_invoice_id;
    NEW.tak := COALESCE(v_orig_tak, NEW.tak);
    NEW.omzet_datum := (COALESCE(NEW.created_at, now()) AT TIME ZONE 'Europe/Amsterdam')::date;
    IF NEW.tak IS NOT NULL THEN RETURN NEW; END IF;
  END IF;
  SELECT bool_or(w.discipline = 'spuit'), max(w.approved_at), max(COALESCE(w.finished_at, w.approved_at))
    INTO v_spuit, v_appr, v_done
    FROM public.work_orders w WHERE w.id = ANY(v_ids);
  IF NEW.tak IS NULL THEN
    v_sl := EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.lines,'[]'::jsonb)) l
                    WHERE jsonb_typeof(l) = 'object' AND lower(COALESCE(l->>'description','')) LIKE 'schadeherstel%');
    NEW.tak := CASE
      WHEN NEW.invoice_kind = 'poets_intern' THEN 'poets'
      WHEN COALESCE(v_spuit,false) OR (NEW.invoice_kind = 'intern' AND v_sl) THEN 'schadeherstel'
      ELSE 'werkplaats' END;
  END IF;
  IF NEW.omzet_datum IS NULL THEN
    NEW.omzet_datum := (CASE
      WHEN NEW.invoice_kind = 'intern' THEN COALESCE(v_appr, NEW.created_at, now())
      WHEN NEW.invoice_kind = 'poets_intern' THEN COALESCE(v_done, NEW.created_at, now())
      ELSE COALESCE(NEW.created_at, now()) END AT TIME ZONE 'Europe/Amsterdam')::date;
  END IF;
  RETURN NEW;
END $function$;

-- 5. Telregel: creditfactuur telt altijd mee (tenzij telt_niet_mee); toerekening via dezelfde gekoppelde orders
CREATE OR REPLACE FUNCTION public.omzet_regels(p_van date, p_tot date, p_branch text DEFAULT NULL::text)
 RETURNS TABLE(invoice_id uuid, invoice_number text, invoice_kind text, tak text, omzet_datum date, subtotal numeric, total numeric, status text, branch text, created_at timestamp with time zone, klant text, kenteken text, telt_mee boolean, telt_niet_mee boolean, telt_niet_mee_reden text, gekoppeld boolean, work_order_id uuid, discipline text, medewerker_id uuid, aandeel_delen integer, bedrag numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH inv AS (
    SELECT i.*, public.invoice_order_ids(i.source_work_order_ids, i.work_order_id) AS ids,
      (NOT i.telt_niet_mee AND (i.document_type = 'creditfactuur' OR i.status <> 'concept' OR i.invoice_kind IN ('intern','poets_intern'))) AS meetellen
    FROM public.workshop_invoices i
    WHERE i.omzet_datum >= p_van AND i.omzet_datum < p_tot
      AND (p_branch IS NULL OR i.branch = p_branch)
  ),
  alloc AS (
    SELECT inv.id AS inv_id, w.id AS wo_id, w.discipline, w.assigned_to,
      CASE WHEN inv.tak = 'schadeherstel' AND w.discipline = 'spuit'
        THEN GREATEST(1, CASE WHEN jsonb_typeof(w.parts) = 'array' THEN jsonb_array_length(w.parts) ELSE 0 END)
        ELSE 1 END AS gewicht
    FROM inv JOIN public.work_orders w ON w.id = ANY(inv.ids)
  ),
  tot AS (SELECT inv_id, sum(gewicht) AS g FROM alloc GROUP BY inv_id)
  SELECT inv.id, inv.invoice_number, inv.invoice_kind, inv.tak, inv.omzet_datum,
    inv.subtotal, inv.total, inv.status, inv.branch, inv.created_at,
    inv.customer->>'name', NULLIF(inv.vehicle->>'license_number',''),
    inv.meetellen, inv.telt_niet_mee, inv.telt_niet_mee_reden,
    (cardinality(inv.ids) > 0),
    a.wo_id, a.discipline, a.assigned_to, a.gewicht,
    CASE WHEN a.inv_id IS NULL THEN inv.subtotal
         ELSE round(inv.subtotal * a.gewicht / NULLIF(t.g,0), 2) END
  FROM inv
  LEFT JOIN alloc a ON a.inv_id = inv.id
  LEFT JOIN tot t ON t.inv_id = inv.id
$function$;

-- 6. Crediteren (interne functie met injecteerbaar nummer voor tests; niet aanroepbaar door gebruikers)
CREATE OR REPLACE FUNCTION public.factuur_crediteren_intern(
  p_invoice_id uuid, p_modus text, p_regels jsonb, p_bedrag_excl numeric,
  p_reden text, p_dry_run boolean, p_nummer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  o public.workshop_invoices%ROWTYPE;
  v_reden text := nullif(btrim(coalesce(p_reden, '')), '');
  v_cred_n int; v_cred_sub numeric; v_cred_vat numeric; v_cred_tot numeric;
  v_rest_sub numeric; v_rest_vat numeric; v_rest_tot numeric;
  v_lines jsonb := '[]'::jsonb;
  v_excl numeric := 0; v_vat numeric; v_tot numeric;
  v_sel jsonb; v_idx int; v_amt numeric; v_line_cred numeric; v_line_rest numeric; v_bedrag numeric;
  v_seen int[] := '{}';
  v_n_lines int;
  v_tekst text; v_num text; v_id uuid; v_status text; v_datum text;
  r record;
BEGIN
  IF v_uid IS NULL OR NOT (public.has_role(v_uid, 'owner') OR public.has_role(v_uid, 'admin')
     OR public.has_role(v_uid, 'aftersales_manager') OR public.has_role(v_uid, 'operationeel_directeur')) THEN
    RAISE EXCEPTION 'Geen rechten om facturen te crediteren';
  END IF;
  IF p_modus IS NULL OR p_modus NOT IN ('volledig', 'regels', 'bedrag') THEN
    RAISE EXCEPTION 'Kies hoe je wilt crediteren: hele factuur, regels of bedrag';
  END IF;
  IF v_reden IS NULL THEN
    RAISE EXCEPTION 'Geef een reden voor de creditering op';
  END IF;

  IF p_dry_run THEN
    SELECT * INTO o FROM public.workshop_invoices WHERE id = p_invoice_id;
  ELSE
    SELECT * INTO o FROM public.workshop_invoices WHERE id = p_invoice_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factuur niet gevonden'; END IF;
  IF o.document_type = 'creditfactuur' THEN
    RAISE EXCEPTION 'Een creditfactuur kan zelf niet gecrediteerd worden';
  END IF;
  IF o.status = 'concept' THEN
    RAISE EXCEPTION 'Factuur % is nog een concept; pas het concept aan in plaats van te crediteren', coalesce(o.invoice_number, '(concept)');
  END IF;
  IF o.telt_niet_mee THEN
    RAISE EXCEPTION 'Factuur % telt niet mee in de omzet (reden: %); crediteren is daarom niet mogelijk', o.invoice_number, coalesce(nullif(o.telt_niet_mee_reden, ''), 'geen reden opgegeven');
  END IF;

  SELECT count(*), coalesce(sum(c.subtotal), 0), coalesce(sum(c.vat), 0), coalesce(sum(c.total), 0)
    INTO v_cred_n, v_cred_sub, v_cred_vat, v_cred_tot
    FROM public.workshop_invoices c WHERE c.credit_van_invoice_id = o.id;
  v_rest_sub := round(o.subtotal + v_cred_sub, 2);
  v_rest_vat := round(o.vat + v_cred_vat, 2);
  v_rest_tot := round(o.total + v_cred_tot, 2);
  IF v_rest_sub <= 0 THEN
    RAISE EXCEPTION 'Factuur % is al volledig gecrediteerd', o.invoice_number;
  END IF;

  v_n_lines := CASE WHEN jsonb_typeof(o.lines) = 'array' THEN jsonb_array_length(o.lines) ELSE 0 END;

  IF p_modus = 'volledig' THEN
    IF v_cred_n > 0 THEN
      RAISE EXCEPTION 'Op factuur % is al % gecrediteerd; crediteer de rest (%) via "Bedrag" of "Regels kiezen"',
        o.invoice_number, public._eur(-v_cred_sub), public._eur(v_rest_sub);
    END IF;
    FOR r IN SELECT t.e AS l, (t.n - 1)::int AS idx
             FROM jsonb_array_elements(CASE WHEN v_n_lines > 0 THEN o.lines ELSE '[]'::jsonb END) WITH ORDINALITY t(e, n) LOOP
      v_amt := coalesce(nullif(r.l->>'amount', '')::numeric, 0);
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'description', 'Creditering: ' || coalesce(nullif(r.l->>'description', ''), 'regel ' || (r.idx + 1)),
        'amount', -v_amt, 'credit_van_regel', r.idx));
    END LOOP;
    v_excl := o.subtotal;
  ELSIF p_modus = 'regels' THEN
    IF p_regels IS NULL OR jsonb_typeof(p_regels) <> 'array' OR jsonb_array_length(p_regels) = 0 THEN
      RAISE EXCEPTION 'Kies minimaal één regel om te crediteren';
    END IF;
    FOR v_sel IN SELECT * FROM jsonb_array_elements(p_regels) LOOP
      v_idx := nullif(v_sel->>'index', '')::int;
      IF v_idx IS NULL OR v_idx < 0 OR v_idx >= v_n_lines THEN
        RAISE EXCEPTION 'Onbekende factuurregel %', coalesce(v_sel->>'index', '?');
      END IF;
      IF v_idx = ANY (v_seen) THEN RAISE EXCEPTION 'Regel % is dubbel gekozen', v_idx + 1; END IF;
      v_seen := v_seen || v_idx;
      v_amt := coalesce(nullif(o.lines->v_idx->>'amount', '')::numeric, 0);
      IF v_amt <= 0 THEN
        RAISE EXCEPTION 'Regel % heeft geen positief bedrag en kan niet gecrediteerd worden', v_idx + 1;
      END IF;
      SELECT coalesce(-sum(nullif(cl->>'amount', '')::numeric), 0) INTO v_line_cred
        FROM public.workshop_invoices c, jsonb_array_elements(c.lines) cl
       WHERE c.credit_van_invoice_id = o.id AND jsonb_typeof(cl) = 'object'
         AND nullif(cl->>'credit_van_regel', '')::int = v_idx;
      v_line_rest := round(v_amt - v_line_cred, 2);
      v_bedrag := round(coalesce(nullif(v_sel->>'bedrag', '')::numeric, v_line_rest), 2);
      IF v_bedrag <= 0 THEN
        RAISE EXCEPTION 'Het bedrag voor regel % moet groter dan € 0 zijn', v_idx + 1;
      END IF;
      IF v_bedrag > v_line_rest THEN
        RAISE EXCEPTION 'Regel %: % is meer dan er op die regel nog te crediteren is (%)', v_idx + 1, public._eur(v_bedrag), public._eur(v_line_rest);
      END IF;
      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'description', 'Creditering: ' || coalesce(nullif(o.lines->v_idx->>'description', ''), 'regel ' || (v_idx + 1))
                       || CASE WHEN v_bedrag < v_amt THEN ' (gedeeltelijk)' ELSE '' END,
        'amount', -v_bedrag, 'credit_van_regel', v_idx));
      v_excl := v_excl + v_bedrag;
    END LOOP;
  ELSE
    v_excl := round(coalesce(p_bedrag_excl, 0), 2);
    IF v_excl <= 0 THEN RAISE EXCEPTION 'Het bedrag moet groter dan € 0 zijn'; END IF;
    v_lines := jsonb_build_array(jsonb_build_object(
      'description', 'Creditering factuur ' || o.invoice_number || ': ' || v_reden,
      'amount', -v_excl));
  END IF;

  v_excl := round(v_excl, 2);
  IF v_excl <= 0 THEN RAISE EXCEPTION 'Het bedrag moet groter dan € 0 zijn'; END IF;
  IF v_excl > v_rest_sub THEN
    RAISE EXCEPTION 'Je crediteert % excl. btw, maar op factuur % staat nog maar % te crediteren', public._eur(v_excl), o.invoice_number, public._eur(v_rest_sub);
  END IF;

  -- btw zoals in het origineel; de laatste credit maakt btw en totaal exact nul
  IF v_excl = v_rest_sub THEN
    v_vat := v_rest_vat; v_tot := v_rest_tot;
  ELSIF o.invoice_kind = 'poets_intern' THEN
    v_tot := round(v_excl * 100 / 82.64, 2); v_vat := v_tot - v_excl;
  ELSIF o.subtotal <> 0 AND abs(o.vat / o.subtotal - 0.21) < 0.001 THEN
    v_vat := round(v_excl * 0.21, 2); v_tot := v_excl + v_vat;
  ELSE
    v_vat := round(v_excl * coalesce(o.vat / nullif(o.subtotal, 0), 0), 2); v_tot := v_excl + v_vat;
  END IF;

  v_datum := to_char(o.created_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY');
  v_tekst := 'Creditering van factuur ' || o.invoice_number || ' d.d. ' || v_datum || '. Reden: ' || v_reden;
  v_status := CASE WHEN o.invoice_kind IN ('intern', 'poets_intern') THEN 'concept' ELSE 'definitief' END;

  IF NOT p_dry_run THEN
    v_num := coalesce(p_nummer, public.next_workshop_invoice_number());
    PERFORM set_config('app.factuur_crediteren', '1', true);
    INSERT INTO public.workshop_invoices (
      invoice_number, document_type, credit_van_invoice_id, credit_reden, gecrediteerd_door, gecrediteerd_op,
      invoice_kind, tak, branch, customer, vehicle, vehicle_id, work_order_id, source_work_order_ids,
      lines, subtotal, vat, total, status, payment_status, pdf_path, created_by, sent_at, telt_niet_mee
    ) VALUES (
      v_num, 'creditfactuur', o.id, v_reden, v_uid, now(),
      o.invoice_kind, o.tak, o.branch, o.customer, o.vehicle, o.vehicle_id, o.work_order_id, o.source_work_order_ids,
      v_lines, -v_excl, -v_vat, -v_tot, v_status, 'nvt',
      CASE WHEN v_status = 'definitief' THEN v_num || '.pdf' END,
      (SELECT p.id FROM public.profiles p WHERE p.id = v_uid), NULL, false
    ) RETURNING id INTO v_id;
    PERFORM set_config('app.factuur_crediteren', '', true);
  END IF;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'invoice_id', v_id,
    'invoice_number', v_num,
    'modus', p_modus,
    'status', v_status,
    'invoice_kind', o.invoice_kind,
    'origineel', jsonb_build_object('id', o.id, 'invoice_number', o.invoice_number, 'datum', v_datum,
                                    'subtotal', o.subtotal, 'vat', o.vat, 'total', o.total, 'payment_status', o.payment_status),
    'regels', v_lines,
    'subtotal', -v_excl, 'vat', -v_vat, 'total', -v_tot,
    'al_gecrediteerd_excl', round(-v_cred_sub, 2),
    'nog_te_crediteren_voor', v_rest_sub,
    'nog_te_crediteren_na', round(v_rest_sub - v_excl, 2),
    'volledig_gecrediteerd_na', round(v_rest_sub - v_excl, 2) = 0,
    'document_tekst', v_tekst
  );
END $$;

CREATE OR REPLACE FUNCTION public.factuur_crediteren(
  p_invoice_id uuid, p_modus text, p_regels jsonb DEFAULT NULL, p_bedrag_excl numeric DEFAULT NULL,
  p_reden text DEFAULT NULL, p_dry_run boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.factuur_crediteren_intern(p_invoice_id, p_modus, p_regels, p_bedrag_excl, p_reden, p_dry_run, NULL)
$$;

-- 7. Betaalstatus (bestond nog niet in de database); creditfacturen uitgesloten
CREATE OR REPLACE FUNCTION public.factuur_betaalstatus_zetten(p_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur'])) THEN
    RAISE EXCEPTION 'Geen rechten om de betaalstatus te wijzigen';
  END IF;
  IF p_status NOT IN ('open','betaald') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.workshop_invoices
     SET payment_status = p_status, paid_at = CASE WHEN p_status = 'betaald' THEN now() ELSE NULL END
   WHERE id = p_id AND invoice_kind NOT IN ('intern') AND payment_status <> 'nvt' AND document_type = 'factuur';
  IF NOT FOUND THEN RAISE EXCEPTION 'Factuur niet gevonden of betaling n.v.t.'; END IF;
END $$;

-- 8. Historie per auto: creditfactuur herkenbaar
DO $do$
DECLARE d text; v_old text := '''Factuur '' || coalesce(wi.invoice_number, ''(concept)'')';
BEGIN
  d := pg_get_functiondef('public.voertuig_tijdlijn(uuid,boolean)'::regprocedure);
  IF position(v_old IN d) = 0 THEN RAISE EXCEPTION 'tijdlijn-marker niet gevonden'; END IF;
  d := replace(d, v_old, 'CASE WHEN wi.document_type = ''creditfactuur'' THEN ''Creditfactuur '' ELSE ''Factuur '' END || coalesce(wi.invoice_number, ''(concept)'')');
  EXECUTE d;
END $do$;

-- 9. Rechten
REVOKE ALL ON FUNCTION public.factuur_crediteren_intern(uuid, text, jsonb, numeric, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.factuur_crediteren_intern(uuid, text, jsonb, numeric, text, boolean, text) TO service_role;
REVOKE ALL ON FUNCTION public.factuur_crediteren(uuid, text, jsonb, numeric, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factuur_crediteren(uuid, text, jsonb, numeric, text, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.factuur_betaalstatus_zetten(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factuur_betaalstatus_zetten(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.workshop_invoice_credit_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._eur(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._eur(numeric) TO authenticated, service_role;