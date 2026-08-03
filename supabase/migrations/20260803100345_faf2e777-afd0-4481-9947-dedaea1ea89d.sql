ALTER TABLE public.parts_orders
  ADD COLUMN IF NOT EXISTS aantal integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS inkoopprijs_per_stuk numeric,
  ADD COLUMN IF NOT EXISTS leverancier text,
  ADD COLUMN IF NOT EXISTS doorbelast_invoice_id uuid REFERENCES public.workshop_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parts_orders_doorbelast_invoice_id ON public.parts_orders(doorbelast_invoice_id);

ALTER TABLE public.werkplaats_tarieven
  ADD COLUMN IF NOT EXISTS onderdelen_marge_pct numeric NOT NULL DEFAULT 25;