-- Ensure related references don't block vehicle deletion
BEGIN;

-- email_logs.vehicle_id -> vehicles.id should not block deletes
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_vehicle_id_fkey;
ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- loan_cars.vehicle_id -> vehicles.id should not block deletes
ALTER TABLE public.loan_cars DROP CONSTRAINT IF EXISTS loan_cars_vehicle_id_fkey;
ALTER TABLE public.loan_cars
  ADD CONSTRAINT loan_cars_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

COMMIT;