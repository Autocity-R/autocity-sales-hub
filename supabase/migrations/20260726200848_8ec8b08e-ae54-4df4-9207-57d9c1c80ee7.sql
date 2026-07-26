DROP POLICY IF EXISTS wo_update ON public.work_orders;

CREATE POLICY wo_update ON public.work_orders
FOR UPDATE
USING (
  (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR ((public.werkplaats_rol() = ANY (ARRAY['spuiter','monteur'])) AND assigned_to = auth.uid())
  OR (public.werkplaats_rol() = 'monteur' AND discipline = 'werkplaats' AND assigned_to IS NULL AND (branch IS NULL OR branch = public.current_user_branch()))
  OR (public.werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk')
)
WITH CHECK (
  (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR (public.werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk')
  OR (public.werkplaats_rol() = 'spuiter' AND assigned_to = auth.uid())
  OR (
    public.werkplaats_rol() = 'monteur'
    AND discipline = 'werkplaats'
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
    AND status = ANY (ARRAY['ingepland','bezig','afgerond'])
  )
);