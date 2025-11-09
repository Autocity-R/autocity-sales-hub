-- Add missing columns to vehicle_files for contract storage
ALTER TABLE public.vehicle_files
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Optional: ensure updated_at exists and auto-update if table has that column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'vehicle_files' AND column_name = 'updated_at'
  ) THEN
    -- Create trigger if not exists to keep updated_at fresh using existing function
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trg_update_vehicle_files_updated_at'
    ) THEN
      CREATE TRIGGER trg_update_vehicle_files_updated_at
      BEFORE UPDATE ON public.vehicle_files
      FOR EACH ROW
      EXECUTE FUNCTION public.update_vehicle_files_updated_at();
    END IF;
  END IF;
END $$;