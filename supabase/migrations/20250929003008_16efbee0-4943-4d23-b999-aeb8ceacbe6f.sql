-- Add sales tracking columns to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold_date timestamp with time zone;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sold_by_user_id uuid;

-- Update weekly_sales table to include sale date
ALTER TABLE weekly_sales ADD COLUMN IF NOT EXISTS sale_date timestamp with time zone DEFAULT now();