-- Split paymentStatus into purchase_payment_status and sales_payment_status
-- Voor ALLE voertuigen: kopieer naar purchase_payment_status (inkoop betaling)
UPDATE vehicles
SET details = jsonb_set(
  COALESCE(details, '{}'::jsonb),
  '{purchase_payment_status}',
  to_jsonb(COALESCE(
    details->>'paymentStatus',
    'niet_betaald'
  ))
)
WHERE details->>'purchase_payment_status' IS NULL;

-- Voor VERKOCHTE voertuigen: kopieer naar sales_payment_status (verkoop betaling)
UPDATE vehicles
SET details = jsonb_set(
  details,
  '{sales_payment_status}',
  to_jsonb(COALESCE(
    details->>'paymentStatus',
    'niet_betaald'
  ))
)
WHERE status IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd')
AND details->>'sales_payment_status' IS NULL;

-- Voor NIET-VERKOCHTE voertuigen: sales_payment_status = NULL (nog niet verkocht)
UPDATE vehicles
SET details = jsonb_set(
  COALESCE(details, '{}'::jsonb),
  '{sales_payment_status}',
  'null'::jsonb
)
WHERE status NOT IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd')
AND (details->>'sales_payment_status' IS NULL OR details->'sales_payment_status' != 'null'::jsonb);

-- Voeg comment toe ter documentatie
COMMENT ON COLUMN vehicles.details IS 'JSONB veld met o.a. purchase_payment_status (inkoop betaling aan leverancier) en sales_payment_status (verkoop betaling van klant)';