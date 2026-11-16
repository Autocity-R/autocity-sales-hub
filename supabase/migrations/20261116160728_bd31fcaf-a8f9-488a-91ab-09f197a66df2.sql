-- BOUWSTAP 19 — interne werkplaatsfacturen: vlag, rijklaar 1x per auto, goedkeuren met factuur, vangnet, werkorderdetails per factuur

-- 1) Vlag (standaard 'uit' = trigger werkt zoals nu) + ingangsmoment vangnet
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('interne_factuur_handmatig', 'uit', now())
ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_config (key, value, updated_at)
VALUES ('interne_factuur_vangnet_vanaf', now()::text, now())
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.interne_factuur_handmatig()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT value FROM public.system_config WHERE key = 'interne_factuur_handmatig'), 'uit') = 'aan' $$;

CREATE OR REPLACE FUNCTION public.interne_factuur_vangnet_vanaf()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT value::timestamptz FROM public.system_config WHERE key = 'interne_factuur_vangnet_vanaf'), now()) $$;

-- 2) Wie mag interne werkplaatsorders goedkeuren (gelijk aan canApproveWorkOrdersRole in de app)
CREATE OR REPLACE FUNCTION public.mag_interne_werkorder_goedkeuren()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef','operationeel_directeur'])
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
$$;

-- 3) Heeft deze auto al een (niet volledig gecrediteerde) interne rijklaar-factuur voor een ándere order?
CREATE OR REPLACE FUNCTION public.rijklaar_factuur_bestaat(p_vehicle_id uuid, p_excl_order uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workshop_invoices i
    JOIN public.work_orders w ON w.id = ANY (public.invoice_order_ids(i.source_work_order_ids, i.work_order_id))
    WHERE i.invoice_kind = 'intern' AND i.document_type = 'factuur'
      AND w.vehicle_id = p_vehicle_id AND w.id <> p_excl_order
      AND w.discipline = 'werkplaats' AND w.source = 'checklist'
      AND i.subtotal + COALESCE((SELECT sum(c.subtotal) FROM public.workshop_invoices c
                                 WHERE c.credit_van_invoice_id = i.id AND c.document_type = 'creditfactuur'), 0) > 0.005)
$$;

-- 4) BEFORE-trigger: 2e rijklaar voor dezelfde auto → geen factuur, wel gemarkeerd (alleen met vlag 'aan')
CREATE OR REPLACE FUNCTION public.werkorder_rijklaar_1x()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'goedgekeurd' OR OLD.status IS NOT DISTINCT FROM 'goedgekeurd' THEN RETURN NEW; END IF;
  IF NEW.discipline <> 'werkplaats' OR COALESCE(NEW.origin, 'intern') <> 'intern' OR NEW.external_customer IS NOT NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.source, '') <> 'checklist' OR COALESCE(NEW.factuur_niet_nodig, false) THEN RETURN NEW; END IF;
  IF NOT public.interne_factuur_handmatig() THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.workshop_invoices i
             WHERE i.document_type = 'factuur' AND NEW.id = ANY (public.invoice_order_ids(i.source_work_order_ids, i.work_order_id))) THEN
    RETURN NEW;
  END IF;
  IF public.rijklaar_factuur_bestaat(NEW.vehicle_id, NEW.id) THEN
    NEW.factuur_niet_nodig := true;
    NEW.factuur_niet_nodig_reden := 'Valt onder rijklaar (€300 per auto)';
    NEW.factuur_niet_nodig_door := NULL; -- systeem
    NEW.factuur_niet_nodig_op := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_werkorder_rijklaar_1x ON public.work_orders;
CREATE TRIGGER trg_werkorder_rijklaar_1x BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.werkorder_rijklaar_1x();

-- 5) Factuurtrigger: werkplaats-tak volgt de vlag; spuit/schadeherstel ongewijzigd
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
    -- gemarkeerd als geen factuur nodig (rijklaar al gefactureerd of "Geen kosten")
    IF COALESCE(NEW.factuur_niet_nodig, false) THEN
      RETURN NEW;
    END IF;
    -- vlag 'aan': alleen rijklaar (checklist) automatisch; de rest via het factuurvenster bij goedkeuren
    IF public.interne_factuur_handmatig() AND COALESCE(NEW.source, '') <> 'checklist' THEN
      RETURN NEW;
    END IF;
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

