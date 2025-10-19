-- Add purchase tracking columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS purchased_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS purchased_by_name text,
ADD COLUMN IF NOT EXISTS purchase_date timestamp with time zone DEFAULT now();

-- Create index for better query performance on purchase reports
CREATE INDEX IF NOT EXISTS idx_vehicles_purchased_by ON public.vehicles(purchased_by_user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_purchase_date ON public.vehicles(purchase_date);

-- Create vehicle purchase audit log table for complete tracking
CREATE TABLE IF NOT EXISTS public.vehicle_purchase_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  purchased_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchase_price numeric,
  purchase_timestamp timestamp with time zone DEFAULT now(),
  change_metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on purchase audit log
ALTER TABLE public.vehicle_purchase_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase audit log
CREATE POLICY "Authenticated users can view purchase audit logs"
ON public.vehicle_purchase_audit_log FOR SELECT
USING (true);

CREATE POLICY "System can insert purchase audit logs"
ON public.vehicle_purchase_audit_log FOR INSERT
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON COLUMN public.vehicles.purchased_by_user_id IS 'User ID of the person who purchased/added this vehicle to inventory';
COMMENT ON COLUMN public.vehicles.purchased_by_name IS 'Name of purchaser for quick display (denormalized for performance)';
COMMENT ON COLUMN public.vehicles.purchase_date IS 'Date when vehicle was purchased/added to system';
COMMENT ON TABLE public.vehicle_purchase_audit_log IS 'Audit trail for all vehicle purchase transactions';