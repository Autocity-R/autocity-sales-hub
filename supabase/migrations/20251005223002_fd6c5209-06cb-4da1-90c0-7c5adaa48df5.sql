-- Add html_body column to email_messages for archiving raw HTML
ALTER TABLE email_messages 
ADD COLUMN IF NOT EXISTS html_body TEXT;

-- Add comment to document the difference
COMMENT ON COLUMN email_messages.body IS 'Cleaned plain text version for display';
COMMENT ON COLUMN email_messages.html_body IS 'Raw HTML version for archival purposes';