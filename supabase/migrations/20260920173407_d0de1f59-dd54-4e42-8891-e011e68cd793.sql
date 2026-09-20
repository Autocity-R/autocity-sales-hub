DROP POLICY IF EXISTS "Authorized users can delete warranty claims" ON public.warranty_claims;
CREATE POLICY "Authorized users can delete warranty claims"
ON public.warranty_claims
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'aftersales_manager'::app_role)
  OR has_role(auth.uid(), 'operationeel_directeur'::app_role)
);

CREATE POLICY "wo_update_directeur"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (werkplaats_rol() = 'operationeel_directeur'::text)
WITH CHECK (werkplaats_rol() = 'operationeel_directeur'::text);