
-- Step 1: Synchronize existing data between ai_agents and ai_agent_webhooks tables
UPDATE ai_agents 
SET 
  webhook_url = (
    SELECT webhook_url 
    FROM ai_agent_webhooks 
    WHERE ai_agent_webhooks.agent_id = ai_agents.id 
    AND ai_agent_webhooks.is_active = true
    LIMIT 1
  ),
  is_webhook_enabled = (
    SELECT CASE 
      WHEN COUNT(*) > 0 THEN true 
      ELSE false 
    END
    FROM ai_agent_webhooks 
    WHERE ai_agent_webhooks.agent_id = ai_agents.id 
    AND ai_agent_webhooks.is_active = true
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 
  FROM ai_agent_webhooks 
  WHERE ai_agent_webhooks.agent_id = ai_agents.id
);

-- Step 2: Create a function to keep ai_agents and ai_agent_webhooks synchronized
CREATE OR REPLACE FUNCTION sync_ai_agent_webhook_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When ai_agent_webhooks is inserted, updated, or deleted
  -- Update the corresponding ai_agents record
  
  IF TG_OP = 'DELETE' THEN
    -- Check if there are any other active webhooks for this agent
    UPDATE ai_agents 
    SET 
      is_webhook_enabled = (
        SELECT CASE 
          WHEN COUNT(*) > 0 THEN true 
          ELSE false 
        END
        FROM ai_agent_webhooks 
        WHERE agent_id = OLD.agent_id 
        AND is_active = true
      ),
      webhook_url = (
        SELECT webhook_url 
        FROM ai_agent_webhooks 
        WHERE agent_id = OLD.agent_id 
        AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      ),
      updated_at = now()
    WHERE id = OLD.agent_id;
    
    RETURN OLD;
  END IF;
  
  -- For INSERT and UPDATE operations
  UPDATE ai_agents 
  SET 
    is_webhook_enabled = NEW.is_active,
    webhook_url = CASE 
      WHEN NEW.is_active THEN NEW.webhook_url 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create triggers to maintain synchronization
DROP TRIGGER IF EXISTS trigger_sync_webhook_status_insert ON ai_agent_webhooks;
DROP TRIGGER IF EXISTS trigger_sync_webhook_status_update ON ai_agent_webhooks;
DROP TRIGGER IF EXISTS trigger_sync_webhook_status_delete ON ai_agent_webhooks;

CREATE TRIGGER trigger_sync_webhook_status_insert
  AFTER INSERT ON ai_agent_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION sync_ai_agent_webhook_status();

CREATE TRIGGER trigger_sync_webhook_status_update
  AFTER UPDATE ON ai_agent_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION sync_ai_agent_webhook_status();

CREATE TRIGGER trigger_sync_webhook_status_delete
  AFTER DELETE ON ai_agent_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION sync_ai_agent_webhook_status();

-- Step 4: Add a function to verify webhook synchronization
CREATE OR REPLACE FUNCTION verify_webhook_sync(agent_uuid UUID)
RETURNS TABLE(
  agent_id UUID,
  agent_name TEXT,
  agents_webhook_enabled BOOLEAN,
  agents_webhook_url TEXT,
  webhooks_count BIGINT,
  active_webhooks_count BIGINT,
  is_synchronized BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.is_webhook_enabled,
    a.webhook_url,
    COALESCE(w.total_webhooks, 0) as webhooks_count,
    COALESCE(w.active_webhooks, 0) as active_webhooks_count,
    (
      a.is_webhook_enabled = (COALESCE(w.active_webhooks, 0) > 0) AND
      (
        (a.webhook_url IS NULL AND COALESCE(w.active_webhooks, 0) = 0) OR
        (a.webhook_url IS NOT NULL AND COALESCE(w.active_webhooks, 0) > 0)
      )
    ) as is_synchronized
  FROM ai_agents a
  LEFT JOIN (
    SELECT 
      agent_id,
      COUNT(*) as total_webhooks,
      COUNT(*) FILTER (WHERE is_active = true) as active_webhooks
    FROM ai_agent_webhooks
    GROUP BY agent_id
  ) w ON a.id = w.agent_id
  WHERE (agent_uuid IS NULL OR a.id = agent_uuid);
END;
$$ LANGUAGE plpgsql;
