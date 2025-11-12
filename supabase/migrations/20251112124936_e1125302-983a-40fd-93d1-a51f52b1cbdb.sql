-- Drop oude policies
DROP POLICY IF EXISTS "Admins and managers can view vehicle files" ON vehicle_files;
DROP POLICY IF EXISTS "Admins and managers can manage vehicle files" ON vehicle_files;

-- Nieuwe policy voor SELECT (bekijken)
CREATE POLICY "Authenticated users can view vehicle files"
ON vehicle_files
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'verkoper'::app_role)
);

-- Nieuwe policy voor INSERT, UPDATE, DELETE (beheren)
CREATE POLICY "Authenticated users can manage vehicle files"
ON vehicle_files
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'verkoper'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'verkoper'::app_role)
);