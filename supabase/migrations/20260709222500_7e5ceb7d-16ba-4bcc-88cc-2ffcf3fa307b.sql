-- Fase 5: Google Calendar per vestiging
-- Zorg dat bestaande Rotterdam-rij expliciet branch='rotterdam' heeft (geen no-op als al gezet)
UPDATE public.company_calendar_settings
   SET branch = 'rotterdam'
 WHERE company_id = 'auto-city'
   AND (branch IS NULL OR branch = '');

-- Unieke koppeling per (company_id, branch) zodat we per vestiging één config hebben
CREATE UNIQUE INDEX IF NOT EXISTS company_calendar_settings_company_branch_key
  ON public.company_calendar_settings (company_id, branch);

-- Placeholder-rij voor Heerhugowaard (nog niet geconfigureerd).
-- Geen tokens / geen service account / sync uit — vult zich later bij setup-flow.
INSERT INTO public.company_calendar_settings (
  company_id, branch, sync_enabled, auto_sync, sync_direction, conflict_resolution
)
SELECT 'auto-city', 'heerhugowaard', false, false, 'bidirectional', 'newest_wins'
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_calendar_settings
   WHERE company_id = 'auto-city' AND branch = 'heerhugowaard'
);