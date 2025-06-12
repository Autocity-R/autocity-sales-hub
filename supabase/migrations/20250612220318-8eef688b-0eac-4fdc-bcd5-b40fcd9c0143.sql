
-- Add auth_type column to company_calendar_settings table
ALTER TABLE public.company_calendar_settings 
ADD COLUMN auth_type text DEFAULT 'oauth';

-- Add service_account_email column for storing service account info
ALTER TABLE public.company_calendar_settings 
ADD COLUMN service_account_email text;
