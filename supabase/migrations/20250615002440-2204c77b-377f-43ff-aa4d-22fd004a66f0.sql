
-- Fix RLS policy for company_calendar_settings to allow service accounts to insert
DROP POLICY IF EXISTS "Allow authenticated users to manage company calendar settings" ON company_calendar_settings;

-- Create a more permissive policy that allows both authenticated users and service role access
CREATE POLICY "Allow company calendar management" 
ON company_calendar_settings 
FOR ALL 
USING (
  -- Allow if user is authenticated AND is admin/owner
  (auth.uid() IS NOT NULL AND 
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE id = auth.uid() 
     AND role IN ('admin', 'owner')
   ))
  OR
  -- Allow service role access (for edge functions)
  auth.jwt() ->> 'role' = 'service_role'
);

-- Also ensure the table has proper permissions for the service role
GRANT ALL ON company_calendar_settings TO service_role;
