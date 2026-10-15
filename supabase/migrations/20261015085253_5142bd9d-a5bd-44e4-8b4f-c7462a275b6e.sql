CREATE TABLE public.website_reservering_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  betaling_id text,
  resultaat text NOT NULL,
  http_status integer NOT NULL,
  vehicle_id uuid,
  contact_id uuid,
  fout text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX website_reservering_log_ok_uniek
  ON public.website_reservering_log (betaling_id) WHERE resultaat = 'ok';
CREATE INDEX website_reservering_log_betaling_idx ON public.website_reservering_log (betaling_id);

GRANT SELECT ON public.website_reservering_log TO authenticated;
GRANT ALL ON public.website_reservering_log TO service_role;
ALTER TABLE public.website_reservering_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Beheer leest website-reserveringen" ON public.website_reservering_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'owner') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

INSERT INTO public.system_config (key, value)
VALUES ('website_reservering_verkoper_email', 'hendrik@auto-city.nl')
ON CONFLICT (key) DO NOTHING;