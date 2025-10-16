-- ============================================================================
-- CRITICAL SECURITY FIXES - Phase 3: Tighten RLS Policies
-- ============================================================================

-- 1. EMAIL_MESSAGES - Restrict to assigned sales and admins only
-- ============================================================================
DROP POLICY IF EXISTS "Authorized users can view email messages" ON email_messages;
DROP POLICY IF EXISTS "Authorized users can insert email messages" ON email_messages;

CREATE POLICY "Users can view emails for their assigned leads"
ON email_messages FOR SELECT
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() 
       OR owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "System can insert email messages"
ON email_messages FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. LEADS - Restrict to assigned sales and managers
-- ============================================================================  
DROP POLICY IF EXISTS "Authorized users can view leads" ON leads;
DROP POLICY IF EXISTS "Authorized users can update leads" ON leads;

CREATE POLICY "Users can view their assigned leads"
ON leads FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR owner_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can update their assigned leads"
ON leads FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid()
  OR owner_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  assigned_to = auth.uid()
  OR owner_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- 3. CONTACTS - Keep existing policies (they are correct)
-- Currently: verkoper, manager, admin, owner can access
-- This is appropriate for a CRM

-- 4. EMAIL_QUEUE - Restrict to system/admin only
-- ============================================================================
DROP POLICY IF EXISTS "Users can view email queue items" ON email_queue;
DROP POLICY IF EXISTS "Users can insert email queue items" ON email_queue;

CREATE POLICY "Only admins can view email queue"
ON email_queue FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "System can insert email queue items"
ON email_queue FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. LEAD_SCORING_HISTORY - Restrict to admins and managers
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to lead_scoring_history" ON lead_scoring_history;

CREATE POLICY "Admins and managers can view scoring history"
ON lead_scoring_history FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "System can insert scoring history"
ON lead_scoring_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. AI_EMAIL_PROCESSING - Restrict to admins and assigned sales
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to ai_email_processing" ON ai_email_processing;

CREATE POLICY "Users can view AI processing for their leads"
ON ai_email_processing FOR SELECT
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() 
       OR owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "System can insert AI processing"
ON ai_email_processing FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. EMAIL_RESPONSE_SUGGESTIONS - Restrict to assigned sales and admins
-- ============================================================================
DROP POLICY IF EXISTS "Allow all access to email_response_suggestions" ON email_response_suggestions;

CREATE POLICY "Users can view suggestions for their leads"
ON email_response_suggestions FOR SELECT
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() 
       OR owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can update suggestions for their leads"
ON email_response_suggestions FOR UPDATE
TO authenticated
USING (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() 
       OR owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() 
       OR owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "System can insert response suggestions"
ON email_response_suggestions FOR INSERT
TO authenticated
WITH CHECK (true);