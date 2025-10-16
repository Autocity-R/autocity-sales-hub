-- ============================================================================
-- CRITICAL SECURITY FIXES - Phase 2: Policy Cleanup & Profiles Role Removal
-- ============================================================================

-- 1. VEHICLE_FILES - Verwijder oude permissive policies
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can manage vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can view vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can insert vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can update vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Users can view vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Users can create vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Users can update their own vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Users can delete their own vehicle files" ON vehicle_files;

-- Nu blijven alleen de restrictieve policies over:
-- - "Admins and managers can view vehicle files"
-- - "Admins and managers can manage vehicle files"

-- 2. PROFILES - Verwijder role kolom als deze bestaat
-- ============================================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;

-- 3. AI_AGENTS - Verwijder publieke toegang policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Public read access to ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can view ai_agents" ON ai_agents;

-- De nieuwe policies zijn al correct:
-- - "Authenticated users can view ai_agents"
-- - "Only admins can modify ai_agents"

-- 4. UPDATE PROFILES POLICIES - Gebruik user_roles in plaats van profiles.role
-- ============================================================================
DROP POLICY IF EXISTS "All users can view salespeople profiles" ON profiles;

CREATE POLICY "All users can view salespeople profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = profiles.id AND role = 'verkoper'::app_role
  )
);

-- 5. COMPANY_CALENDAR_SETTINGS - Fix policies om user_roles te gebruiken
-- ============================================================================
DROP POLICY IF EXISTS "Admin users can manage company calendar settings" ON company_calendar_settings;

CREATE POLICY "Admin users can manage company calendar settings"
ON company_calendar_settings FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
);

-- 6. AI_AGENT_CALENDAR_SETTINGS - Fix policies om user_roles te gebruiken  
-- ============================================================================
DROP POLICY IF EXISTS "Admin users can manage AI agent calendar settings" ON ai_agent_calendar_settings;

CREATE POLICY "Admin users can manage AI agent calendar settings"
ON ai_agent_calendar_settings FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
);