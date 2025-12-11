-- Create table for permanent damage repair records
CREATE TABLE public.damage_repair_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,                                    -- Reference to original task (can be NULL after delete)
  vehicle_id UUID,                                 -- Vehicle reference
  vehicle_brand TEXT NOT NULL,                     -- Snapshot of brand
  vehicle_model TEXT NOT NULL,                     -- Snapshot of model
  vehicle_vin TEXT,                                -- Chassis number
  vehicle_license_number TEXT,                     -- License plate
  repaired_parts JSONB NOT NULL DEFAULT '[]',      -- Array: ["Voorbumper", "Portier"]
  part_count INTEGER NOT NULL DEFAULT 0,           -- Number of parts
  repair_cost NUMERIC NOT NULL DEFAULT 0,          -- €300 × part_count
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- When completed
  employee_id UUID,                                -- Who did it
  employee_name TEXT,                              -- Snapshot of name
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.damage_repair_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authorized users can view damage repair records"
ON public.damage_repair_records
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "System can insert damage repair records"
ON public.damage_repair_records
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can delete damage repair records"
ON public.damage_repair_records
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

-- Create index for faster period queries
CREATE INDEX idx_damage_repair_records_completed_at ON public.damage_repair_records(completed_at DESC);
CREATE INDEX idx_damage_repair_records_employee_id ON public.damage_repair_records(employee_id);
CREATE INDEX idx_damage_repair_records_task_id ON public.damage_repair_records(task_id);