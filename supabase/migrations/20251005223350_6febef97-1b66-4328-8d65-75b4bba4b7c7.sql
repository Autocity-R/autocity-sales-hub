-- Fase 1.4: Database Indices voor Performance
-- Deze indices versnellen lead matching en email threading queries

-- Email threading performance
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_lead_id ON email_threads(lead_id);

-- Lead matching performance (voor de-duplicatie)
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email_thread_id ON leads(email_thread_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_email ON leads(source_email);

-- Message querying performance
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id ON email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);

-- Lead temperature filtering (voor rapportages)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);

-- Performance monitoring
COMMENT ON INDEX idx_email_threads_thread_id IS 'Speeds up thread lookups for duplicate detection';
COMMENT ON INDEX idx_leads_email IS 'Speeds up lead matching by email';
COMMENT ON INDEX idx_leads_phone IS 'Speeds up lead matching by phone';