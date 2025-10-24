-- Add appointment_id to warranty_claims table to link claims with appointments
ALTER TABLE warranty_claims 
ADD COLUMN appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_warranty_claims_appointment ON warranty_claims(appointment_id);

-- Add comment for documentation
COMMENT ON COLUMN warranty_claims.appointment_id IS 'Links warranty claim to scheduled appointment';