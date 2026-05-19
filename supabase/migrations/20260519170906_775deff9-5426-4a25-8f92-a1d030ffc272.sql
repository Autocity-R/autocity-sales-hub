update public.intake_inspections
   set status = 'failed',
       error_message = coalesce(error_message, 'Analyse timeout — opnieuw proberen')
 where status in ('analyzing', 'generating_pdf', 'extracting', 'pending')
   and created_at < now() - interval '20 minutes';