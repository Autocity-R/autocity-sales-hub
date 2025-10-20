-- Drop the existing check constraint
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

-- Add new check constraint with additional statuses
ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check 
CHECK (status IN ('voorraad', 'verkocht_b2b', 'verkocht_b2c', 'afgeleverd', 'leenauto', 'onderweg'));