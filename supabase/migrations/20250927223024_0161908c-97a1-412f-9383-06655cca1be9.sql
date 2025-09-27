-- Drop the problematic policy first
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;

-- Create a security definer function to check admin role (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

-- Add policy for admin users to view all profiles using the function
CREATE POLICY "Admin users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin_or_owner());