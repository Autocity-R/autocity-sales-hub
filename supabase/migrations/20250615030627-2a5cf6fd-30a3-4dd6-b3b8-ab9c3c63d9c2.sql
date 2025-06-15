
-- Add system data access capabilities to AI agents
ALTER TABLE public.ai_agents 
ADD COLUMN data_access_permissions jsonb DEFAULT '{
  "leads": true,
  "customers": true,
  "vehicles": true,
  "appointments": true,
  "contracts": true
}'::jsonb,
ADD COLUMN context_settings jsonb DEFAULT '{
  "include_recent_activity": true,
  "max_context_items": 10,
  "preferred_data_sources": ["leads", "appointments"]
}'::jsonb;

-- Create a table to store agent-specific system queries and context
CREATE TABLE public.ai_agent_contexts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  context_type text NOT NULL, -- 'lead_data', 'customer_data', 'vehicle_data', etc.
  query_template text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_contexts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Authenticated users can manage agent contexts" 
ON public.ai_agent_contexts 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_ai_agent_contexts 
BEFORE UPDATE ON public.ai_agent_contexts 
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert sample context configurations for existing agents
INSERT INTO public.ai_agent_contexts (agent_id, context_type, query_template, priority)
SELECT 
  id,
  'lead_data',
  'SELECT id, first_name, last_name, email, phone, status, interested_vehicle, budget FROM leads WHERE status IN (''new'', ''contacted'', ''qualified'') ORDER BY created_at DESC LIMIT 5',
  1
FROM public.ai_agents
WHERE name LIKE '%Calendar%';

INSERT INTO public.ai_agent_contexts (agent_id, context_type, query_template, priority)
SELECT 
  id,
  'appointment_data',
  'SELECT id, title, start_time, end_time, customer_name, status FROM appointments WHERE start_time >= NOW() ORDER BY start_time ASC LIMIT 5',
  2
FROM public.ai_agents
WHERE name LIKE '%Calendar%';

-- Update existing agents with better data access permissions
UPDATE public.ai_agents 
SET 
  data_access_permissions = '{
    "leads": true,
    "customers": true,
    "vehicles": false,
    "appointments": true,
    "contracts": false
  }'::jsonb,
  context_settings = '{
    "include_recent_activity": true,
    "max_context_items": 8,
    "preferred_data_sources": ["leads", "appointments"]
  }'::jsonb
WHERE name LIKE '%Calendar%';
