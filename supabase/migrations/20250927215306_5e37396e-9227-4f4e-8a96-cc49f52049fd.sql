-- Create tasks table with proper foreign keys and security
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  assigned_to uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_brand text,
  vehicle_model text,
  vehicle_license_number text,
  due_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'toegewezen'
    CHECK (status IN ('toegewezen', 'in_uitvoering', 'voltooid', 'uitgesteld', 'geannuleerd')),
  priority text NOT NULL DEFAULT 'normaal'
    CHECK (priority IN ('laag', 'normaal', 'hoog', 'urgent')),
  category text NOT NULL DEFAULT 'overig'
    CHECK (category IN ('voorbereiding', 'transport', 'inspectie', 'schoonmaak', 'reparatie', 'administratie', 'aflevering', 'ophalen', 'overig')),
  location text,
  estimated_duration integer, -- in minutes
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create task history table for audit trail
CREATE TABLE public.task_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  old_assignee uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  new_assignee uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role IN ('admin', 'owner')
  );
$$;

-- Create security definer function to check if user can manage specific task
CREATE OR REPLACE FUNCTION public.can_manage_task(user_id uuid, task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_id
      AND (
        t.assigned_to = user_id OR 
        t.assigned_by = user_id OR
        public.is_admin_user(user_id)
      )
  );
$$;

-- RLS Policies for tasks table
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.tasks
FOR SELECT
USING (
  assigned_to = auth.uid() OR 
  assigned_by = auth.uid() OR 
  public.is_admin_user(auth.uid())
);

CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  assigned_by = auth.uid() OR 
  public.is_admin_user(auth.uid())
);

CREATE POLICY "Users can update tasks they can manage"
ON public.tasks
FOR UPDATE
USING (public.can_manage_task(auth.uid(), id))
WITH CHECK (public.can_manage_task(auth.uid(), id));

CREATE POLICY "Admins can delete tasks"
ON public.tasks
FOR DELETE
USING (public.is_admin_user(auth.uid()));

-- RLS Policies for task_history table  
CREATE POLICY "Users can view task history for tasks they can access"
ON public.task_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_id 
      AND (
        t.assigned_to = auth.uid() OR 
        t.assigned_by = auth.uid() OR 
        public.is_admin_user(auth.uid())
      )
  )
);

CREATE POLICY "System can insert task history"
ON public.task_history
FOR INSERT
WITH CHECK (true);

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to log task changes
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_history (
      task_id, 
      changed_by, 
      old_status, 
      new_status, 
      change_reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.status = 'voltooid' THEN 'Taak afgerond'
        WHEN NEW.status = 'in_uitvoering' THEN 'Taak gestart'
        WHEN NEW.status = 'uitgesteld' THEN 'Taak uitgesteld'
        WHEN NEW.status = 'geannuleerd' THEN 'Taak geannuleerd'
        ELSE 'Status gewijzigd'
      END
    );
  END IF;

  -- Log assignee changes
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.task_history (
      task_id,
      changed_by,
      old_assignee,
      new_assignee,
      change_reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.assigned_to,
      NEW.assigned_to,
      'Taak opnieuw toegewezen'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_updated_at();

CREATE TRIGGER log_task_changes_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();

-- Create indexes for better performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON public.tasks(assigned_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);

-- Enable realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;