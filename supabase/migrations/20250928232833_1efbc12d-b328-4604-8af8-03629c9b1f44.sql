-- Update the get_vehicles_needing_reminders function to check if papers are received
-- and ensure CMR documents are sent to supplier instead of customer for papers reminders

CREATE OR REPLACE FUNCTION public.get_vehicles_needing_reminders()
 RETURNS TABLE(vehicle_id uuid, reminder_type text, email_type text, recipient_email text, days_since_last_email integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH vehicle_settings AS (
    SELECT 
      v.id,
      v.email_reminder_settings,
      v.status as sales_status,
      v.created_at,
      -- Get papers received status from details JSONB
      (v.details->>'papersReceived')::boolean as papers_received,
      -- Get customer email from customer details or vehicle details
      COALESCE(
        (v.details->>'customerEmail'),
        c.email
      ) as customer_email,
      -- Get supplier email for CMR reminders
      COALESCE(
        s.email,
        (s.additional_emails->0)::text  -- Get first additional email if no primary email
      ) as supplier_email,
      s.additional_emails as supplier_additional_emails
    FROM vehicles v
    LEFT JOIN contacts c ON c.id::text = v.customer_id
    LEFT JOIN contacts s ON s.id::text = v.supplier_id
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
      WHEN vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') 
           AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
           AND (vs.papers_received IS NULL OR vs.papers_received = false)  -- Only if papers NOT received
        THEN 'papers_reminder'
      ELSE NULL
    END as reminder_type,
    CASE 
      WHEN vs.sales_status = 'verkocht_b2c' THEN 'payment_reminder'
      ELSE 'papers_reminder'
    END as email_type,
    -- Use supplier email for papers reminders, customer email for payment reminders
    CASE 
      WHEN vs.sales_status = 'verkocht_b2c' AND (vs.email_reminder_settings->>'payment_reminder_enabled')::boolean = true 
        THEN vs.customer_email
      WHEN vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') 
           AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
           AND (vs.papers_received IS NULL OR vs.papers_received = false)
        THEN vs.supplier_email
      ELSE NULL
    END as recipient_email,
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
      WHEN vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') 
           AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
           AND (vs.papers_received IS NULL OR vs.papers_received = false)
        THEN 'papers_reminder'
      ELSE NULL
    END
  WHERE 
    -- For payment reminders: need customer email
    (vs.sales_status = 'verkocht_b2c' 
     AND (vs.email_reminder_settings->>'payment_reminder_enabled')::boolean = true
     AND vs.customer_email IS NOT NULL)
    OR 
    -- For papers reminders: need supplier email AND papers not received
    (vs.sales_status IN ('verkocht_b2b', 'verkocht_b2c') 
     AND (vs.email_reminder_settings->>'papers_reminder_enabled')::boolean = true 
     AND (vs.papers_received IS NULL OR vs.papers_received = false)
     AND vs.supplier_email IS NOT NULL)
  AND (
    lr.last_sent_at IS NULL 
    OR lr.last_sent_at < NOW() - INTERVAL '7 days'
  )
  AND (
    vs.created_at < NOW() - INTERVAL '7 days'
    OR lr.last_sent_at < NOW() - INTERVAL '7 days'
  );
END;
$function$;

-- Add supplier_id column to vehicles table if it doesn't exist
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS supplier_id uuid;

-- Add additional_emails column to contacts table if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS additional_emails jsonb DEFAULT '[]'::jsonb;