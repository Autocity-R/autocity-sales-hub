-- Innames: verkoper mag inname aanmaken en bijwerken
CREATE POLICY vi_insert_verkoper ON public.vehicle_intakes
  FOR INSERT TO authenticated
  WITH CHECK (public.werkplaats_rol() = 'verkoper');

CREATE POLICY vi_update_verkoper ON public.vehicle_intakes
  FOR UPDATE TO authenticated
  USING (public.werkplaats_rol() = 'verkoper')
  WITH CHECK (public.werkplaats_rol() = 'verkoper');

-- Werkorders: verkoper mag bundelen/bijwerken, maar NOOIT goedkeuren
CREATE POLICY wo_update_verkoper ON public.work_orders
  FOR UPDATE TO authenticated
  USING (public.werkplaats_rol() = 'verkoper' AND status <> 'goedgekeurd' AND approved_at IS NULL)
  WITH CHECK (public.werkplaats_rol() = 'verkoper' AND status <> 'goedgekeurd' AND approved_at IS NULL);

-- Onderdelenorders: verkoper mag inzien (inname-detail)
CREATE POLICY parts_select_verkoper ON public.parts_orders
  FOR SELECT TO authenticated
  USING (public.werkplaats_rol() = 'verkoper');