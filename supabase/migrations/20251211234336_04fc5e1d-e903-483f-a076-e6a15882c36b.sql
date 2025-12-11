-- Import existing completed schadeherstel tasks into damage_repair_records
-- This ensures historical data is preserved with correct part name extraction

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
  completed_at,
  employee_id,
  employee_name
)
SELECT 
  t.id as task_id,
  t.vehicle_id,
  COALESCE(t.vehicle_brand, '-') as vehicle_brand,
  COALESCE(t.vehicle_model, '-') as vehicle_model,
  t.vehicle_vin,
  t.vehicle_license_number,
  -- Extract part names from damage_parts JSONB structure
  COALESCE(
    (
      SELECT jsonb_agg(part->>'name')
      FROM jsonb_array_elements(
        CASE 
          WHEN t.damage_parts ? 'parts' THEN t.damage_parts->'parts'
          ELSE '[]'::jsonb
        END
      ) AS part
      WHERE part->>'name' IS NOT NULL
    ),
    '[]'::jsonb
  ) as repaired_parts,
  -- Count the parts
  COALESCE(
    (
      SELECT COUNT(*)::integer
      FROM jsonb_array_elements(
        CASE 
          WHEN t.damage_parts ? 'parts' THEN t.damage_parts->'parts'
          ELSE '[]'::jsonb
        END
      ) AS part
      WHERE part->>'name' IS NOT NULL
    ),
    0
  ) as part_count,
  -- Calculate repair cost (€300 per part)
  COALESCE(
    (
      SELECT COUNT(*)::integer * 300
      FROM jsonb_array_elements(
        CASE 
          WHEN t.damage_parts ? 'parts' THEN t.damage_parts->'parts'
          ELSE '[]'::jsonb
        END
      ) AS part
      WHERE part->>'name' IS NOT NULL
    ),
    0
  ) as repair_cost,
  COALESCE(t.completed_at, t.updated_at) as completed_at,
  t.assigned_to as employee_id,
  COALESCE(p.first_name || ' ' || p.last_name, 'Onbekend') as employee_name
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.category = 'schadeherstel'
  AND t.status = 'voltooid'
  AND t.damage_parts IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM damage_repair_records dr WHERE dr.task_id = t.id
  );