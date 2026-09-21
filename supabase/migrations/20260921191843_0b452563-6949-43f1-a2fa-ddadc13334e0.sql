CREATE OR REPLACE FUNCTION public.auto_complete_checklist_from_workorder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_ids jsonb;
  should_complete boolean := false;
  v_details jsonb;
  v_checklist jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_item jsonb;
  v_idx int;
  v_id text;
  v_worker_id uuid;
  v_worker_name text;
BEGIN
  IF NEW.checklist_items IS NULL OR jsonb_typeof(NEW.checklist_items) <> 'array' OR jsonb_array_length(NEW.checklist_items) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.discipline = 'werkplaats' AND NEW.status = 'afgerond' AND OLD.status IS DISTINCT FROM 'afgerond' THEN
    should_complete := true;
  ELSIF NEW.discipline IN ('spuit','uitdeuk') AND NEW.status = 'goedgekeurd' AND OLD.status IS DISTINCT FROM 'goedgekeurd' THEN
    should_complete := true;
  END IF;

  IF NOT should_complete THEN
    RETURN NEW;
  END IF;

  -- Wie heeft er aan gewerkt: uitvoerder (assigned_to), anders wie het afrondde
  v_worker_id := COALESCE(NEW.assigned_to, auth.uid(), NEW.approved_by, NEW.created_by);
  IF v_worker_id IS NOT NULL THEN
    SELECT NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')
      INTO v_worker_name
      FROM public.profiles p
     WHERE p.id = v_worker_id;
  END IF;

  item_ids := NEW.checklist_items;

  SELECT details INTO v_details FROM vehicles WHERE id = NEW.vehicle_id;
  IF v_details IS NULL THEN RETURN NEW; END IF;
  v_checklist := COALESCE(v_details->'preDeliveryChecklist', '[]'::jsonb);

  FOR v_idx IN 0..jsonb_array_length(v_checklist) - 1 LOOP
    v_item := v_checklist->v_idx;
    v_id := v_item->>'id';
    IF item_ids @> to_jsonb(v_id) AND COALESCE((v_item->>'completed')::boolean, false) = false THEN
      v_item := jsonb_set(v_item, '{completed}', 'true'::jsonb);
      v_item := jsonb_set(v_item, '{completedAt}', to_jsonb(now()::text));
      v_item := jsonb_set(v_item, '{completedVia}', to_jsonb('werkorder'::text));
      v_item := jsonb_set(v_item, '{completedWorkOrderId}', to_jsonb(NEW.id::text));
      v_item := jsonb_set(v_item, '{completedByName}', to_jsonb(COALESCE(v_worker_name, 'werkorder')));
      IF v_worker_id IS NOT NULL THEN
        v_item := jsonb_set(v_item, '{completedBy}', to_jsonb(v_worker_id::text));
      END IF;
    END IF;
    v_updated := v_updated || jsonb_build_array(v_item);
  END LOOP;

  UPDATE vehicles
     SET details = jsonb_set(COALESCE(details, '{}'::jsonb), '{preDeliveryChecklist}', v_updated),
         updated_at = now()
   WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$;