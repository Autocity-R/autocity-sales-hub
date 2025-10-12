-- Phase 5: Data Integrity Protection

-- Step 5.1: Create audit log table for vehicle price changes
CREATE TABLE IF NOT EXISTS public.vehicle_price_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_purchase_price NUMERIC,
  new_purchase_price NUMERIC,
  old_selling_price NUMERIC,
  new_selling_price NUMERIC,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_source TEXT DEFAULT 'manual'
);

-- Enable RLS on audit log
ALTER TABLE public.vehicle_price_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Authenticated users can view price audit logs"
  ON public.vehicle_price_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert price audit logs"
  ON public.vehicle_price_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_vehicle_price_audit_vehicle_id ON public.vehicle_price_audit_log(vehicle_id);
CREATE INDEX idx_vehicle_price_audit_changed_at ON public.vehicle_price_audit_log(changed_at);

-- Step 5.1: Create trigger function to validate sold vehicle pricing
CREATE OR REPLACE FUNCTION public.validate_sold_vehicle_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that sold vehicles have required pricing
  IF NEW.status IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd') THEN
    IF NEW.selling_price IS NULL OR NEW.selling_price <= 0 THEN
      RAISE EXCEPTION 'Sold vehicles must have a valid selling_price greater than 0';
    END IF;
    
    -- Check purchase price in details JSONB
    IF NEW.details->>'purchasePrice' IS NULL OR (NEW.details->>'purchasePrice')::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Sold vehicles must have a valid purchasePrice greater than 0 in details';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sold vehicle validation
DROP TRIGGER IF EXISTS validate_sold_vehicle_pricing_trigger ON public.vehicles;
CREATE TRIGGER validate_sold_vehicle_pricing_trigger
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sold_vehicle_pricing();

-- Step 5.2: Create trigger function to log price changes
CREATE OR REPLACE FUNCTION public.log_vehicle_price_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_purchase NUMERIC;
  new_purchase NUMERIC;
BEGIN
  -- Extract purchase prices from JSONB details
  old_purchase := (OLD.details->>'purchasePrice')::NUMERIC;
  new_purchase := (NEW.details->>'purchasePrice')::NUMERIC;
  
  -- Log if any prices changed
  IF (OLD.selling_price IS DISTINCT FROM NEW.selling_price) OR 
     (old_purchase IS DISTINCT FROM new_purchase) THEN
    
    INSERT INTO public.vehicle_price_audit_log (
      vehicle_id,
      changed_by,
      old_purchase_price,
      new_purchase_price,
      old_selling_price,
      new_selling_price,
      change_reason,
      change_source
    ) VALUES (
      NEW.id,
      auth.uid(),
      old_purchase,
      new_purchase,
      OLD.selling_price,
      NEW.selling_price,
      CASE 
        WHEN OLD.status != NEW.status THEN 'Status change: ' || OLD.status || ' -> ' || NEW.status
        ELSE 'Price update'
      END,
      'trigger'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for price change logging
DROP TRIGGER IF EXISTS log_vehicle_price_changes_trigger ON public.vehicles;
CREATE TRIGGER log_vehicle_price_changes_trigger
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_vehicle_price_changes();

-- Step 5.2: Create enhanced vehicle status audit table
CREATE TABLE IF NOT EXISTS public.vehicle_status_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  old_location TEXT,
  new_location TEXT,
  change_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on status audit log
ALTER TABLE public.vehicle_status_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for status audit log
CREATE POLICY "Authenticated users can view status audit logs"
  ON public.vehicle_status_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert status audit logs"
  ON public.vehicle_status_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_vehicle_status_audit_vehicle_id ON public.vehicle_status_audit_log(vehicle_id);
CREATE INDEX idx_vehicle_status_audit_timestamp ON public.vehicle_status_audit_log(change_timestamp);

-- Update existing log_vehicle_status_change function to also log to audit table
CREATE OR REPLACE FUNCTION public.log_vehicle_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.location IS DISTINCT FROM NEW.location THEN
    -- Log to console (existing behavior)
    RAISE NOTICE 'Vehicle % status changed from % to %, location from % to %', 
      NEW.id, OLD.status, NEW.status, OLD.location, NEW.location;
    
    -- Log to audit table (new behavior)
    INSERT INTO public.vehicle_status_audit_log (
      vehicle_id,
      changed_by,
      old_status,
      new_status,
      old_location,
      new_location,
      change_metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.status,
      NEW.status,
      OLD.location,
      NEW.location,
      jsonb_build_object(
        'old_selling_price', OLD.selling_price,
        'new_selling_price', NEW.selling_price,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;