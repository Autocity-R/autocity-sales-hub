-- Stap 1: Voeg missende VW Taigo record toe
INSERT INTO damage_repair_records (
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
  '23d1b0ba-fb5d-4115-9f40-20cfec7f0c50',
  '4d84f1f1-be71-4b45-af77-2af9bebb0c3f',
  'Volkswagen',
  'Taigo R Line 1.0',
  'WVWZZZC1ZPY023252',
  'JZ-991-P',
  '["Achterbumper", "Rechter voordeur", "Linker voordeur", "Linker achterdeur", "Rechter achterdeur"]'::jsonb,
  5,
  1500,
  '2e6ea06c-9852-4352-8b90-dbed74b9099a',
  'Yousry Aly',
  '2025-12-18T00:00:00Z'
);

-- Stap 3: Database trigger als vangnet voor schadeherstel taken
CREATE OR REPLACE FUNCTION public.auto_register_damage_repair_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      SELECT 1 FROM damage_repair_records 
      WHERE task_id = NEW.id::text
    ) THEN
      -- Insert damage repair record
      INSERT INTO damage_repair_records (
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
        NEW.id::text,
        NEW.vehicle_id,
        COALESCE(NEW.vehicle_brand, '-'),
        COALESCE(NEW.vehicle_model, '-'),
        NEW.vehicle_vin,
        NEW.vehicle_license_number,
        parts_array,
        part_count_val,
        part_count_val * cost_per_part,
        NEW.assigned_to,
        (SELECT CONCAT(first_name, ' ', last_name) FROM profiles WHERE id = NEW.assigned_to),
        COALESCE(NEW.completed_at, now())
      );
      
      RAISE NOTICE 'Auto-registered damage repair for task %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Maak de trigger aan
DROP TRIGGER IF EXISTS auto_damage_repair_trigger ON tasks;
CREATE TRIGGER auto_damage_repair_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_register_damage_repair_on_completion();