-- Fix: Backfill resterende 18 vehicles die showroomOnline=true hebben maar geen online_since_date
UPDATE vehicles
SET online_since_date = COALESCE(
  import_updated_at,
  created_at
)
WHERE (details->>'showroomOnline')::boolean = true
  AND online_since_date IS NULL;