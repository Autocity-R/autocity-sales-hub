-- Temporarily disable the validation trigger
DROP TRIGGER IF EXISTS validate_sold_vehicle_pricing_trigger ON public.vehicles;

-- Add purchase_price column to vehicles table for proper financial tracking
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;

-- Create index for reporting performance
CREATE INDEX IF NOT EXISTS idx_vehicles_purchase_price 
ON public.vehicles(purchase_price);

-- Migrate existing purchasePrice data from details JSON to new column
UPDATE public.vehicles
SET purchase_price = CAST(details->>'purchasePrice' AS NUMERIC)
WHERE details->>'purchasePrice' IS NOT NULL 
  AND details->>'purchasePrice' != '0'
  AND details->>'purchasePrice' != '';

-- Set default to 0 for null values to ensure data integrity
UPDATE public.vehicles
SET purchase_price = 0
WHERE purchase_price IS NULL;

-- Update the validation function to check both purchase_price column AND details
CREATE OR REPLACE FUNCTION public.validate_sold_vehicle_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that sold vehicles have required pricing
  IF NEW.status IN ('verkocht_b2b', 'verkocht_b2c', 'afgeleverd') THEN
    IF NEW.selling_price IS NULL OR NEW.selling_price <= 0 THEN
      RAISE EXCEPTION 'Sold vehicles must have a valid selling_price greater than 0';
    END IF;
    
    -- Check purchase_price column first, fallback to details JSONB
    IF (NEW.purchase_price IS NULL OR NEW.purchase_price <= 0) AND 
       (NEW.details->>'purchasePrice' IS NULL OR (NEW.details->>'purchasePrice')::NUMERIC <= 0) THEN
      RAISE EXCEPTION 'Sold vehicles must have a valid purchase_price greater than 0';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Re-enable the validation trigger
CREATE TRIGGER validate_sold_vehicle_pricing_trigger
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.validate_sold_vehicle_pricing();