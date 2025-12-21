-- Fix afgeleverd vehicles die geen salesType hebben ingesteld
-- Dit zorgt ervoor dat de wekelijkse verkoop ranglijst correct telt

UPDATE vehicles
SET details = jsonb_set(
  COALESCE(details, '{}'::jsonb),
  '{salesType}',
  '"b2c"'::jsonb
)
WHERE status = 'afgeleverd'
  AND (details->>'salesType' IS NULL OR details->>'salesType' = '');

-- Log hoeveel records zijn bijgewerkt
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % afgeleverd vehicles with missing salesType', updated_count;
END $$;