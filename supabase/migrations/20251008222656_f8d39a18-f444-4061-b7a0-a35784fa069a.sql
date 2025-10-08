BEGIN;
-- Allow deleting vehicles even when referenced by warranty_claims (keep claims, detach vehicle)
ALTER TABLE public.warranty_claims DROP CONSTRAINT IF EXISTS warranty_claims_vehicle_id_fkey;
ALTER TABLE public.warranty_claims
  ADD CONSTRAINT warranty_claims_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Ensure import logs do not block deletion (remove logs with vehicle)
ALTER TABLE public.vehicle_import_logs DROP CONSTRAINT IF EXISTS vehicle_import_logs_vehicle_id_fkey;
ALTER TABLE public.vehicle_import_logs
  ADD CONSTRAINT vehicle_import_logs_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
COMMIT;