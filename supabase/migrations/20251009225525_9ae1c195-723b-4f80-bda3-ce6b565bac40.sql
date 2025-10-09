-- Fix vehicles table RLS to restrict access to authenticated users only
-- Drop existing policies that allow public access
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON vehicles;

-- Create proper RLS policies that restrict to authenticated role only
CREATE POLICY "Authenticated users can view vehicles"
ON vehicles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
ON vehicles FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
ON vehicles FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
ON vehicles FOR DELETE 
TO authenticated
USING (true);