-- 6) Goedkeuren (of alsnog factureren) met interne factuur, of "Geen kosten" met reden — één transactie
CREATE OR REPLACE FUNCTION public.werkorder_goedkeuren_met_factuur_intern(
  p_work_order_id uuid, p_regels jsonb, p_geen_kosten_reden text, p_nummer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  o record; v_veh record; l jsonb;
  v_lines jsonb := '[]'::jsonb; v_sub numeric := 0; v_arb numeric := 0; v_ond numeric := 0;
  v_amt numeric; v_desc text; v_vat numeric; v_total numeric; v_num text; v_id uuid;
  v_afgerond boolean; v_reden text := NULLIF(btrim(COALESCE(p_geen_kosten_reden, '')), '');
  v_claim int := 0; v_claimnr text;
  v_customer jsonb := jsonb_build_object(
    'name', 'Autocity Automotive Group B.V.', 'street', 'Thurledeweg', 'house_number', '61-a',
    'postal_code', '3044 ER', 'city', 'Rotterdam', 'email', 'administratie@auto-city.nl');
BEGIN
  IF NOT public.mag_interne_werkorder_goedkeuren() THEN
    RAISE EXCEPTION 'Geen rechten om deze werkorder goed te keuren';
  END IF;
  SELECT * INTO o FROM public.work_orders WHERE id = p_work_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Werkorder niet gevonden'; END IF;
  IF o.discipline <> 'werkplaats' OR COALESCE(o.origin, 'intern') <> 'intern' OR o.external_customer IS NOT NULL THEN
    RAISE EXCEPTION 'Alleen interne werkplaatsorders kunnen hier worden gefactureerd';
  END IF;
  IF o.status NOT IN ('afgerond', 'goedgekeurd') THEN
    RAISE EXCEPTION 'Werkorder is nog niet afgerond';
  END IF;
  IF EXISTS (SELECT 1 FROM public.workshop_invoices i
             WHERE i.document_type = 'factuur' AND o.id = ANY (public.invoice_order_ids(i.source_work_order_ids, i.work_order_id))) THEN
    RAISE EXCEPTION 'Deze werkorder heeft al een factuur';
  END IF;
  v_afgerond := o.status = 'afgerond';
  IF NOT v_afgerond AND COALESCE(o.factuur_niet_nodig, false) THEN
    RAISE EXCEPTION 'Deze order staat op geen factuur nodig; kies eerst Toch factureren';
  END IF;

  -- Geen kosten: goedkeuren zonder factuur, reden verplicht en gelogd
  IF v_reden IS NOT NULL THEN
    UPDATE public.work_orders SET
      factuur_niet_nodig = true,
      factuur_niet_nodig_reden = 'Geen kosten: ' || v_reden,
      factuur_niet_nodig_door = auth.uid(),
      factuur_niet_nodig_op = now(),
      status = 'goedgekeurd',
      approved_at = CASE WHEN v_afgerond THEN now() ELSE approved_at END,
      approved_by = CASE WHEN v_afgerond THEN auth.uid() ELSE approved_by END
    WHERE id = o.id;
    RETURN jsonb_build_object('goedgekeurd', v_afgerond, 'geen_kosten', true, 'invoice_id', NULL, 'invoice_number', NULL);
  END IF;

  IF p_regels IS NULL OR jsonb_typeof(p_regels) <> 'array' THEN
    RAISE EXCEPTION 'Vul een bedrag in, of kies Geen kosten met een reden';
  END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(p_regels) LOOP
    IF jsonb_typeof(l) <> 'object' THEN RAISE EXCEPTION 'Ongeldige factuurregel'; END IF;
    v_desc := btrim(COALESCE(l->>'description', ''));
    BEGIN
      v_amt := round(COALESCE(NULLIF(btrim(COALESCE(l->>'amount', '')), ''), '0')::numeric, 2);
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Ongeldig bedrag in een factuurregel';
    END;
    IF v_desc = '' AND v_amt = 0 THEN CONTINUE; END IF;
    IF v_desc = '' THEN RAISE EXCEPTION 'Elke regel met een bedrag heeft een omschrijving nodig'; END IF;
    IF v_amt < 0 THEN RAISE EXCEPTION 'Bedragen mogen niet negatief zijn'; END IF;
    IF l->>'soort' = 'onderdelen' THEN
      v_lines := v_lines || jsonb_build_array(jsonb_build_object('description', v_desc, 'amount', v_amt, 'soort', 'onderdelen'));
      v_ond := v_ond + v_amt;
    ELSE
      v_lines := v_lines || jsonb_build_array(jsonb_build_object('description', v_desc, 'amount', v_amt));
      v_arb := v_arb + v_amt;
    END IF;
    v_sub := v_sub + v_amt;
  END LOOP;
  IF v_sub <= 0 THEN
    RAISE EXCEPTION 'Vul een bedrag groter dan € 0 in, of kies Geen kosten met een reden';
  END IF;

  v_vat := round(v_sub * 0.21, 2);
  v_total := v_sub + v_vat;
  v_num := COALESCE(p_nummer, public.next_workshop_invoice_number());
  SELECT brand, model, license_number, vin INTO v_veh FROM public.vehicles WHERE id = o.vehicle_id;

  -- factuur eerst: de goedkeur-trigger ziet hem en maakt geen tweede
  INSERT INTO public.workshop_invoices (
    invoice_number, invoice_kind, work_order_id, vehicle_id, source_work_order_ids,
    customer, vehicle, lines, subtotal, vat, total, status, branch, tak, omzet_datum, created_by
  ) VALUES (
    v_num, 'intern', o.id, o.vehicle_id, jsonb_build_array(o.id::text),
    v_customer,
    jsonb_build_object('brand', v_veh.brand, 'model', v_veh.model, 'license_number', v_veh.license_number, 'vin', v_veh.vin),
    v_lines, v_sub, v_vat, v_total, 'concept', COALESCE(o.branch, 'rotterdam'), 'werkplaats',
    ((CASE WHEN v_afgerond THEN now() ELSE COALESCE(o.approved_at, now()) END) AT TIME ZONE 'Europe/Amsterdam')::date,
    auth.uid()
  ) RETURNING id INTO v_id;

  IF v_afgerond THEN
    UPDATE public.work_orders SET status = 'goedgekeurd', approved_at = now(), approved_by = auth.uid() WHERE id = o.id;
  END IF;

  -- garantie: claimkosten alleen invullen als ze nog leeg zijn (nooit overschrijven)
  IF o.warranty_claim_id IS NOT NULL THEN
    UPDATE public.warranty_claims SET
      kosten_arbeid = v_arb, kosten_onderdelen = v_ond, kosten_totaal = v_sub,
      kosten_notitie = COALESCE(kosten_notitie, 'Uit interne factuur ' || v_num || ' (excl. btw)'),
      kosten_ingevuld_door = auth.uid(), kosten_ingevuld_op = now()
    WHERE id = o.warranty_claim_id AND kosten_arbeid IS NULL AND kosten_onderdelen IS NULL AND kosten_totaal IS NULL
    RETURNING claim_nummer INTO v_claimnr;
    GET DIAGNOSTICS v_claim = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('goedgekeurd', v_afgerond, 'geen_kosten', false, 'invoice_id', v_id,
    'invoice_number', v_num, 'subtotal', v_sub, 'claimkosten_ingevuld', v_claim > 0);
END $$;

CREATE OR REPLACE FUNCTION public.werkorder_goedkeuren_met_factuur(
  p_work_order_id uuid, p_regels jsonb DEFAULT NULL, p_geen_kosten_reden text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.werkorder_goedkeuren_met_factuur_intern(p_work_order_id, p_regels, p_geen_kosten_reden, NULL) $$;

-- 7) Toch factureren: extern zoals het was; intern ook voor iedereen die mag goedkeuren
CREATE OR REPLACE FUNCTION public.werkorder_toch_factureren(p_work_order_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_intern boolean;
BEGIN
  SELECT discipline = 'werkplaats' AND COALESCE(origin, 'intern') = 'intern' AND external_customer IS NULL
    INTO v_intern FROM public.work_orders WHERE id = p_work_order_id;
  IF NOT (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'aftersales_manager')
          OR (COALESCE(v_intern, false) AND public.mag_interne_werkorder_goedkeuren())) THEN
    RAISE EXCEPTION 'Geen rechten om factuur-verplichting te wijzigen';
  END IF;
  UPDATE public.work_orders
  SET factuur_niet_nodig = false,
      factuur_niet_nodig_reden = NULL,
      factuur_niet_nodig_door = NULL,
      factuur_niet_nodig_op = NULL
  WHERE id = p_work_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Werkorder niet gevonden'; END IF;
END;
$function$;

-- 8) Vangnet-teller: goedgekeurde interne werkplaatsorders zonder factuur (vanaf de livegang)
CREATE OR REPLACE FUNCTION public.intern_facturen_open_aantal()
RETURNS bigint LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.work_orders w
  WHERE w.status = 'goedgekeurd'
    AND w.discipline = 'werkplaats'
    AND COALESCE(w.origin, 'intern') = 'intern' AND w.external_customer IS NULL
    AND NOT COALESCE(w.factuur_niet_nodig, false)
    AND w.approved_at >= public.interne_factuur_vangnet_vanaf()
    AND NOT EXISTS (
      SELECT 1 FROM public.workshop_invoices wi
      WHERE wi.document_type = 'factuur' AND w.id = ANY (public.invoice_order_ids(wi.source_work_order_ids, wi.work_order_id)));
