-- Create email_logs table for tracking all sent emails
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id),
  template_id TEXT,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  cc_emails TEXT[],
  subject TEXT NOT NULL,
  attachment_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  gmail_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_email_logs_vehicle ON email_logs(vehicle_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template_id);

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all email logs
CREATE POLICY "Users can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: System can insert email logs
CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);