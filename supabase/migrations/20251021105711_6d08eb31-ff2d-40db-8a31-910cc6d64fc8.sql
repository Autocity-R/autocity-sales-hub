-- Allow authenticated users to view user_roles for sales-related roles
-- This enables verkopers to see other verkopers/admins/owners when assigning purchasers and salespeople to vehicles

-- First, drop the restrictive policy that only allows users to see their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create a new policy that allows users to view roles for verkoper, admin, and owner users
CREATE POLICY "Users can view sales team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own roles
  user_id = auth.uid()
  OR
  -- Admins can see all roles
  is_admin_or_owner()
  OR
  -- All authenticated users can view roles of verkoper, admin, and owner
  -- This is needed for vehicle assignment dropdowns
  role IN ('verkoper', 'admin', 'owner')
);

-- Ensure authenticated users can view profiles needed for the salespeople selector
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create new policy for profiles visibility
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);