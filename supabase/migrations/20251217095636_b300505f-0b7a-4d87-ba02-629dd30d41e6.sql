-- ===========================================
-- 1. UPDATE PROFILES RLS - Allow all authenticated users to see all profiles
-- ===========================================

-- Drop existing SELECT policies that restrict viewing
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "All users can view salespeople profiles" ON public.profiles;

-- Create new policy: ALL authenticated users can view ALL profiles
CREATE POLICY "All authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- ===========================================
-- 2. UPDATE can_assign_tasks FUNCTION - Allow ALL authenticated users
-- ===========================================

CREATE OR REPLACE FUNCTION public.can_assign_tasks(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Allow all authenticated users to assign tasks
  SELECT user_id IS NOT NULL;
$function$;

-- ===========================================
-- 3. UPDATE TASKS RLS - Role-based visibility
-- ===========================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;

-- Create new policy: Verkopers and above see ALL tasks, operationeel sees only their own
CREATE POLICY "Role-based task visibility" 
ON public.tasks 
FOR SELECT 
TO authenticated
USING (
  -- Admin, owner, manager, verkoper can see ALL tasks
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'verkoper') OR
  -- Other users (operationeel, user) can only see tasks assigned to them
  assigned_to = auth.uid()
);

-- Update INSERT policy to allow all authenticated users
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

CREATE POLICY "All authenticated users can create tasks" 
ON public.tasks 
FOR INSERT 
TO authenticated
WITH CHECK (assigned_by = auth.uid());

-- Update UPDATE policy to be more permissive for assigned users
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;

CREATE POLICY "Users can update relevant tasks" 
ON public.tasks 
FOR UPDATE 
TO authenticated
USING (
  -- Can update if you're admin/owner/manager/verkoper
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'verkoper') OR
  -- Or if the task is assigned to you (so you can mark it complete)
  assigned_to = auth.uid() OR
  -- Or if you created the task
  assigned_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'verkoper') OR
  assigned_to = auth.uid() OR
  assigned_by = auth.uid()
);