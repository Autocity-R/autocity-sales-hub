-- Fix weekly_sales table RLS policies to restrict public access

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Users can view weekly sales" ON weekly_sales;

-- Create proper policy that restricts to authenticated users only
CREATE POLICY "Authenticated users can view weekly sales"
ON weekly_sales FOR SELECT
TO authenticated
USING (true);