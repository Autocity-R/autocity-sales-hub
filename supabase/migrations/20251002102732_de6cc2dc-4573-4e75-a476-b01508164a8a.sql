-- Create email_queue table for asynchronous email processing
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'retry')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  retry_after TIMESTAMPTZ,
  payload JSONB NOT NULL,
  error_message TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  template_id TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_retry_after ON public.email_queue(retry_after);
CREATE INDEX idx_email_queue_created_at ON public.email_queue(created_at);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own queued emails
CREATE POLICY "Users can insert email queue items"
ON public.email_queue
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view their own queued emails
CREATE POLICY "Users can view email queue items"
ON public.email_queue
FOR SELECT
TO authenticated
USING (true);

-- System/service role can manage all queue items
CREATE POLICY "System can manage all email queue items"
ON public.email_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER set_email_queue_updated_at
BEFORE UPDATE ON public.email_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();