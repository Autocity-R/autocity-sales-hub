-- FASE 2: Email Thread Management & Historie
-- Extend email_threads table with tracking fields
ALTER TABLE email_threads 
ADD COLUMN IF NOT EXISTS from_email TEXT,
ADD COLUMN IF NOT EXISTS to_email TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived'));

-- Update last_message_date automatically
CREATE OR REPLACE FUNCTION update_thread_message_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE email_threads
  SET 
    message_count = message_count + 1,
    last_message_date = NEW.received_at,
    updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_thread_stats ON email_messages;
CREATE TRIGGER trigger_update_thread_stats
  AFTER INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_message_stats();

-- FASE 3: AI Email Processing Pipeline
-- Add email_message_id foreign key and response tracking
ALTER TABLE ai_email_processing
ADD COLUMN IF NOT EXISTS email_message_id UUID REFERENCES email_messages(id),
ADD COLUMN IF NOT EXISTS response_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_sent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_email_processing_message_id ON ai_email_processing(email_message_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_processing_lead_id ON ai_email_processing(lead_id);

-- FASE 4: Lead Scoring & Prioritering
-- Add AI analysis timestamp to leads
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_ai_analysis TIMESTAMP WITH TIME ZONE;

-- Add scoring breakdown to history
ALTER TABLE lead_scoring_history
ADD COLUMN IF NOT EXISTS engagement_score INTEGER,
ADD COLUMN IF NOT EXISTS sentiment_score INTEGER,
ADD COLUMN IF NOT EXISTS urgency_score INTEGER,
ADD COLUMN IF NOT EXISTS match_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_response_required ON leads(response_required) WHERE response_required = true;

-- FASE 5: Response Suggestions & Team Learning
-- Add team learning fields to response suggestions
ALTER TABLE email_response_suggestions
ADD COLUMN IF NOT EXISTS used_by_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_rating INTEGER CHECK (team_rating >= 1 AND team_rating <= 5),
ADD COLUMN IF NOT EXISTS actual_response_sent TEXT,
ADD COLUMN IF NOT EXISTS modified_by_team BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_response_suggestions_lead ON email_response_suggestions(lead_id);
CREATE INDEX IF NOT EXISTS idx_response_suggestions_rating ON email_response_suggestions(team_rating) WHERE team_rating IS NOT NULL;