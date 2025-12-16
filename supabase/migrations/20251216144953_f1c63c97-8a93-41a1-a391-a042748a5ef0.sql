-- Update can_manage_task functie zodat verkopers en managers alle taken kunnen beheren
CREATE OR REPLACE FUNCTION public.can_manage_task(user_id uuid, task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND (
        -- Taak is toegewezen aan deze gebruiker
        t.assigned_to = user_id OR 
        -- Taak is aangemaakt door deze gebruiker
        t.assigned_by = user_id OR
        -- Gebruiker is admin of owner
        public.is_admin_user(user_id) OR
        -- Gebruiker is manager of verkoper
        public.has_role(user_id, 'manager') OR
        public.has_role(user_id, 'verkoper')
      )
  );
$$;