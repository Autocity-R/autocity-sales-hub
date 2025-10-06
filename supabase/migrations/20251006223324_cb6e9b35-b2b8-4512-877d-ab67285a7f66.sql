-- Add new columns to leads table (backwards compatible)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS parsing_confidence DECIMAL(3,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS platform_metadata JSONB;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_parsing_confidence ON leads(parsing_confidence);