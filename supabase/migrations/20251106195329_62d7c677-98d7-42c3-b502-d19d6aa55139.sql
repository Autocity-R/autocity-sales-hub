-- Update vehicle_files table comment to include new contract categories
COMMENT ON COLUMN vehicle_files.category IS 'File category: damage, cmr, pickup, contract_b2b, or contract_b2c';