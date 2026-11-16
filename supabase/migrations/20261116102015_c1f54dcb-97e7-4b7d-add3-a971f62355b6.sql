DROP POLICY IF EXISTS parts_rw ON public.parts_orders;
CREATE POLICY parts_rw ON public.parts_orders
  FOR ALL TO authenticated
  USING (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  WITH CHECK (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));