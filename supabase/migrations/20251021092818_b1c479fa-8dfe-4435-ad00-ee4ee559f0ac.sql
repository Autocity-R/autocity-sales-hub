-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authorized users can view warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authorized users can create warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authorized users can update warranty claims" ON warranty_claims;
DROP POLICY IF EXISTS "Authorized users can delete warranty claims" ON warranty_claims;

-- Create new policies for all authenticated users
CREATE POLICY "All authenticated users can view warranty claims" 
ON warranty_claims
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can create warranty claims" 
ON warranty_claims
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can update warranty claims" 
ON warranty_claims
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Keep DELETE restricted to management
CREATE POLICY "Authorized users can delete warranty claims" 
ON warranty_claims
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);