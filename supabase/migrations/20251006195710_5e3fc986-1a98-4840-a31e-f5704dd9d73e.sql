-- Add vehicle_url column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vehicle_url TEXT;

-- Add clean_customer_message column to email_messages table
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS clean_customer_message TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_vehicle_url ON leads(vehicle_url) WHERE vehicle_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_messages_clean_message ON email_messages(clean_customer_message) WHERE clean_customer_message IS NOT NULL;