-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create sales_targets table for B2C targets tracking
CREATE TABLE public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('b2c_units', 'b2c_revenue', 'b2c_margin_percent', 'upsales_revenue')),
  target_period TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  salesperson_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(target_type, target_period, salesperson_id)
);

-- Create indexes
CREATE INDEX idx_sales_targets_period ON public.sales_targets(target_period);
CREATE INDEX idx_sales_targets_type_period ON public.sales_targets(target_type, target_period);

-- Enable RLS
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers and admins can view targets" 
ON public.sales_targets FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'manager')
  )
);

CREATE POLICY "Only admins can insert targets" 
ON public.sales_targets FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Only admins can update targets" 
ON public.sales_targets FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Only admins can delete targets" 
ON public.sales_targets FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default team targets for current month
INSERT INTO public.sales_targets (target_type, target_period, target_value, notes)
VALUES 
  ('b2c_units', to_char(now(), 'YYYY-MM'), 40, 'Default team target: 40 B2C verkopen per maand'),
  ('b2c_revenue', to_char(now(), 'YYYY-MM'), 120000, 'Default team target: €120.000 marge per maand'),
  ('b2c_margin_percent', to_char(now(), 'YYYY-MM'), 15, 'Default team target: 15% marge percentage');

-- Trigger to automatically set online_since_date
CREATE OR REPLACE FUNCTION public.set_online_since_date()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.details->>'showroomOnline')::boolean = true 
     AND (OLD.details->>'showroomOnline')::boolean IS DISTINCT FROM true
     AND NEW.online_since_date IS NULL THEN
    NEW.online_since_date := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_vehicle_online_since_date ON public.vehicles;
CREATE TRIGGER set_vehicle_online_since_date
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_online_since_date();