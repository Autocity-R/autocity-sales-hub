-- Drop oude policy
DROP POLICY IF EXISTS "Authorized users can update vehicles" ON vehicles;

-- Maak nieuwe policy met aftersales_manager
CREATE POLICY "Authorized users can update vehicles" 
ON vehicles FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
);