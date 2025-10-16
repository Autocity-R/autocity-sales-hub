-- ============================================================================
-- CRITICAL SECURITY FIXES - RLS Policies voor productie
-- ============================================================================

-- 1. AI AGENTS - Verwijder publieke toegang, alleen authenticated users
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to ai_agents" ON ai_agents;

CREATE POLICY "Authenticated users can view ai_agents"
ON ai_agents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify ai_agents"
ON ai_agents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- 2. VEHICLE FILES - Alleen admins en managers kunnen documenten zien
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can insert vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can update vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle files" ON vehicle_files;

CREATE POLICY "Admins and managers can view vehicle files"
ON vehicle_files FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can manage vehicle files"
ON vehicle_files FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);

-- 3. AI LEAD MEMORY - Voeg policies toe (had RLS maar geen policies!)
-- ============================================================================
CREATE POLICY "Authorized users can manage lead memory"
ON ai_lead_memory FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

-- 4. CONTACTS - Restrictiever, alleen sales en management
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;

CREATE POLICY "Authorized users can view contacts"
ON contacts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can create contacts"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can update contacts"
ON contacts FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Only admins can delete contacts"
ON contacts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- 5. LEADS - Restrictiever toegang
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

CREATE POLICY "Authorized users can view leads"
ON leads FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can update leads"
ON leads FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Only admins can delete leads"
ON leads FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- 6. EMAIL MESSAGES - Restrictiever, alleen voor sales team
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view email messages" ON email_messages;
DROP POLICY IF EXISTS "Authenticated users can insert email messages" ON email_messages;

CREATE POLICY "Authorized users can view email messages"
ON email_messages FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can insert email messages"
ON email_messages FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

-- 7. VEHICLES - Restrictiever voor gevoelige data
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON vehicles;

-- Operational users kunnen alleen lezen
CREATE POLICY "All authenticated can view vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (true);

-- Alleen sales team en admins kunnen vehicles aanmaken/wijzigen
CREATE POLICY "Authorized users can create vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can update vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Only admins can delete vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'));

-- 8. VEHICLE IMPORT LOGS - Restrictiever (was publiek!)
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to vehicle_import_logs" ON vehicle_import_logs;

CREATE POLICY "Authorized users can view import logs"
ON vehicle_import_logs FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "System can insert import logs"
ON vehicle_import_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 9. APPOINTMENTS - Restrictiever
-- ============================================================================
DROP POLICY IF EXISTS "Users can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete appointments" ON appointments;

CREATE POLICY "Authorized users can view appointments"
ON appointments FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can create appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can update appointments"
ON appointments FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'verkoper')
);

CREATE POLICY "Authorized users can delete appointments"
ON appointments FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);

-- 10. CONTRACTS - Restrictiever
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contracts;

CREATE POLICY "Authorized users can view contracts"
ON contracts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authorized users can manage contracts"
ON contracts FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'owner') OR 
  has_role(auth.uid(), 'manager')
);