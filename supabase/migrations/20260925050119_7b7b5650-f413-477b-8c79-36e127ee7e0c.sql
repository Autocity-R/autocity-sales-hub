-- 1. tasks: directeur zelfde als aftersales_manager
DROP POLICY IF EXISTS "All roles can view relevant tasks" ON public.tasks;
CREATE POLICY "All roles can view relevant tasks" ON public.tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'verkoper') OR has_role(auth.uid(), 'aftersales_manager')
  OR has_role(auth.uid(), 'operationeel_directeur')
  OR assigned_to = auth.uid() OR assigned_by = auth.uid());

DROP POLICY IF EXISTS "All roles can update relevant tasks" ON public.tasks;
CREATE POLICY "All roles can update relevant tasks" ON public.tasks FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'verkoper') OR has_role(auth.uid(), 'aftersales_manager')
  OR has_role(auth.uid(), 'operationeel_directeur')
  OR assigned_to = auth.uid() OR assigned_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'verkoper') OR has_role(auth.uid(), 'aftersales_manager')
  OR has_role(auth.uid(), 'operationeel_directeur')
  OR assigned_to = auth.uid() OR assigned_by = auth.uid());

-- 2. work_orders INSERT: directeur mag toewijzen vanuit checklist
DROP POLICY IF EXISTS wo_insert ON public.work_orders;
CREATE POLICY wo_insert ON public.work_orders FOR INSERT
WITH CHECK (werkplaats_rol() = ANY (ARRAY['owner','admin','manager','operationeel','aftersales_manager','werkplaats_chef','verkoper','operationeel_directeur']));

-- 3. vehicles: directeur mag ALLEEN details.preDeliveryChecklist wijzigen
CREATE POLICY "Directeur can update vehicle checklist" ON public.vehicles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'operationeel_directeur'))
WITH CHECK (has_role(auth.uid(), 'operationeel_directeur'));

CREATE OR REPLACE FUNCTION public.guard_directeur_vehicle_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Alleen van toepassing als de gebruiker GEEN rol heeft die al volledig mag bewerken
  IF auth.uid() IS NULL
     OR NOT has_role(auth.uid(), 'operationeel_directeur')
     OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
     OR has_role(auth.uid(), 'verkoper') OR has_role(auth.uid(), 'aftersales_manager')
     OR has_role(auth.uid(), 'werkplaats_chef') THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'details' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'details' - 'updated_at')
     OR (coalesce(NEW.details, '{}'::jsonb) - 'preDeliveryChecklist') IS DISTINCT FROM (coalesce(OLD.details, '{}'::jsonb) - 'preDeliveryChecklist') THEN
    RAISE EXCEPTION 'Operationeel directeur mag alleen de aflever-checklist wijzigen';
  END IF;
  RETURN NEW;
END $$;

-- 'a0_' vuurt als eerste BEFORE-trigger, dus vóór andere triggers kolommen aanpassen
CREATE TRIGGER a0_guard_directeur_vehicle_update BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.guard_directeur_vehicle_update();

-- 4. user_roles: directeur ziet werkplaatsrollen (voor toewijzen)
DROP POLICY IF EXISTS "Workshop leads can view workshop roles" ON public.user_roles;
CREATE POLICY "Workshop leads can view workshop roles" ON public.user_roles FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'werkplaats_chef') OR has_role(auth.uid(), 'aftersales_manager') OR has_role(auth.uid(), 'operationeel_directeur'))
  AND (role::text = ANY (ARRAY['monteur','spuiter','poetser','uitdeuker_extern','werkplaats_chef'])));