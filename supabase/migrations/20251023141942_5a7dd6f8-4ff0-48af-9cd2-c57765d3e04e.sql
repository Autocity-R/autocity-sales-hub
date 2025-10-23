-- Add manual input columns to warranty_claims table
ALTER TABLE warranty_claims
ADD COLUMN IF NOT EXISTS manual_customer_name TEXT,
ADD COLUMN IF NOT EXISTS manual_customer_phone TEXT,
ADD COLUMN IF NOT EXISTS manual_vehicle_brand TEXT,
ADD COLUMN IF NOT EXISTS manual_vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS manual_license_number TEXT;