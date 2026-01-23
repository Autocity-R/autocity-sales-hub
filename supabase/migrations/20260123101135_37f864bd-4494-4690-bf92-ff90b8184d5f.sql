-- Drop de bestaande policies
DROP POLICY IF EXISTS "All roles can view relevant tasks" ON tasks;
DROP POLICY IF EXISTS "All roles can update relevant tasks" ON tasks;

-- Nieuwe SELECT policy: operationeel ziet ALLEEN eigen taken
CREATE POLICY "All roles can view relevant tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    -- Management rollen: zien ALLE taken
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    -- Operationeel en anderen: alleen hun eigen taken
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  );

-- Nieuwe UPDATE policy: operationeel kan ALLEEN eigen taken updaten
CREATE POLICY "All roles can update relevant tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'owner'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'verkoper'::app_role) OR
    public.has_role(auth.uid(), 'aftersales_manager'::app_role) OR
    (assigned_to = auth.uid()) OR 
    (assigned_by = auth.uid())
  );