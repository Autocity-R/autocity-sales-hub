-- Add RLS policies to tables that have RLS enabled but no policies

-- vehicle_files table - restrict to authenticated users
CREATE POLICY "Authenticated users can view vehicle files"
ON vehicle_files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage vehicle files"
ON vehicle_files FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ai_agents table - restrict to authenticated users, admin-only management
CREATE POLICY "Authenticated users can view AI agents"
ON ai_agents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin users can manage AI agents"
ON ai_agents FOR ALL
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- weekly_sales table - already has some policies, ensure complete coverage
-- The table already has policies, so no changes needed there