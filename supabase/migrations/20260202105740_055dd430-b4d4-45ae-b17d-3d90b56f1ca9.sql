-- Fix: Add aftersales_manager role to contacts SELECT policy
-- This allows the aftersales manager to see customer information linked to vehicles

DROP POLICY IF EXISTS "Authorized users can view contacts" ON contacts;

CREATE POLICY "Authorized users can view contacts" 
ON contacts FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role) OR
  has_role(auth.uid(), 'aftersales_manager'::app_role)
);