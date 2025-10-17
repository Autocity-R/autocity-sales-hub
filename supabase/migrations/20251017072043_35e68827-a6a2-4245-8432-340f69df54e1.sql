-- Fix RLS policies to use role-based checks instead of USING (true)

-- ============================================
-- WARRANTY CLAIMS - Restrict to managers/admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authenticated users can insert warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authenticated users can update warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authenticated users can delete warranty claims" ON warranty_claims;

CREATE POLICY "Authorized users can view warranty claims"
ON warranty_claims FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can create warranty claims"
ON warranty_claims FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can update warranty claims"
ON warranty_claims FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can delete warranty claims"
ON warranty_claims FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- LOAN CARS - Restrict to managers/admins
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view loan cars" ON loan_cars;
DROP POLICY IF EXISTS "Authenticated users can insert loan cars" ON loan_cars;
DROP POLICY IF EXISTS "Authenticated users can update loan cars" ON loan_cars;
DROP POLICY IF EXISTS "Authenticated users can delete loan cars" ON loan_cars;

CREATE POLICY "Authorized users can view loan cars"
ON loan_cars FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can create loan cars"
ON loan_cars FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can update loan cars"
ON loan_cars FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authorized users can delete loan cars"
ON loan_cars FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- ============================================
-- AI AGENT WEBHOOKS - Restrict to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage webhooks" ON ai_agent_webhooks;

CREATE POLICY "Admins can view webhooks"
ON ai_agent_webhooks FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can create webhooks"
ON ai_agent_webhooks FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can update webhooks"
ON ai_agent_webhooks FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can delete webhooks"
ON ai_agent_webhooks FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

-- ============================================
-- AI AGENT CONTEXTS - Restrict to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage agent contexts" ON ai_agent_contexts;

CREATE POLICY "Admins can view agent contexts"
ON ai_agent_contexts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can create agent contexts"
ON ai_agent_contexts FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can update agent contexts"
ON ai_agent_contexts FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Admins can delete agent contexts"
ON ai_agent_contexts FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);