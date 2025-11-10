-- Drop de oude restrictieve policy
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- Maak een nieuwe policy die zowel admins als task creators toestaat te verwijderen
CREATE POLICY "Admins and task creators can delete tasks"
ON tasks
FOR DELETE
TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR assigned_by = auth.uid()
);