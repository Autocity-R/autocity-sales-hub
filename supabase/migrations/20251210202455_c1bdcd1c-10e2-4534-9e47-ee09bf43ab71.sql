-- Create taxatie_valuations table to store all valuations
CREATE TABLE public.taxatie_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  license_plate TEXT,
  vehicle_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  portal_analysis JSONB DEFAULT '{}'::jsonb,
  jpcars_data JSONB DEFAULT '{}'::jsonb,
  internal_comparison JSONB DEFAULT '{}'::jsonb,
  ai_advice JSONB DEFAULT '{}'::jsonb,
  ai_model_version TEXT DEFAULT 'gpt-4o',
  status TEXT NOT NULL DEFAULT 'voltooid'
);

-- Create taxatie_feedback table to store feedback on valuations
CREATE TABLE public.taxatie_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation_id UUID REFERENCES public.taxatie_valuations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL,
  rating INTEGER,
  notes TEXT,
  actual_outcome JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.taxatie_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxatie_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for taxatie_valuations
CREATE POLICY "Authorized users can create valuations"
ON public.taxatie_valuations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "Authorized users can view valuations"
ON public.taxatie_valuations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "Users can update their own valuations"
ON public.taxatie_valuations
FOR UPDATE
USING (
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Only admins can delete valuations"
ON public.taxatie_valuations
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies for taxatie_feedback
CREATE POLICY "Authorized users can create feedback"
ON public.taxatie_feedback
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "Authorized users can view feedback"
ON public.taxatie_feedback
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "Users can update their own feedback"
ON public.taxatie_feedback
FOR UPDATE
USING (
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  created_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

-- Create indexes for performance
CREATE INDEX idx_taxatie_valuations_created_by ON public.taxatie_valuations(created_by);
CREATE INDEX idx_taxatie_valuations_license_plate ON public.taxatie_valuations(license_plate);
CREATE INDEX idx_taxatie_valuations_created_at ON public.taxatie_valuations(created_at DESC);
CREATE INDEX idx_taxatie_feedback_valuation_id ON public.taxatie_feedback(valuation_id);
CREATE INDEX idx_taxatie_feedback_feedback_type ON public.taxatie_feedback(feedback_type);