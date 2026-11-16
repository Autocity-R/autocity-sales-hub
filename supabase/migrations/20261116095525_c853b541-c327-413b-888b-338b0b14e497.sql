-- Interne tarieven (vanaf 16-11-2026, NL-dag)
CREATE OR REPLACE FUNCTION public.intern_tarief_vanaf()
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT DATE '2026-11-16' $$;

CREATE OR REPLACE FUNCTION public.intern_deel_prijs(p_part text, p_op timestamptz DEFAULT now())
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN coalesce(p_part, '') ~* 'velg'
               AND (p_op AT TIME ZONE 'Europe/Amsterdam')::date >= public.intern_tarief_vanaf()
              THEN 100.00 ELSE 300.00 END
$$;

CREATE OR REPLACE FUNCTION public.poets_prijs_excl(p_op timestamptz)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN (p_op AT TIME ZONE 'Europe/Amsterdam')::date >= public.intern_tarief_vanaf() THEN 100.00 ELSE 82.64 END
$$;

CREATE OR REPLACE FUNCTION public.poets_prijs_incl(p_op timestamptz)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN (p_op AT TIME ZONE 'Europe/Amsterdam')::date >= public.intern_tarief_vanaf() THEN 121.00 ELSE 100.00 END
$$;

GRANT EXECUTE ON FUNCTION public.intern_tarief_vanaf() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.intern_deel_prijs(text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.poets_prijs_excl(timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.poets_prijs_incl(timestamptz) TO authenticated, service_role;

-- Interne factuur bij goedkeuren: velg € 100, overige delen € 300, werkplaats € 300
CREATE OR REPLACE FUNCTION public.create_internal_invoice_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_veh record;
  v_lines jsonb := '[]'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_sub numeric := 0;
  v_vat numeric;
  v_total numeric;
  v_num text;
  v_label text;
  r record;
  v_part text;
  v_partcount int;
  v_prijs numeric;
  v_customer jsonb := jsonb_build_object(
    'name', 'Autocity Automotive Group B.V.',
    'street', 'Thurledeweg',
    'house_number', '61-a',
    'postal_code', '3044 ER',
    'city', 'Rotterdam',
    'email', 'administratie@auto-city.nl'
  );
BEGIN
  IF NEW.status <> 'goedgekeurd' OR OLD.status IS NOT DISTINCT FROM 'goedgekeurd' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.origin, 'intern') <> 'intern' OR NEW.external_customer IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.discipline NOT IN ('werkplaats', 'spuit') THEN
    RETURN NEW;
  END IF;

  SELECT brand, model, license_number, vin INTO v_veh FROM public.vehicles WHERE id = NEW.vehicle_id;
  v_label := trim(concat_ws(' ', COALESCE(v_veh.license_number, ''), COALESCE(v_veh.brand, ''), COALESCE(v_veh.model, '')));

  IF NEW.discipline = 'werkplaats' THEN
    IF EXISTS (SELECT 1 FROM public.workshop_invoices
               WHERE invoice_kind = 'intern' AND source_work_order_ids @> to_jsonb(NEW.id::text)) THEN
      RETURN NEW;
    END IF;
    v_lines := jsonb_build_array(jsonb_build_object(
      'description', 'Onderhoudsbeurt / rijklaar maken — ' || v_label,
      'amount', 300));
    v_ids := jsonb_build_array(NEW.id::text);
    v_sub := 300;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.work_orders
      WHERE vehicle_id = NEW.vehicle_id
        AND discipline = 'spuit'
        AND COALESCE(origin, 'intern') = 'intern'
        AND external_customer IS NULL
        AND status NOT IN ('goedgekeurd', 'geannuleerd')
    ) THEN
      RETURN NEW;
    END IF;

    FOR r IN
      SELECT w.id, w.part, w.parts, w.description
      FROM public.work_orders w
      WHERE w.vehicle_id = NEW.vehicle_id
        AND w.discipline = 'spuit'
        AND COALESCE(w.origin, 'intern') = 'intern'
        AND w.external_customer IS NULL
        AND w.status = 'goedgekeurd'
        AND NOT EXISTS (
          SELECT 1 FROM public.workshop_invoices i
          WHERE i.invoice_kind = 'intern' AND i.source_work_order_ids @> to_jsonb(w.id::text)
        )
      ORDER BY w.approved_at NULLS LAST, w.created_at
    LOOP
      v_partcount := 0;
      IF r.parts IS NOT NULL AND jsonb_typeof(r.parts) = 'array' AND jsonb_array_length(r.parts) > 0 THEN
        FOR v_part IN SELECT jsonb_array_elements_text(r.parts) LOOP
          v_prijs := public.intern_deel_prijs(v_part, now());
          v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'description', 'Schadeherstel ' || COALESCE(NULLIF(v_part, ''), 'carrosseriedeel') || ' — ' || v_label,
            'amount', v_prijs));
          v_sub := v_sub + v_prijs;
          v_partcount := v_partcount + 1;
        END LOOP;
      END IF;

      IF v_partcount = 0 THEN
        v_prijs := public.intern_deel_prijs(r.part, now());
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description', 'Schadeherstel ' || COALESCE(NULLIF(r.part, ''), 'carrosseriedeel') || ' — ' || v_label,
          'amount', v_prijs));
        v_sub := v_sub + v_prijs;
      END IF;

      v_ids := v_ids || jsonb_build_array(r.id::text);
    END LOOP;

    IF jsonb_array_length(v_lines) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  v_vat := round(v_sub * 0.21, 2);
  v_total := v_sub + v_vat;
  v_num := public.next_workshop_invoice_number();

  INSERT INTO public.workshop_invoices (
    invoice_number, invoice_kind, work_order_id, vehicle_id, source_work_order_ids,
    customer, vehicle, lines, subtotal, vat, total, status, branch
  ) VALUES (
    v_num, 'intern',
    CASE WHEN NEW.discipline = 'werkplaats' THEN NEW.id ELSE NULL END,
    NEW.vehicle_id, v_ids,
    v_customer,
    jsonb_build_object('brand', v_veh.brand, 'model', v_veh.model, 'license_number', v_veh.license_number, 'vin', v_veh.vin),
    v_lines, v_sub, v_vat, v_total, 'concept', COALESCE(NEW.branch, 'rotterdam')
  );

  RETURN NEW;
