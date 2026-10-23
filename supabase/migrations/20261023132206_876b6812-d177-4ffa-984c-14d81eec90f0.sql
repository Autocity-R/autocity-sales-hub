CREATE POLICY "Aftersales can update customer details"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  type IN ('b2b', 'b2c')
  AND (
    public.has_role(auth.uid(), 'aftersales_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'operationeel_directeur'::public.app_role)
  )
)
WITH CHECK (
  type IN ('b2b', 'b2c')
  AND (
    public.has_role(auth.uid(), 'aftersales_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'operationeel_directeur'::public.app_role)
  )
);