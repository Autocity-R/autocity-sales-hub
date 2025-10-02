-- Add resolution_description column to warranty_claims table
ALTER TABLE warranty_claims 
ADD COLUMN IF NOT EXISTS resolution_description text,
ADD COLUMN IF NOT EXISTS resolution_date timestamp with time zone;