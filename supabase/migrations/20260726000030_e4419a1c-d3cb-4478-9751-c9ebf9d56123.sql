-- 1. Contacts: werkplaats_chef mag klanten zien/bewerken (externe orders + facturen)
DROP POLICY IF EXISTS "Authorized users can view contacts" ON public.contacts;
CREATE POLICY "Authorized users can view contacts"
ON public.contacts FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'verkoper') OR
  has_role(auth.uid(), 'aftersales_manager') OR has_role(auth.uid(), 'werkplaats_chef')
);

DROP POLICY IF EXISTS "Authorized users can update contacts" ON public.contacts;
CREATE POLICY "Authorized users can update contacts"
ON public.contacts FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'verkoper') OR
  has_role(auth.uid(), 'werkplaats_chef')
);

-- 2. Vehicles: werkplaats_chef mag voertuigen bijwerken (inname/werkplaatsstatus)
DROP POLICY IF EXISTS "Authorized users can update vehicles" ON public.vehicles;
CREATE POLICY "Authorized users can update vehicles"
ON public.vehicles FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'verkoper') OR
  has_role(auth.uid(), 'aftersales_manager') OR has_role(auth.uid(), 'werkplaats_chef')
);

-- 3. Work orders: monteur ziet ook niet-toegewezen werkplaats-orders in eigen vestiging
DROP POLICY IF EXISTS wo_select ON public.work_orders;
CREATE POLICY wo_select ON public.work_orders FOR SELECT
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur','verkoper']))
  OR (werkplaats_rol() = ANY (ARRAY['spuiter','monteur']) AND assigned_to = auth.uid())
  OR (
    werkplaats_rol() = 'monteur'
    AND discipline = 'werkplaats'
    AND assigned_to IS NULL
    AND (branch IS NULL OR branch = current_user_branch())
  )
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk' AND status = ANY (ARRAY['ingepland','bezig','afgerond']))
);

-- 4. Work orders: monteur mag onbezette werkplaats-taak oppakken + eigen taken bijwerken
DROP POLICY IF EXISTS wo_update ON public.work_orders;
CREATE POLICY wo_update ON public.work_orders FOR UPDATE
USING (
  (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','operationeel_directeur']))
  OR (werkplaats_rol() = ANY (ARRAY['spuiter','monteur']) AND assigned_to = auth.uid())
  OR (
    werkplaats_rol() = 'monteur'
    AND discipline = 'werkplaats'
    AND assigned_to IS NULL
    AND (branch IS NULL OR branch = current_user_branch())
  )
  OR (werkplaats_rol() = 'uitdeuker_extern' AND discipline = 'uitdeuk')
);

-- 5. Verwijderen van werkorders: expliciet beperken (monteur mag niet)
DROP POLICY IF EXISTS wo_delete ON public.work_orders;
CREATE POLICY wo_delete ON public.work_orders FOR DELETE
USING (
  werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef','operationeel_directeur'])
);