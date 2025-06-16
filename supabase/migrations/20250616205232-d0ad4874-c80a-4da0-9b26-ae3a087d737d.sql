
-- First, let's clean up duplicate webhooks by keeping only the most recent one per agent
WITH ranked_webhooks AS (
  SELECT 
    id,
    agent_id,
    ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM public.ai_agent_webhooks
)
DELETE FROM public.ai_agent_webhooks 
WHERE id IN (
  SELECT id 
  FROM ranked_webhooks 
  WHERE rn > 1
);

-- Now add the unique constraint on agent_id
ALTER TABLE public.ai_agent_webhooks 
ADD CONSTRAINT ai_agent_webhooks_agent_id_unique UNIQUE (agent_id);
