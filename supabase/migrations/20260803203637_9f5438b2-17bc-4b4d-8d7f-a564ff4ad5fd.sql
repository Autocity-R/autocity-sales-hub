ALTER TABLE public.parts_orders ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.parts_orders ADD COLUMN IF NOT EXISTS manual_brand text;
ALTER TABLE public.parts_orders ADD COLUMN IF NOT EXISTS manual_model text;
ALTER TABLE public.parts_orders ADD COLUMN IF NOT EXISTS manual_license text;