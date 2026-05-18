ALTER TABLE public.intake_inspections REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.intake_inspections;