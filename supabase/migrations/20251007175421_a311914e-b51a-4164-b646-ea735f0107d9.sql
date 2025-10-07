-- Update lead status enum to new values
-- First, update existing records to map old statuses to new ones
UPDATE leads 
SET status = 'appointment' 
WHERE status IN ('qualified', 'proposal', 'negotiation');

-- Add comment to document the status mapping
COMMENT ON COLUMN leads.status IS 'Lead status: new (Nieuw), contacted (Gecontacteerd), appointment (Afspraak), won (Gewonnen), lost (Verloren)';