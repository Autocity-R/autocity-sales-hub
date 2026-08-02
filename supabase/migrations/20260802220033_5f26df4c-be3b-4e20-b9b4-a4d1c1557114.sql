CREATE TABLE public.werkplaats_tarieven (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uurtarief_ex_btw numeric NOT NULL DEFAULT 85.00,
  klein_materiaal_enabled boolean NOT NULL DEFAULT true,
  klein_materiaal_pct numeric NOT NULL DEFAULT 3.00,
  milieukosten_enabled boolean NOT NULL DEFAULT true,
  milieukosten_bedrag numeric NOT NULL DEFAULT 7.50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.werkplaats_tarieven TO authenticated;
GRANT INSERT, UPDATE ON public.werkplaats_tarieven TO authenticated;
GRANT ALL ON public.werkplaats_tarieven TO service_role;

ALTER TABLE public.werkplaats_tarieven ENABLE ROW LEVEL SECURITY;

CREATE POLICY "werkplaats_tarieven_select" ON public.werkplaats_tarieven
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "werkplaats_tarieven_insert" ON public.werkplaats_tarieven
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin_or_owner() OR public.has_role(auth.uid(), 'aftersales_manager')
  );

CREATE POLICY "werkplaats_tarieven_update" ON public.werkplaats_tarieven
  FOR UPDATE TO authenticated USING (
    public.is_admin_or_owner() OR public.has_role(auth.uid(), 'aftersales_manager')
  ) WITH CHECK (
    public.is_admin_or_owner() OR public.has_role(auth.uid(), 'aftersales_manager')
  );

CREATE TRIGGER trg_werkplaats_tarieven_updated_at
  BEFORE UPDATE ON public.werkplaats_tarieven
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.werkplaats_tarieven (uurtarief_ex_btw) VALUES (85.00);

ALTER TABLE public.workshop_invoices
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.workshop_invoices SET payment_status = 'nvt' WHERE invoice_kind = 'intern';