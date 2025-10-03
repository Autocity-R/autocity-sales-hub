-- Create email_threads table to track email conversations
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE, -- Gmail thread ID
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  subject TEXT,
  participants JSONB DEFAULT '[]'::jsonb, -- Array of email addresses in thread
  first_message_date TIMESTAMP WITH TIME ZONE,
  last_message_date TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_messages table to store individual emails
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL UNIQUE, -- Gmail message ID
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_from_customer BOOLEAN DEFAULT true,
  portal_source TEXT, -- autotrack, marktplaats, autoscout24, etc.
  parsed_data JSONB DEFAULT '{}'::jsonb, -- Store parsed lead data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_threads_lead_id ON public.email_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON public.email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON public.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead_id ON public.email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON public.email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON public.email_messages(received_at DESC);

-- Enable RLS
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_threads
CREATE POLICY "Users can view all email threads"
  ON public.email_threads FOR SELECT
  USING (true);

CREATE POLICY "System can manage email threads"
  ON public.email_threads FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for email_messages
CREATE POLICY "Users can view all email messages"
  ON public.email_messages FOR SELECT
  USING (true);

CREATE POLICY "System can manage email messages"
  ON public.email_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update email_threads.updated_at
CREATE OR REPLACE FUNCTION update_email_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_threads_updated_at_trigger
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_email_threads_updated_at();