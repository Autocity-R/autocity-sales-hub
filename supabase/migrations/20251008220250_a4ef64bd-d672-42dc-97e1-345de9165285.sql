-- Add constraint to ensure vehicle status is valid and unique per vehicle
-- This prevents vehicles from appearing in multiple lists

-- First, add a check constraint to ensure only valid statuses are used
ALTER TABLE vehicles 
  DROP CONSTRAINT IF EXISTS vehicles_status_check;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_status_check 
  CHECK (status IN ('voorraad', 'verkocht_b2b', 'verkocht_b2c', 'afgeleverd'));

-- Add a comment to document the business rule
COMMENT ON COLUMN vehicles.status IS 'Vehicle sales status. Each vehicle can only have ONE status at a time: voorraad, verkocht_b2b, verkocht_b2c, or afgeleverd. This ensures vehicles appear in only one inventory list.';

-- Create an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Add a trigger function to log status changes
CREATE OR REPLACE FUNCTION log_vehicle_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE NOTICE 'Vehicle % status changed from % to %', NEW.id, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS vehicle_status_change_logger ON vehicles;
CREATE TRIGGER vehicle_status_change_logger
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_status_change();