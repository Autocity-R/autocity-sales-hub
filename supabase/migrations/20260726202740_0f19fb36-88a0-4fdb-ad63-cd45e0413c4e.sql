CREATE POLICY "Workshop leads can view workshop roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'werkplaats_chef') OR public.has_role(auth.uid(), 'aftersales_manager'))
  AND role::text = ANY (ARRAY['monteur', 'spuiter', 'poetser', 'uitdeuker_extern', 'werkplaats_chef'])
);