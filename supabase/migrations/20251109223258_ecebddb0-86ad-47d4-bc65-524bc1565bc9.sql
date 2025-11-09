-- Add delivery_date column to vehicles table
ALTER TABLE vehicles ADD COLUMN delivery_date timestamp with time zone;

-- Create index for delivery_date to optimize queries
CREATE INDEX idx_vehicles_delivery_date ON vehicles(delivery_date);

-- Backfill delivery_date for existing delivered vehicles
-- Set delivery_date to sold_date for vehicles that are already delivered
UPDATE vehicles 
SET delivery_date = sold_date 
WHERE status = 'afgeleverd' 
  AND delivery_date IS NULL 
  AND sold_date IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN vehicles.delivery_date IS 'Date when the vehicle was actually delivered to the customer (status changed to afgeleverd). Different from sold_date which is when the sale was made.';