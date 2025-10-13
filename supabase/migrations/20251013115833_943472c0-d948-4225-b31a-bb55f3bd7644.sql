-- Conditional backfill for sold_date avoiding trigger validation failures
UPDATE vehicles 
SET sold_date = COALESCE(updated_at, created_at, now())
WHERE status IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd')
  AND sold_date IS NULL
  AND selling_price IS NOT NULL AND selling_price > 0
  AND (details->>'purchasePrice') IS NOT NULL
  AND (details->>'purchasePrice')::numeric > 0;