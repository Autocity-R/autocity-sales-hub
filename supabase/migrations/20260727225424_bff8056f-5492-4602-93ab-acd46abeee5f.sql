-- Revert directie-cockpit RLS wijzigingen: terug naar staat vóór 20260727224501
DROP POLICY IF EXISTS parts_select ON public.parts_orders;
DROP POLICY IF EXISTS wi_select ON public.workshop_invoices;

DROP POLICY IF EXISTS wo_insert ON public.work_orders;
CREATE POLICY wo_insert ON public.work_orders FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur','verkoper']));

DROP POLICY IF EXISTS wo_delete ON public.work_orders;
CREATE POLICY wo_delete ON public.work_orders FOR DELETE TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef','operationeel_directeur']));

DROP POLICY IF EXISTS wo_update ON public.work_orders;
CREATE POLICY wo_update ON public.work_orders FOR UPDATE TO authenticated
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR ((werkplaats_rol() = ANY (ARRAY['schadeherstel','monteur'])) AND assigned_to = auth.uid())
  OR (werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND assigned_to IS NULL AND (branch IS NULL OR branch = current_user_branch()))
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
  OR (werkplaats_rol() = 'schadeherstel' AND discipline = 'spuit' AND (assigned_to IS NULL OR assigned_to = auth.uid()) AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
  OR (werkplaats_rol() = 'poetser' AND discipline = 'poets' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
);

DROP POLICY IF EXISTS vi_write ON public.vehicle_intakes;
CREATE POLICY vi_write ON public.vehicle_intakes FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));

DROP POLICY IF EXISTS parts_rw ON public.parts_orders;
CREATE POLICY parts_rw ON public.parts_orders FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));

DROP POLICY IF EXISTS wi_rw ON public.workshop_invoices;
CREATE POLICY wi_rw ON public.workshop_invoices FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));

DROP POLICY IF EXISTS "Werkplaats roles can create contacts" ON public.contacts;
CREATE POLICY "Werkplaats roles can create contacts" ON public.contacts FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['aftersales_manager','werkplaats_chef','operationeel','operationeel_directeur']));

DROP POLICY IF EXISTS "Werkplaats roles can create vehicles" ON public.vehicles;
CREATE POLICY "Werkplaats roles can create vehicles" ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['aftersales_manager','werkplaats_chef','operationeel','operationeel_directeur']));
