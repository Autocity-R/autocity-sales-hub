-- Add details JSONB column to vehicles table to store all extra vehicle information
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add notes column for better searchability (optional but useful)
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the existing import_updated_at trigger to also update when details change
CREATE OR REPLACE FUNCTION public.update_vehicle_import_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update import_updated_at when import_status or details change
  IF (OLD.import_status IS DISTINCT FROM NEW.import_status) OR 
     (OLD.details IS DISTINCT FROM NEW.details) THEN
    NEW.import_updated_at = now();
  END IF;
  
  -- Always update updated_at
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_vehicle_timestamps ON public.vehicles;
CREATE TRIGGER update_vehicle_timestamps
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_import_timestamp();