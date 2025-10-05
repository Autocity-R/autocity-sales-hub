-- Add status and owner_id columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new',
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);

-- Add comment to document possible status values
COMMENT ON COLUMN leads.status IS 'Possible values: new, contacted, appointment_planned, negotiation, won, lost';