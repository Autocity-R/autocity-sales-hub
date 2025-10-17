-- Add vehicle_vin column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;