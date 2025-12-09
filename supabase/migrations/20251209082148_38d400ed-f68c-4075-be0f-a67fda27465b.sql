-- Drop de huidige beperkte SELECT policy
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON tasks;

-- Maak nieuwe policy: verkopers en managers kunnen alle taken zien
CREATE POLICY "Authorized users can view tasks"
ON tasks FOR SELECT
USING (
  -- Admins/owners zien alles
  is_admin_user(auth.uid()) OR
  -- Managers en verkopers zien alle taken (voor coördinatie)
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'verkoper'::app_role) OR
  -- Operationele medewerkers zien alleen hun eigen toegewezen taken
  (assigned_to = auth.uid()) OR
  (assigned_by = auth.uid())
);