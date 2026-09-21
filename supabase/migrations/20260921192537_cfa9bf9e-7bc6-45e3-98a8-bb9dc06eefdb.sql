CREATE POLICY "Workshop roles can view delivery appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  type = 'aflevering'
  AND (
    has_role(auth.uid(), 'werkplaats_chef'::app_role)
    OR has_role(auth.uid(), 'monteur'::app_role)
    OR has_role(auth.uid(), 'poetser'::app_role)
    OR has_role(auth.uid(), 'schadeherstel'::app_role)
    OR has_role(auth.uid(), 'uitdeuker_extern'::app_role)
    OR has_role(auth.uid(), 'operationeel_directeur'::app_role)
    OR has_role(auth.uid(), 'operationeel'::app_role)
  )
  AND (branch = current_user_branch() OR branch IS NULL OR current_user_branch() IS NULL)
);