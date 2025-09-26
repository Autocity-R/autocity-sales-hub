-- Add email reminder settings to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS email_reminder_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add email logs table to track sent reminders
CREATE TABLE IF NOT EXISTS public.email_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Index for finding vehicles that need reminders
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('payment_reminder', 'papers_reminder')),
  CONSTRAINT valid_status CHECK (status IN ('sent', 'failed', 'scheduled'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_reminders_vehicle_id ON public.email_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_next_reminder ON public.email_reminders(next_reminder_at) WHERE next_reminder_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_reminders_type_status ON public.email_reminders(reminder_type, status);

-- RLS policies for email_reminders
ALTER TABLE public.email_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to email_reminders" 
ON public.email_reminders 
FOR ALL 
USING (true);

-- Function to get vehicles needing reminders
CREATE OR REPLACE FUNCTION public.get_vehicles_needing_reminders()
RETURNS TABLE (
  vehicle_id UUID,
  reminder_type TEXT,
  email_type TEXT,
  recipient_email TEXT,
  days_since_last_email INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vehicle_settings AS (
    SELECT 
      v.id,
      v.email_reminder_settings,
      v.status as sales_status,
      v.created_at,
      -- Get customer email from customer details or vehicle details
      COALESCE(
        (v.details->>'customerEmail'),
        c.email
      ) as customer_email
    FROM vehicles v
    LEFT JOIN contacts c ON c.id::text = v.customer_id
    WHERE v.email_reminder_settings IS NOT NULL
  ),
  last_reminders AS (
    SELECT 
      er.vehicle_id,
      er.reminder_type,
      MAX(er.sent_at) as last_sent_at
    FROM email_reminders er
    GROUP BY er.vehicle_id, er.reminder_type
  )
  SELECT 
    vs.id as vehicle_id,
    CASE 
      WHEN vs.sales_status = 'verkocht_b2c' AND (vs.email_reminder_settings->>'payment_reminder_enabled')::boolean = true 
        THEN 'payment_reminder'
      WHEN vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
        THEN 'papers_reminder'
      ELSE NULL
    END as reminder_type,
    CASE 
      WHEN vs.sales_status = 'verkocht_b2c' THEN 'payment_reminder'
      ELSE 'reminder_papers'
    END as email_type,
    vs.customer_email as recipient_email,
    CASE 
      WHEN lr.last_sent_at IS NOT NULL 
        THEN EXTRACT(DAYS FROM (NOW() - lr.last_sent_at))::INTEGER
      ELSE EXTRACT(DAYS FROM (NOW() - vs.created_at))::INTEGER
    END as days_since_last_email
  FROM vehicle_settings vs
  LEFT JOIN last_reminders lr ON lr.vehicle_id = vs.id 
    AND lr.reminder_type = CASE 
      WHEN vs.sales_status = 'verkocht_b2c' AND (vs.email_reminder_settings->>'payment_reminder_enabled')::boolean = true 
        THEN 'payment_reminder'
      WHEN vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
        THEN 'papers_reminder'
      ELSE NULL
    END
  WHERE 
    vs.customer_email IS NOT NULL
    AND (
      (vs.sales_status = 'verkocht_b2c' AND (vs.email_reminder_settings->>'payment_reminder_enabled')::boolean = true)
      OR 
      (vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true)
    )
    AND (
      lr.last_sent_at IS NULL 
      OR lr.last_sent_at < NOW() - INTERVAL '7 days'
    )
    AND (
      vs.created_at < NOW() - INTERVAL '7 days'
      OR lr.last_sent_at < NOW() - INTERVAL '7 days'
    );
END;
$$;