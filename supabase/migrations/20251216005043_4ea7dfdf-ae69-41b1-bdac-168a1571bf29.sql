-- Drop the overly permissive policy that exposes all profiles to any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- The remaining policies are sufficient:
-- - "Users can view their own profile" (auth.uid() = id)
-- - "Admin users can view all profiles" (is_admin_or_owner())
-- - "All users can view salespeople profiles" (for viewing sales team members)