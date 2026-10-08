DROP POLICY IF EXISTS "Workshop leads can view workshop roles" ON public.user_roles;
CREATE POLICY "Workshop leads can view workshop roles" ON public.user_roles FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'werkplaats_chef') OR has_role(auth.uid(), 'aftersales_manager') OR has_role(auth.uid(), 'operationeel_directeur'))
  AND (role::text = ANY (ARRAY['monteur','schadeherstel','poetser','uitdeuker_extern','werkplaats_chef','aftersales_manager'])));