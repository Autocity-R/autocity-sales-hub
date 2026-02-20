
-- Stap 1: Verwijder duplicaten (behoud oudste per task_id)
DELETE FROM damage_repair_records
WHERE id NOT IN (
  SELECT DISTINCT ON (task_id) id
  FROM damage_repair_records
  WHERE task_id IS NOT NULL
  ORDER BY task_id, created_at ASC
)
AND task_id IS NOT NULL
AND task_id IN (
  SELECT task_id FROM damage_repair_records
  WHERE task_id IS NOT NULL
  GROUP BY task_id
  HAVING COUNT(*) > 1
);

-- Stap 2: Voeg UNIQUE constraint toe op task_id
ALTER TABLE damage_repair_records
ADD CONSTRAINT damage_repair_records_task_id_unique UNIQUE (task_id);

-- Stap 3: Update trigger functie met ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION auto_register_damage_repair_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  parts_array jsonb;
  part_count_val integer;
  cost_per_part integer := 300;
BEGIN
  IF NEW.category = 'schadeherstel'
     AND NEW.status = 'voltooid'
     AND (OLD.status IS NULL OR OLD.status != 'voltooid') THEN

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
    )
    ON CONFLICT (task_id) DO NOTHING;

    RAISE NOTICE 'Auto-registered damage repair for task %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
