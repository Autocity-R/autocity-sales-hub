CREATE TABLE public.werkplaats_calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch text NOT NULL UNIQUE DEFAULT 'rotterdam',
  calendar_id text,
  calendar_name text,
  sync_enabled boolean NOT NULL DEFAULT false,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  managed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.werkplaats_calendar_settings TO authenticated;
GRANT ALL ON public.werkplaats_calendar_settings TO service_role;

ALTER TABLE public.werkplaats_calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "werkplaats_calendar_settings_read"
ON public.werkplaats_calendar_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'aftersales_manager')
  OR public.has_role(auth.uid(), 'werkplaats_chef')
  OR public.has_role(auth.uid(), 'monteur')
  OR public.has_role(auth.uid(), 'spuiter')
  OR public.has_role(auth.uid(), 'uitdeuker_extern')
  OR public.has_role(auth.uid(), 'operationeel_directeur')
  OR public.has_role(auth.uid(), 'manager')
  OR public.is_admin_user(auth.uid())
);

CREATE POLICY "werkplaats_calendar_settings_write"
ON public.werkplaats_calendar_settings
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'aftersales_manager')
  OR public.has_role(auth.uid(), 'werkplaats_chef')
  OR public.is_admin_user(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'aftersales_manager')
  OR public.has_role(auth.uid(), 'werkplaats_chef')
  OR public.is_admin_user(auth.uid())
);

CREATE TRIGGER trg_werkplaats_calendar_settings_updated_at
BEFORE UPDATE ON public.werkplaats_calendar_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.werkplaats_calendar_settings (branch, calendar_id, sync_enabled)
VALUES ('rotterdam', 'werkplaats@auto-city.nl', false)
ON CONFLICT (branch) DO NOTHING;