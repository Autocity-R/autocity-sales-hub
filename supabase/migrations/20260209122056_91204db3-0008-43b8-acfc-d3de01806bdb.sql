
CREATE TABLE public.checklist_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for fast token lookups
CREATE INDEX idx_checklist_tokens_token ON public.checklist_access_tokens(token);
CREATE INDEX idx_checklist_tokens_vehicle ON public.checklist_access_tokens(vehicle_id);

-- Enable RLS
ALTER TABLE public.checklist_access_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read tokens (needed for mobile checklist page)
CREATE POLICY "Public can validate tokens"
  ON public.checklist_access_tokens FOR SELECT USING (true);

-- Authenticated users can create tokens
CREATE POLICY "Authenticated users can create tokens"
  ON public.checklist_access_tokens FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
