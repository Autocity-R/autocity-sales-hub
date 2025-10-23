-- Add loan car assignment fields to warranty_claims table
ALTER TABLE warranty_claims 
ADD COLUMN loan_car_id uuid REFERENCES loan_cars(id) ON DELETE SET NULL,
ADD COLUMN loan_car_assigned boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_warranty_claims_loan_car ON warranty_claims(loan_car_id);

-- Add comment for documentation
COMMENT ON COLUMN warranty_claims.loan_car_id IS 'Reference to the assigned loan car';
COMMENT ON COLUMN warranty_claims.loan_car_assigned IS 'Whether a loan car has been assigned to this warranty claim';