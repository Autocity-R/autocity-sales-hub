CREATE POLICY wo_select_schade_gepauzeerd ON public.work_orders FOR SELECT TO authenticated
USING (public.werkplaats_rol() = 'schadeherstel' AND discipline = 'spuit' AND status = 'gepauzeerd');

CREATE POLICY wo_update_schade_pauze ON public.work_orders FOR UPDATE TO authenticated
USING (public.werkplaats_rol() = 'schadeherstel' AND discipline = 'spuit' AND status = 'gepauzeerd' AND assigned_to = auth.uid())
WITH CHECK (public.werkplaats_rol() = 'schadeherstel' AND discipline = 'spuit' AND assigned_to = auth.uid() AND status IN ('gepauzeerd','bezig'));

CREATE OR REPLACE FUNCTION public.spuit_overnemen(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.werkplaats_rol() NOT IN ('schadeherstel','owner','admin','manager','aftersales_manager','werkplaats_chef') THEN
    RAISE EXCEPTION 'Geen rechten om over te nemen';
  END IF;
  UPDATE public.work_orders SET assigned_to = auth.uid()
  WHERE id = p_id AND discipline = 'spuit' AND status = 'gepauzeerd';
  IF NOT FOUND THEN RAISE EXCEPTION 'Klus is niet (meer) gepauzeerd'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.spuit_overnemen(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.spuit_overnemen(uuid) TO authenticated;

DROP POLICY IF EXISTS wo_delete ON public.work_orders;
CREATE POLICY wo_delete ON public.work_orders FOR DELETE TO authenticated
USING (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef','operationeel_directeur']));