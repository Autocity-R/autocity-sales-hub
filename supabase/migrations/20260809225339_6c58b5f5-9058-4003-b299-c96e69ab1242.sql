CREATE POLICY "parts_insert_verkoper" ON public.parts_orders
FOR INSERT TO authenticated
WITH CHECK (public.werkplaats_rol() = 'verkoper' AND created_by = auth.uid() AND status = 'te_bestellen');

CREATE POLICY "parts_update_verkoper" ON public.parts_orders
FOR UPDATE TO authenticated
USING (
  public.werkplaats_rol() = 'verkoper'
  AND created_by = auth.uid()
  AND status = 'te_bestellen'
  AND doorbelast_invoice_id IS NULL
)
WITH CHECK (
  public.werkplaats_rol() = 'verkoper'
  AND created_by = auth.uid()
  AND status = 'te_bestellen'
  AND doorbelast_invoice_id IS NULL
);

CREATE POLICY "parts_delete_verkoper" ON public.parts_orders
FOR DELETE TO authenticated
USING (
  public.werkplaats_rol() = 'verkoper'
  AND created_by = auth.uid()
  AND status = 'te_bestellen'
  AND doorbelast_invoice_id IS NULL
);