-- Fix auto_register_damage_repair_on_completion(): damage_repair_records.task_id is UUID, so do not cast NEW.id to text

CREATE OR REPLACE FUNCTION public.auto_register_damage_repair_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  parts_array jsonb;
  part_count_val integer;
  cost_per_part integer := 300;
BEGIN
  -- Alleen triggeren als:
  -- 1. Categorie is schadeherstel
  -- 2. Status verandert naar voltooid
  -- 3. Vorige status was NIET voltooid
  IF NEW.category = 'schadeherstel'
     AND NEW.status = 'voltooid'
     AND (OLD.status IS NULL OR OLD.status != 'voltooid') THEN

    -- Haal onderdelen op uit damage_parts
    IF NEW.damage_parts IS NOT NULL AND NEW.damage_parts->'parts' IS NOT NULL THEN
      parts_array := (
        SELECT jsonb_agg(p->>'name')
        FROM jsonb_array_elements(NEW.damage_parts->'parts') AS p
      );
      part_count_val := jsonb_array_length(NEW.damage_parts->'parts');
    ELSE
      parts_array := '[]'::jsonb;
      part_count_val := 0;
    END IF;

    -- Check of record al bestaat (voorkom duplicaten)
    IF NOT EXISTS (
      SELECT 1
      FROM public.damage_repair_records
      WHERE task_id = NEW.id
    ) THEN
      INSERT INTO public.damage_repair_records (
        task_id,
        vehicle_id,
        vehicle_brand,
        vehicle_model,
        vehicle_vin,
        vehicle_license_number,
        repaired_parts,
        part_count,
        repair_cost,
        employee_id,
        employee_name,
        completed_at
      ) VALUES (
        NEW.id,
        NEW.vehicle_id,
        COALESCE(NEW.vehicle_brand, '-'),
        COALESCE(NEW.vehicle_model, '-'),
        NEW.vehicle_vin,
        NEW.vehicle_license_number,
        parts_array,
        part_count_val,
        part_count_val * cost_per_part,
        NEW.assigned_to,
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.profiles WHERE id = NEW.assigned_to),
        COALESCE(NEW.completed_at, now())
      );

      RAISE NOTICE 'Auto-registered damage repair for task %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
