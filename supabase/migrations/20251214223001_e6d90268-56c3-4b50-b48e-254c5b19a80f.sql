-- Add new columns to taxatie_feedback for enhanced reasoning-based learning
ALTER TABLE public.taxatie_feedback 
ADD COLUMN IF NOT EXISTS referenced_listing_id TEXT,
ADD COLUMN IF NOT EXISTS user_reasoning TEXT,
ADD COLUMN IF NOT EXISTS user_suggested_price NUMERIC,
ADD COLUMN IF NOT EXISTS correction_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.taxatie_feedback.referenced_listing_id IS 'ID or URL of the listing the feedback references';
COMMENT ON COLUMN public.taxatie_feedback.user_reasoning IS 'Detailed explanation of the user reasoning behind the feedback';
COMMENT ON COLUMN public.taxatie_feedback.user_suggested_price IS 'User suggested price if they disagree with AI';
COMMENT ON COLUMN public.taxatie_feedback.correction_type IS 'Type of correction: km, uitvoering, markt, listing, etc.';