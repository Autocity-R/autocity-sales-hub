-- Eenmalige migratie: Update alle voertuigen die onderweg zijn naar locatie 'onderweg'
-- Dit lost het probleem op voor de 16 bestaande voertuigen die nog op 'showroom' staan
UPDATE vehicles
SET 
  location = 'onderweg',
  updated_at = NOW()
WHERE details->>'transportStatus' = 'onderweg'
  AND (location IS NULL OR location != 'onderweg');