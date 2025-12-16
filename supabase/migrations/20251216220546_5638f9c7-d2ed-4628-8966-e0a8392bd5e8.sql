-- Fix salesType voor alle afgeleverde voertuigen op basis van originalSalesStatus
-- Dit repareert de B2B/B2C rapportage

UPDATE vehicles 
SET details = details || jsonb_build_object(
  'salesType', 
  CASE 
    WHEN details->>'originalSalesStatus' = 'verkocht_b2b' THEN 'b2b'
    WHEN details->>'originalSalesStatus' = 'verkocht_b2c' THEN 'b2c'
    ELSE 'b2c' -- Default naar b2c voor oude data zonder originalSalesStatus
  END
)
WHERE status = 'afgeleverd' 
AND (details->>'salesType' IS NULL);