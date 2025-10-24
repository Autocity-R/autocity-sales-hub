-- Add estimated_amount column to separate estimated from actual costs
ALTER TABLE warranty_claims 
ADD COLUMN estimated_amount numeric;

-- Create index for performance
CREATE INDEX idx_warranty_claims_estimated_amount ON warranty_claims(estimated_amount);

-- Migrate existing data: for non-resolved claims, claim_amount is the estimate
UPDATE warranty_claims 
SET estimated_amount = claim_amount
WHERE claim_status != 'resolved';

-- For resolved claims, we've lost the original estimate, so use actual (best effort)
UPDATE warranty_claims 
SET estimated_amount = claim_amount  
WHERE claim_status = 'resolved';

COMMENT ON COLUMN warranty_claims.estimated_amount IS 'Initial estimated cost for the warranty claim';
COMMENT ON COLUMN warranty_claims.claim_amount IS 'Actual cost after claim resolution (null for pending claims)';