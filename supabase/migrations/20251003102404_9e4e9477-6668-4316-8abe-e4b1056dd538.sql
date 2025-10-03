-- Add house number and postal code fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_postal_code text;

-- Add comment to explain the address fields
COMMENT ON COLUMN public.contacts.address_street IS 'Street name only (e.g., "Thurledeweg")';
COMMENT ON COLUMN public.contacts.address_number IS 'House number with optional suffix (e.g., "61a")';
COMMENT ON COLUMN public.contacts.address_postal_code IS 'Postal code (e.g., "3044ER")';
COMMENT ON COLUMN public.contacts.address_city IS 'City name (e.g., "Rotterdam")';