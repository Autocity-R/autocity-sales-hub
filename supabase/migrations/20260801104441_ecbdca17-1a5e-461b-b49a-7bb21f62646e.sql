ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS parts jsonb NOT NULL DEFAULT '[]'::jsonb;

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
    -- schadeherstel: wacht tot er geen open interne schadeherstel-orders meer zijn
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
          v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'description', 'Schadeherstel ' || COALESCE(NULLIF(v_part, ''), 'carrosseriedeel') || ' — ' || v_label,
            'amount', 300));
          v_sub := v_sub + 300;
          v_partcount := v_partcount + 1;
        END LOOP;
      END IF;

      IF v_partcount = 0 THEN
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'description', 'Schadeherstel ' || COALESCE(NULLIF(r.part, ''), 'carrosseriedeel') || ' — ' || v_label,
          'amount', 300));
        v_sub := v_sub + 300;
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