$$;

-- 9) Werkorderdetails (per factuur en in het factuurvenster) — één query, RLS blijft gelden
CREATE OR REPLACE FUNCTION public.werkorder_details(p_ids uuid[])
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', w.id, 'discipline', w.discipline, 'source', w.source, 'origin', w.origin, 'status', w.status,
    'description', w.description, 'part', w.part, 'parts', w.parts,
    'external_customer_name', COALESCE(w.external_customer->>'name', w.external_customer->>'company'),
    'warranty_claim_id', w.warranty_claim_id, 'claim_nummer', c.claim_nummer,
    'vehicle_id', w.vehicle_id,
    'vehicle', CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v.id, 'brand', v.brand, 'model', v.model, 'license_number', v.license_number, 'status', v.status) END,
    'assigned_to', w.assigned_to, 'work_seconds', w.work_seconds, 'paused_seconds', w.paused_seconds,
    'created_at', w.created_at, 'started_at', w.started_at, 'finished_at', w.finished_at, 'approved_at', w.approved_at,
    'created_by', w.created_by, 'approved_by', w.approved_by,
    'factuur_niet_nodig', w.factuur_niet_nodig, 'factuur_niet_nodig_reden', w.factuur_niet_nodig_reden,
    'factuur_niet_nodig_door', w.factuur_niet_nodig_door, 'factuur_niet_nodig_op', w.factuur_niet_nodig_op,
    'tijdregels', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'work_order_id', t.work_order_id, 'user_id', t.user_id, 'gestart_op', t.gestart_op, 'gestopt_op', t.gestopt_op,
        'stop_reden', t.stop_reden, 'vooraf_seconden', t.vooraf_seconden) ORDER BY t.gestart_op)
      FROM public.work_order_tijdregels t WHERE t.work_order_id = w.id), '[]'::jsonb),
    'onderdelen', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'part_name', p.part_name, 'aantal', p.aantal, 'status', p.status) ORDER BY p.created_at)
      FROM public.parts_orders p WHERE p.work_order_id = w.id), '[]'::jsonb),
    'namen', COALESCE((SELECT jsonb_object_agg(pr.id, btrim(concat_ws(' ', pr.first_name, pr.last_name)))
      FROM public.profiles pr
      WHERE pr.id IN (w.assigned_to, w.created_by, w.approved_by, w.factuur_niet_nodig_door)
         OR pr.id IN (SELECT t.user_id FROM public.work_order_tijdregels t WHERE t.work_order_id = w.id)), '{}'::jsonb)
  )
  FROM public.work_orders w
  LEFT JOIN public.vehicles v ON v.id = w.vehicle_id
  LEFT JOIN public.warranty_claims c ON c.id = w.warranty_claim_id
  WHERE w.id = ANY (p_ids)
$$;

-- Rechten
REVOKE ALL ON FUNCTION public.werkorder_goedkeuren_met_factuur_intern(uuid, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.werkorder_goedkeuren_met_factuur_intern(uuid, jsonb, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.werkorder_goedkeuren_met_factuur(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.werkorder_goedkeuren_met_factuur(uuid, jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.werkorder_rijklaar_1x() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rijklaar_factuur_bestaat(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rijklaar_factuur_bestaat(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.mag_interne_werkorder_goedkeuren() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mag_interne_werkorder_goedkeuren() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.interne_factuur_handmatig() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interne_factuur_handmatig() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.interne_factuur_vangnet_vanaf() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interne_factuur_vangnet_vanaf() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.intern_facturen_open_aantal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intern_facturen_open_aantal() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.werkorder_details(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.werkorder_details(uuid[]) TO authenticated, service_role;