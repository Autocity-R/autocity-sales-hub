UPDATE vehicles 
SET import_status = 'niet_gestart',
    import_updated_at = now(),
    updated_at = now()
WHERE details->>'isTradeIn' = 'true' 
  AND status IN ('voorraad','verkocht_b2b','verkocht_b2c')
  AND import_status != 'niet_gestart';