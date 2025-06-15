
-- Extend ai_agents table with webhook configuration
ALTER TABLE public.ai_agents 
ADD COLUMN webhook_url text,
ADD COLUMN webhook_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN is_webhook_enabled boolean DEFAULT false;

-- Create ai_agent_webhooks table for multiple webhook endpoints per agent
CREATE TABLE public.ai_agent_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  webhook_name text NOT NULL,
  webhook_url text NOT NULL,
  workflow_type text NOT NULL, -- 'calendar', 'crm', 'general', etc.
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 3,
  timeout_seconds integer DEFAULT 30,
  headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ai_chat_sessions table for storing chat sessions
CREATE TABLE public.ai_chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active', -- 'active', 'ended', 'error'
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

-- Create ai_chat_messages table for storing individual messages
CREATE TABLE public.ai_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  message_type text NOT NULL, -- 'user', 'assistant', 'system'
  content text NOT NULL,
  webhook_triggered boolean DEFAULT false,
  webhook_response jsonb,
  processing_time_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ai_webhook_logs table for logging webhook calls
CREATE TABLE public.ai_webhook_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.ai_chat_sessions(id),
  webhook_id uuid REFERENCES public.ai_agent_webhooks(id),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id),
  webhook_url text NOT NULL,
  request_payload jsonb NOT NULL,
  response_payload jsonb,
  status_code integer,
  success boolean DEFAULT false,
  error_message text,
  processing_time_ms integer,
  retry_attempt integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ai_agent_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage webhooks" ON public.ai_agent_webhooks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can access their chat sessions" ON public.ai_chat_sessions FOR ALL TO authenticated USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can access messages from their sessions" ON public.ai_chat_messages FOR ALL TO authenticated USING (
  session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL)
) WITH CHECK (
  session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid() OR user_id IS NULL)
);
CREATE POLICY "Authenticated users can view webhook logs" ON public.ai_webhook_logs FOR SELECT TO authenticated USING (true);

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_ai_agent_webhooks BEFORE UPDATE ON public.ai_agent_webhooks FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_updated_at_ai_chat_sessions BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert sample webhook configurations
INSERT INTO public.ai_agent_webhooks (agent_id, webhook_name, webhook_url, workflow_type) 
SELECT 
  id, 
  'Calendar Operations', 
  'https://your-n8n-instance.com/webhook/calendar-agent', 
  'calendar'
FROM public.ai_agents 
WHERE name = 'Robin - Calendar Assistant';

-- Update existing ai_agents with webhook configuration
UPDATE public.ai_agents 
SET 
  is_webhook_enabled = true,
  webhook_config = '{"timeout": 30, "retries": 3, "rate_limit": 60}'::jsonb
WHERE name = 'Robin - Calendar Assistant';
