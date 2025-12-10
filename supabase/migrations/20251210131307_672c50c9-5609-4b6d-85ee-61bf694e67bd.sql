-- Add sort_order column to tasks table for drag & drop ordering
ALTER TABLE public.tasks 
ADD COLUMN sort_order integer DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX idx_tasks_sort_order ON public.tasks(assigned_to, sort_order);

-- Initialize sort_order based on priority and due_date for existing tasks
UPDATE public.tasks 
SET sort_order = subquery.row_num
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY assigned_to 
           ORDER BY 
             CASE priority 
               WHEN 'urgent' THEN 1 
               WHEN 'hoog' THEN 2 
               WHEN 'normaal' THEN 3 
               WHEN 'laag' THEN 4 
               ELSE 5 
             END,
             due_date ASC
         ) as row_num
  FROM public.tasks
  WHERE status NOT IN ('voltooid', 'geannuleerd')
) as subquery
WHERE tasks.id = subquery.id;