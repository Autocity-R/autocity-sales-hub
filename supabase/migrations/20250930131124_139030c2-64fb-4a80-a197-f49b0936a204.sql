-- Add policy to allow all authenticated users to view salespeople profiles
CREATE POLICY "All users can view salespeople profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (role = 'verkoper');