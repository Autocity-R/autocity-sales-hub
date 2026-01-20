-- =====================================================
-- SECURITY FIX: RLS Policies en Function Search Paths
-- Geen data verlies - alleen toegangsbeperking
-- =====================================================

-- =====================================================
-- DEEL 1: AI/Business Intelligence Tabellen Beveiligen
-- =====================================================

-- ai_memory: Verwijder publieke SELECT policy (als die bestaat)
DROP POLICY IF EXISTS "Authenticated users can view ai_memory" ON ai_memory;

-- ai_briefings: Beperken tot management rollen
DROP POLICY IF EXISTS "Authenticated users can view ai_briefings" ON ai_briefings;
CREATE POLICY "Management can view ai_briefings" ON ai_briefings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role)
  );

-- ai_sales_interactions: Beperken tot management voor SELECT
DROP POLICY IF EXISTS "Allow all access to ai_sales_interactions" ON ai_sales_interactions;
CREATE POLICY "Management can view ai_sales_interactions" ON ai_sales_interactions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role)
  );
CREATE POLICY "System can insert ai_sales_interactions" ON ai_sales_interactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "System can update ai_sales_interactions" ON ai_sales_interactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- DEEL 2: Overige Tabellen: public → authenticated
-- =====================================================

-- competitor_vehicles: Van public naar authenticated
DROP POLICY IF EXISTS "System can manage competitor vehicles" ON competitor_vehicles;
CREATE POLICY "Authenticated users can manage competitor vehicles" ON competitor_vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- competitor_scrape_logs: Van public naar authenticated  
DROP POLICY IF EXISTS "System can manage scrape logs" ON competitor_scrape_logs;
CREATE POLICY "Authenticated users can manage scrape logs" ON competitor_scrape_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- email_reminders: Van public naar authenticated
DROP POLICY IF EXISTS "Allow all access to email_reminders" ON email_reminders;
CREATE POLICY "Authenticated users can manage email_reminders" ON email_reminders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- DEEL 3: Function Search Path Fixes (SQL Injection preventie)
-- =====================================================

-- Fix get_week_start_date
CREATE OR REPLACE FUNCTION public.get_week_start_date(input_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $function$
  SELECT (input_date - INTERVAL '1 day' * EXTRACT(DOW FROM input_date)::int + INTERVAL '1 day')::date;
$function$;

-- Fix clean_expired_exact_online_cache
CREATE OR REPLACE FUNCTION public.clean_expired_exact_online_cache()
RETURNS integer
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM exact_online_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix get_valid_exact_online_token (behoud SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_valid_exact_online_token(user_uuid uuid)
RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone, division_code character varying, needs_refresh boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.access_token,
    t.refresh_token,
    t.expires_at,
    t.division_code,
    (t.expires_at < NOW() + INTERVAL '5 minutes') as needs_refresh
  FROM exact_online_tokens t
  WHERE t.user_id = user_uuid
  ORDER BY t.updated_at DESC
  LIMIT 1;
END;
$function$;

-- Fix verify_webhook_sync
CREATE OR REPLACE FUNCTION public.verify_webhook_sync(agent_uuid uuid)
RETURNS TABLE(agent_id uuid, agent_name text, agents_webhook_enabled boolean, agents_webhook_url text, webhooks_count bigint, active_webhooks_count bigint, is_synchronized boolean)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
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
      aw.agent_id,
      COUNT(*) as total_webhooks,
      COUNT(*) FILTER (WHERE aw.is_active = true) as active_webhooks
    FROM ai_agent_webhooks aw
    GROUP BY aw.agent_id
  ) w ON a.id = w.agent_id
  WHERE (agent_uuid IS NULL OR a.id = agent_uuid);
END;
$function$;