END;
$function$;

-- Poets-maandfactuur: prijs per beurt op de werkdag (vóór 16-11-2026 € 82,64 / € 100 incl., daarna € 100 / € 121 incl.)
CREATE OR REPLACE FUNCTION public.generate_poets_monthly_invoice(p_month date DEFAULT NULL::date, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from date; v_to date;
  v_lines jsonb := '[]'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_n int := 0;
  v_sub numeric := 0; v_vat numeric; v_total numeric := 0; v_prijs numeric;
  v_num text; v_id uuid; r record;
  v_customer jsonb := jsonb_build_object(
    'name','Autocity Automotive Group B.V.','street','Thurledeweg','house_number','61-a',
    'postal_code','3044 ER','city','Rotterdam','email','administratie@auto-city.nl');
BEGIN
  v_from := date_trunc('month', COALESCE(p_month, (CURRENT_DATE - interval '1 month')::date))::date;
  v_to := (v_from + interval '1 month')::date;

  FOR r IN
    SELECT wo.id, COALESCE(wo.finished_at, wo.approved_at) AS done_at,
           v.license_number, v.brand, v.model,
           trim(concat_ws(' ', p.first_name, p.last_name)) AS poetser
    FROM public.work_orders wo
    JOIN public.profiles p ON p.id = wo.assigned_to
    LEFT JOIN public.vehicles v ON v.id = wo.vehicle_id
    WHERE wo.discipline = 'poets'
      AND wo.status IN ('afgerond','goedgekeurd')
      AND COALESCE(p.poetser_type,'intern') = 'intern'
      AND COALESCE(wo.finished_at, wo.approved_at) >= v_from
      AND COALESCE(wo.finished_at, wo.approved_at) < v_to
      AND NOT EXISTS (
        SELECT 1 FROM public.workshop_invoices wi
        WHERE wi.invoice_kind = 'poets_intern'
          AND wi.source_work_order_ids @> to_jsonb(wo.id::text))
    ORDER BY COALESCE(wo.finished_at, wo.approved_at)
  LOOP
    v_prijs := public.poets_prijs_excl(r.done_at);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Poetsen — ' || trim(concat_ws(' ',
          COALESCE(NULLIF(r.license_number,''),'kenteken onbekend'),
          COALESCE(r.brand,''), COALESCE(r.model,'')))
        || ' (' || to_char(r.done_at,'DD-MM-YYYY') || ', '
        || COALESCE(NULLIF(r.poetser,''),'poetser') || ')',
      'amount', v_prijs));
    v_ids := v_ids || jsonb_build_array(r.id::text);
    v_sub := v_sub + v_prijs;
    v_total := v_total + public.poets_prijs_incl(r.done_at);
    v_n := v_n + 1;
  END LOOP;

  IF v_n = 0 THEN
    RETURN jsonb_build_object('created', false, 'count', 0,
      'month', to_char(v_from,'YYYY-MM'), 'reason', 'geen interne poetsbeurten');
  END IF;

  v_sub := round(v_sub, 2);
  v_total := round(v_total, 2);
  v_vat := round(v_total - v_sub, 2);

  IF p_dry_run THEN
    RETURN jsonb_build_object('created', false, 'dry_run', true,
      'month', to_char(v_from,'YYYY-MM'), 'count', v_n,
      'subtotal', v_sub, 'vat', v_vat, 'total', v_total, 'lines', v_lines);
  END IF;

  v_num := public.next_workshop_invoice_number();
  INSERT INTO public.workshop_invoices (
    invoice_number, invoice_kind, vehicle_id, source_work_order_ids,
    customer, vehicle, lines, subtotal, vat, total, status, branch
  ) VALUES (
    v_num, 'poets_intern', NULL, v_ids, v_customer,
    jsonb_build_object('description','Poetswerkzaamheden ' || to_char(v_from,'MM-YYYY')),
    v_lines, v_sub, v_vat, v_total, 'concept', 'rotterdam'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('created', true, 'invoice_id', v_id, 'invoice_number', v_num,
    'month', to_char(v_from,'YYYY-MM'), 'count', v_n,
    'subtotal', v_sub, 'vat', v_vat, 'total', v_total, 'lines', v_lines);
END;
$function$;

-- Omzet-toerekening: interne schadefacturen vanaf de tariefdatum wegen per deel op prijs (velg € 100, overig € 300).
-- Oudere facturen (en hun credits) en externe facturen houden de weging per aantal delen.
CREATE OR REPLACE FUNCTION public.omzet_regels(p_van date, p_tot date, p_branch text DEFAULT NULL::text)
 RETURNS TABLE(invoice_id uuid, invoice_number text, invoice_kind text, tak text, omzet_datum date, subtotal numeric, total numeric, status text, branch text, created_at timestamp with time zone, klant text, kenteken text, telt_mee boolean, telt_niet_mee boolean, telt_niet_mee_reden text, gekoppeld boolean, work_order_id uuid, discipline text, medewerker_id uuid, aandeel_delen integer, bedrag numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH inv AS (
    SELECT i.*, public.invoice_order_ids(i.source_work_order_ids, i.work_order_id) AS ids,
      (NOT i.telt_niet_mee AND (i.document_type = 'creditfactuur' OR i.status <> 'concept' OR i.invoice_kind IN ('intern','poets_intern'))) AS meetellen,
      COALESCE((SELECT o.created_at FROM public.workshop_invoices o WHERE o.id = i.credit_van_invoice_id), i.created_at) AS basis_op
    FROM public.workshop_invoices i
    WHERE i.omzet_datum >= p_van AND i.omzet_datum < p_tot
      AND (p_branch IS NULL OR i.branch = p_branch)
  ),
  alloc AS (
    SELECT inv.id AS inv_id, w.id AS wo_id, w.discipline, w.assigned_to,
      CASE WHEN inv.tak = 'schadeherstel' AND w.discipline = 'spuit'
        THEN GREATEST(1, CASE WHEN jsonb_typeof(w.parts) = 'array' THEN jsonb_array_length(w.parts) ELSE 0 END)
        ELSE 1 END AS gewicht,
      CASE
        WHEN inv.tak = 'schadeherstel' AND w.discipline = 'spuit' AND inv.invoice_kind = 'intern'
             AND (inv.basis_op AT TIME ZONE 'Europe/Amsterdam')::date >= public.intern_tarief_vanaf()
          THEN COALESCE(
            (SELECT sum(public.intern_deel_prijs(p.x, inv.basis_op))
               FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(w.parts) = 'array' THEN w.parts ELSE '[]'::jsonb END) AS p(x)),
            public.intern_deel_prijs(w.part, inv.basis_op))
        WHEN inv.tak = 'schadeherstel' AND w.discipline = 'spuit'
          THEN GREATEST(1, CASE WHEN jsonb_typeof(w.parts) = 'array' THEN jsonb_array_length(w.parts) ELSE 0 END)::numeric
        ELSE 1::numeric END AS weging
    FROM inv JOIN public.work_orders w ON w.id = ANY(inv.ids)
  ),
  tot AS (SELECT inv_id, sum(weging) AS g FROM alloc GROUP BY inv_id)
  SELECT inv.id, inv.invoice_number, inv.invoice_kind, inv.tak, inv.omzet_datum,
    inv.subtotal, inv.total, inv.status, inv.branch, inv.created_at,
    inv.customer->>'name', NULLIF(inv.vehicle->>'license_number',''),
    inv.meetellen, inv.telt_niet_mee, inv.telt_niet_mee_reden,
    (cardinality(inv.ids) > 0),
    a.wo_id, a.discipline, a.assigned_to, a.gewicht,
    CASE WHEN a.inv_id IS NULL THEN inv.subtotal
         ELSE round(inv.subtotal * a.weging / NULLIF(t.g,0), 2) END
  FROM inv
  LEFT JOIN alloc a ON a.inv_id = inv.id
  LEFT JOIN tot t ON t.inv_id = inv.id
$function$;

-- Crediteren: poets-btw uit de verhouding van de originele factuur (oude én nieuwe poetsprijs)
DO $$
DECLARE v_def text; v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'factuur_crediteren_intern';
  v_new := replace(v_def,
    'v_tot := round(v_excl * 100 / 82.64, 2); v_vat := v_tot - v_excl;',
    'v_tot := round(v_excl * o.total / NULLIF(o.subtotal, 0), 2); v_vat := v_tot - v_excl;');
  IF v_new = v_def THEN RAISE EXCEPTION 'poets-btw regel niet gevonden in factuur_crediteren_intern'; END IF;
  EXECUTE v_new;
END $$;