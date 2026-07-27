-- work_orders: directeur alleen lezen
DROP POLICY IF EXISTS wo_insert ON public.work_orders;
CREATE POLICY wo_insert ON public.work_orders FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','verkoper']));

DROP POLICY IF EXISTS wo_delete ON public.work_orders;
CREATE POLICY wo_delete ON public.work_orders FOR DELETE TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef']));

DROP POLICY IF EXISTS wo_update ON public.work_orders;
CREATE POLICY wo_update ON public.work_orders FOR UPDATE TO authenticated
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']))
  OR ((werkplaats_rol() = ANY (ARRAY['schadeherstel','monteur'])) AND assigned_to = auth.uid())
  OR (werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND assigned_to IS NULL AND (branch IS NULL OR branch = current_user_branch()))
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
  OR (werkplaats_rol() = 'schadeherstel' AND discipline = 'spuit' AND (assigned_to IS NULL OR assigned_to = auth.uid()) AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
  OR (werkplaats_rol() = 'poetser' AND discipline = 'poets' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
);

-- vehicle_intakes: directeur alleen lezen (vi_select bevat hem al)
DROP POLICY IF EXISTS vi_write ON public.vehicle_intakes;
CREATE POLICY vi_write ON public.vehicle_intakes FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']));

-- parts_orders: schrijven zonder directeur, lezen mét directeur
DROP POLICY IF EXISTS parts_rw ON public.parts_orders;
CREATE POLICY parts_rw ON public.parts_orders FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']));

DROP POLICY IF EXISTS parts_select ON public.parts_orders;
CREATE POLICY parts_select ON public.parts_orders FOR SELECT TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));

-- workshop_invoices: schrijven zonder directeur, lezen mét directeur
DROP POLICY IF EXISTS wi_rw ON public.workshop_invoices;
CREATE POLICY wi_rw ON public.workshop_invoices FOR ALL TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']))
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef']));

DROP POLICY IF EXISTS wi_select ON public.workshop_invoices;
CREATE POLICY wi_select ON public.workshop_invoices FOR SELECT TO authenticated
USING (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']));

-- contacts: directeur mag klanten inzien, niet aanmaken
DROP POLICY IF EXISTS "Werkplaats roles can create contacts" ON public.contacts;
CREATE POLICY "Werkplaats roles can create contacts" ON public.contacts FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['aftersales_manager','werkplaats_chef','operationeel']));

DROP POLICY IF EXISTS "Authorized users can view contacts" ON public.contacts;
CREATE POLICY "Authorized users can view contacts" ON public.contacts FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'verkoper') OR has_role(auth.uid(), 'aftersales_manager')
  OR has_role(auth.uid(), 'werkplaats_chef') OR has_role(auth.uid(), 'operationeel_directeur')
);

-- vehicles: directeur mag geen voertuigen aanmaken
DROP POLICY IF EXISTS "Werkplaats roles can create vehicles" ON public.vehicles;
CREATE POLICY "Werkplaats roles can create vehicles" ON public.vehicles FOR INSERT TO authenticated
WITH CHECK (werkplaats_rol() = ANY (ARRAY['aftersales_manager','werkplaats_chef','operationeel']));