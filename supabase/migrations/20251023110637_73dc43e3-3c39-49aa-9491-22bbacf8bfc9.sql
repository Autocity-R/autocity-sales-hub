-- Add manual license number column to warranty_claims table
ALTER TABLE warranty_claims
ADD COLUMN IF NOT EXISTS manual_license_number text;

COMMENT ON COLUMN warranty_claims.manual_license_number IS 'Handmatig ingevoerd kenteken voor claims zonder vehicle_id';