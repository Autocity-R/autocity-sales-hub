-- Add is_car_dealer field to contacts table to distinguish car dealerships from regular business customers
ALTER TABLE public.contacts 
ADD COLUMN is_car_dealer boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.contacts.is_car_dealer IS 'True if the contact is a car dealership (B2B), false for regular business customers (B2C)';