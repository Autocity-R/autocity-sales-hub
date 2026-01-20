-- Add columns to link tasks to checklist items
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS linked_checklist_item_id text,
ADD COLUMN IF NOT EXISTS linked_vehicle_id uuid REFERENCES public.vehicles(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_linked_checklist ON public.tasks(linked_checklist_item_id, linked_vehicle_id) 
WHERE linked_checklist_item_id IS NOT NULL;