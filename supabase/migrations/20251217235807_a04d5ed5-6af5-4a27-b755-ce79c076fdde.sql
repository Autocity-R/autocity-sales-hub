-- FASE 2: AI Memory & Briefings System met Agent Scheiding

-- Tabel 1: ai_memory - Bedrijfskennis per AI agent
CREATE TABLE ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  memory_type text NOT NULL, -- 'supplier', 'model', 'salesperson', 'market', 'strategy'
  entity_name text NOT NULL, -- Alphabet, BMW X5, Daan, etc.
  insight text NOT NULL,
  confidence numeric DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  source_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  
  -- Unique constraint voor upsert - voorkomt duplicaten per agent
  UNIQUE (agent_id, memory_type, entity_name)
);

-- Indexes voor performance
CREATE INDEX idx_ai_memory_agent ON ai_memory(agent_id);
CREATE INDEX idx_ai_memory_active ON ai_memory(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_memory_type ON ai_memory(memory_type);
CREATE INDEX idx_ai_memory_expires ON ai_memory(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policy
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai_memory" ON ai_memory
  FOR SELECT USING (true);

CREATE POLICY "Authorized users can manage ai_memory" ON ai_memory
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- System kan altijd memories toevoegen (voor edge functions)
CREATE POLICY "System can insert ai_memory" ON ai_memory
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update ai_memory" ON ai_memory
  FOR UPDATE USING (true) WITH CHECK (true);

COMMENT ON TABLE ai_memory IS 'Bedrijfskennis per AI agent - gescheiden van klant-specifieke ai_lead_memory';

-- Tabel 2: ai_briefings - Automatische briefings per agent
CREATE TABLE ai_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  briefing_type text NOT NULL, -- 'daily', 'weekly', 'monthly'
  briefing_date date NOT NULL,
  content text NOT NULL,
  summary text, -- Korte samenvatting voor notificaties
  alerts_included integer DEFAULT 0,
  memories_used integer DEFAULT 0,
  data_snapshot jsonb DEFAULT '{}', -- Snapshot van data op moment van briefing
  created_at timestamp with time zone DEFAULT NOW(),
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  read_by uuid,
  
  -- Unique constraint - 1 briefing per type per dag per agent
  UNIQUE (agent_id, briefing_type, briefing_date)
);

-- Indexes
CREATE INDEX idx_ai_briefings_agent ON ai_briefings(agent_id);
CREATE INDEX idx_ai_briefings_unread ON ai_briefings(is_read) WHERE is_read = false;
CREATE INDEX idx_ai_briefings_date ON ai_briefings(briefing_date DESC);
CREATE INDEX idx_ai_briefings_type ON ai_briefings(briefing_type);

-- RLS Policy
ALTER TABLE ai_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai_briefings" ON ai_briefings
  FOR SELECT USING (true);

CREATE POLICY "System can insert ai_briefings" ON ai_briefings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark briefings as read" ON ai_briefings
  FOR UPDATE USING (true) WITH CHECK (true);

COMMENT ON TABLE ai_briefings IS 'Automatisch gegenereerde briefings per AI agent (daily/weekly/monthly)';