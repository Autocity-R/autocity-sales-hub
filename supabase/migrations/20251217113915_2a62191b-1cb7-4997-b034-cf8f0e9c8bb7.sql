-- Remove hardcoded default of 0 for sort_order
ALTER TABLE tasks ALTER COLUMN sort_order DROP DEFAULT;

-- Create function to automatically set sort_order for new tasks
CREATE OR REPLACE FUNCTION public.set_task_sort_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only set sort_order if it's NULL or 0 (meaning no explicit value was provided)
  IF NEW.sort_order IS NULL OR NEW.sort_order = 0 THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order FROM tasks;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert
CREATE TRIGGER task_sort_order_trigger
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_task_sort_order();