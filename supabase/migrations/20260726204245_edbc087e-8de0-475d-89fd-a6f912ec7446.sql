DROP POLICY IF EXISTS wo_select ON public.work_orders;
CREATE POLICY wo_select ON public.work_orders FOR SELECT
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur','verkoper']))
  OR ((werkplaats_rol() = ANY (ARRAY['spuiter','monteur'])) AND assigned_to = auth.uid())
  OR (werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND assigned_to IS NULL AND (branch IS NULL OR branch = current_user_branch()))
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig','afgerond']))
);

DROP POLICY IF EXISTS wo_update ON public.work_orders;
CREATE POLICY wo_update ON public.work_orders FOR UPDATE
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR ((werkplaats_rol() = ANY (ARRAY['spuiter','monteur'])) AND assigned_to = auth.uid())
  OR (werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND assigned_to IS NULL AND (branch IS NULL OR branch = current_user_branch()))
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['aangevraagd','ingepland','bezig']))
)
WITH CHECK (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['bezig','afgerond']))
  OR (werkplaats_rol() = 'spuiter' AND assigned_to = auth.uid())
  OR (werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND (assigned_to = auth.uid() OR assigned_to IS NULL) AND status = ANY (ARRAY['ingepland','bezig','afgerond']))
);