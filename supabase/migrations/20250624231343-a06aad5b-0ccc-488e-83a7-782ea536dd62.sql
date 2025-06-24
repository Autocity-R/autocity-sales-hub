
-- Add lead_id to ai_chat_sessions for lead-session linking
ALTER TABLE ai_chat_sessions 
ADD COLUMN lead_id uuid REFERENCES leads(id);

-- Create index for efficient lead-session lookups
CREATE INDEX idx_ai_chat_sessions_lead_id ON ai_chat_sessions(lead_id);

-- Create table for persistent lead context/preferences
CREATE TABLE ai_lead_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id),
  context_type text NOT NULL, -- 'preference', 'conversation_summary', 'sales_phase', 'objection_history'
  context_data jsonb NOT NULL DEFAULT '{}',
  importance_score integer DEFAULT 5, -- 1-10 scale for context relevance
  expires_at timestamp with time zone, -- Optional expiration for time-sensitive context
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for ai_lead_memory
ALTER TABLE ai_lead_memory ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient memory retrieval
CREATE INDEX idx_ai_lead_memory_lead_id ON ai_lead_memory(lead_id);
CREATE INDEX idx_ai_lead_memory_context_type ON ai_lead_memory(context_type);
CREATE INDEX idx_ai_lead_memory_importance ON ai_lead_memory(importance_score DESC);

-- Create trigger for updated_at on ai_lead_memory
CREATE TRIGGER set_ai_lead_memory_updated_at
  BEFORE UPDATE ON ai_lead_memory
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Add memory-related columns to ai_chat_sessions
ALTER TABLE ai_chat_sessions 
ADD COLUMN memory_context jsonb DEFAULT '{}',
ADD COLUMN context_summary text;

-- Update ai_chat_messages to track context usage
ALTER TABLE ai_chat_messages 
ADD COLUMN context_items_used jsonb DEFAULT '[]',
ADD COLUMN memory_references jsonb DEFAULT '{}';
