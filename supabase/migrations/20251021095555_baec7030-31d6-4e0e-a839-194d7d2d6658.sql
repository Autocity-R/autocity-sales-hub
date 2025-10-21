-- Update loan_cars RLS policies to allow all authenticated users to view
-- Only admin, owner, manager can modify, but everyone can view

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authorized users can view loan cars" ON loan_cars;

-- Create new SELECT policy that allows all authenticated users to view
CREATE POLICY "All authenticated users can view loan cars" 
ON loan_cars
FOR SELECT 
TO authenticated
USING (true);

-- Keep the restrictive policies for INSERT, UPDATE, DELETE
-- (admin, owner, manager only can modify)

COMMENT ON POLICY "All authenticated users can view loan cars" ON loan_cars IS 
'Alle ingelogde gebruikers kunnen leenauto''s bekijken. Alleen admin, owner en manager kunnen deze wijzigen.';