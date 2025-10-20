-- Create email_sent_log table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_sent_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view email logs"
  ON public.email_sent_log
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert email logs"
  ON public.email_sent_log
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'owner'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'verkoper'::app_role)
  );

-- Create index for faster queries
CREATE INDEX idx_email_sent_log_vehicle_id ON public.email_sent_log(vehicle_id);
CREATE INDEX idx_email_sent_log_sent_at ON public.email_sent_log(sent_at DESC);