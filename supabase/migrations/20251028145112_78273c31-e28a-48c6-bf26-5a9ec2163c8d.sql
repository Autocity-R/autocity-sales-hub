-- Create function to check if user can assign tasks
CREATE OR REPLACE FUNCTION public.can_assign_tasks(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = can_assign_tasks.user_id
      AND role IN ('admin', 'owner', 'manager', 'verkoper')
  );
$$;

-- Drop old policy
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

-- Create new policy with extended permissions
CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  assigned_by = auth.uid() AND public.can_assign_tasks(auth.uid())
);