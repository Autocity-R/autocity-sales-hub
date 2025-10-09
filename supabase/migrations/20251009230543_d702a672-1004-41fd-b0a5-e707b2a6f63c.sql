-- Fix contacts table RLS to restrict public access
-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON contacts;

-- Drop any potential public access policies
DROP POLICY IF EXISTS "Allow all access to contacts" ON contacts;
DROP POLICY IF EXISTS "Public can view contacts" ON contacts;

-- Create proper RLS policies that restrict to authenticated users only
CREATE POLICY "Authenticated users can view contacts"
ON contacts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contacts"
ON contacts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
ON contacts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contacts"
ON contacts FOR DELETE
TO authenticated
USING (true);