-- Drop de bestaande SELECT policies
DROP POLICY IF EXISTS "Role-based task visibility" ON tasks;
DROP POLICY IF EXISTS "Authorized users can view tasks" ON tasks;

-- Creëer één duidelijke SELECT policy met ALLE rollen
CREATE POLICY "All roles can view relevant tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    -- Management rollen: zien alle taken
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    -- Operationele rollen: zien alleen hun toegewezen taken
    public.has_role(auth.uid(), 'operationeel'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    -- Fallback: iedereen ziet taken die aan hen zijn toegewezen
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  );

-- Update ook de UPDATE policy om operationeel toe te voegen
DROP POLICY IF EXISTS "Users can update relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks they can manage" ON tasks;

CREATE POLICY "All roles can update relevant tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    public.has_role(auth.uid(), 'operationeel'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    public.has_role(auth.uid(), 'operationeel'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  );