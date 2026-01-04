-- Repareer inconsistente salespersonName in details JSON
-- Synchroniseer met de werkelijke profielnaam op basis van sold_by_user_id

UPDATE vehicles v
SET details = jsonb_set(
  COALESCE(details::jsonb, '{}'::jsonb),
  '{salespersonName}',
  to_jsonb(
    COALESCE(
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      p.email,
      'Onbekend'
    )
  )
)
FROM profiles p
WHERE v.sold_by_user_id = p.id
AND v.sold_by_user_id IS NOT NULL
AND (
  v.details->>'salespersonName' IS NULL 
  OR v.details->>'salespersonName' != COALESCE(
    NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
    p.email,
    'Onbekend'
  )
);