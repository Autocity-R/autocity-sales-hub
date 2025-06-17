
-- Extend leads table with email-specific fields for better sales intelligence
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_thread_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 50;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS intent_classification TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_required BOOLEAN DEFAULT false;

-- Create table for AI email processing and analysis
CREATE TABLE ai_email_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT,
  content_summary TEXT,
  lead_id UUID REFERENCES leads(id),
  lead_score INTEGER NOT NULL DEFAULT 50,
  intent_classification TEXT,
  sentiment_score DECIMAL(3,2),
  urgency_level TEXT DEFAULT 'medium',
  suggested_response TEXT,
  competitive_mentions JSONB DEFAULT '[]',
  key_insights JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processing_agent TEXT DEFAULT 'hendrik',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for lead scoring history and tracking
CREATE TABLE lead_scoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) NOT NULL,
  previous_score INTEGER,
  new_score INTEGER NOT NULL,
  scoring_factors JSONB DEFAULT '{}',
  scoring_reason TEXT,
  scored_by_agent TEXT DEFAULT 'hendrik',
  scored_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for sales AI interactions and learning
CREATE TABLE ai_sales_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type TEXT NOT NULL, -- 'email_analysis', 'response_suggestion', 'lead_scoring', 'chat'
  input_data JSONB NOT NULL,
  ai_response TEXT,
  team_feedback TEXT,
  team_rating INTEGER, -- 1-5 rating from sales team
  outcome TEXT, -- 'accepted', 'modified', 'rejected'
  success_indicators JSONB DEFAULT '{}',
  agent_name TEXT DEFAULT 'hendrik',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for email response suggestions and tracking
CREATE TABLE email_response_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_processing_id UUID REFERENCES ai_email_processing(id),
  lead_id UUID REFERENCES leads(id),
  suggested_response TEXT NOT NULL,
  response_type TEXT, -- 'information', 'pricing', 'appointment', 'follow_up'
  priority_level TEXT DEFAULT 'medium',
  personalization_factors JSONB DEFAULT '{}',
  team_action TEXT, -- 'sent_as_suggested', 'modified_and_sent', 'rejected', 'pending'
  team_modifications TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_ai_email_processing_lead_id ON ai_email_processing(lead_id);
CREATE INDEX idx_ai_email_processing_processed_at ON ai_email_processing(processed_at);
CREATE INDEX idx_lead_scoring_history_lead_id ON lead_scoring_history(lead_id);
CREATE INDEX idx_ai_sales_interactions_type ON ai_sales_interactions(interaction_type);
CREATE INDEX idx_email_response_suggestions_lead_id ON email_response_suggestions(lead_id);

-- Enable RLS on new tables
ALTER TABLE ai_email_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sales_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_response_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the new tables (allow all for now, can be restricted later)
CREATE POLICY "Allow all access to ai_email_processing" ON ai_email_processing FOR ALL USING (true);
CREATE POLICY "Allow all access to lead_scoring_history" ON lead_scoring_history FOR ALL USING (true);
CREATE POLICY "Allow all access to ai_sales_interactions" ON ai_sales_interactions FOR ALL USING (true);
CREATE POLICY "Allow all access to email_response_suggestions" ON email_response_suggestions FOR ALL USING (true);
