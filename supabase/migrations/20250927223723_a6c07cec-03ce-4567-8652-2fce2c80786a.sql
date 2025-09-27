-- Add policy for admin users to update all profiles
CREATE POLICY "Admin users can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());