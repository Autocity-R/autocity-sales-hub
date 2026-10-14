ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS actief boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uit_dienst_sinds timestamptz;

-- Alleen owner/admin (of de database/service-rol) mag uit-dienst-velden wijzigen
CREATE OR REPLACE FUNCTION public.guard_profiles_actief()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.actief IS DISTINCT FROM OLD.actief OR NEW.uit_dienst_sinds IS DISTINCT FROM OLD.uit_dienst_sinds)
     AND auth.uid() IS NOT NULL AND NOT public.is_admin_or_owner() THEN
    RAISE EXCEPTION 'Alleen beheer mag een medewerker uit dienst zetten';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_profiles_actief ON public.profiles;
CREATE TRIGGER trg_guard_profiles_actief BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_actief();

-- QR-tokens blokkeren het verwijderen niet meer
ALTER TABLE public.checklist_access_tokens DROP CONSTRAINT IF EXISTS checklist_access_tokens_created_by_fkey;
ALTER TABLE public.checklist_access_tokens ADD CONSTRAINT checklist_access_tokens_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Historie van een medewerker (aantallen per bron)
CREATE OR REPLACE FUNCTION public.medewerker_historie(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_owner() THEN
    RAISE EXCEPTION 'Geen rechten';
  END IF;
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'werkorders', NULLIF((SELECT count(*) FROM work_orders WHERE created_by=p_user_id OR approved_by=p_user_id OR assigned_to=p_user_id),0),
    'taken', NULLIF((SELECT count(*) FROM tasks WHERE assigned_to=p_user_id OR assigned_by=p_user_id),0),
    'taakhistorie', NULLIF((SELECT count(*) FROM task_history WHERE changed_by=p_user_id OR old_assignee=p_user_id OR new_assignee=p_user_id),0),
    'onderdelen', NULLIF((SELECT count(*) FROM parts_orders WHERE created_by=p_user_id),0),
    'facturen', NULLIF((SELECT count(*) FROM workshop_invoices WHERE created_by=p_user_id),0),
    'innames', NULLIF((SELECT count(*) FROM vehicle_intakes WHERE created_by=p_user_id OR approved_by=p_user_id),0),
    'inspecties', NULLIF((SELECT count(*) FROM intake_inspections WHERE created_by_user_id=p_user_id OR reviewed_by_user_id=p_user_id),0),
    'leads', NULLIF((SELECT count(*) FROM leads WHERE owner_id=p_user_id OR assigned_to=p_user_id),0),
    'uitleningen', NULLIF((SELECT count(*) FROM leenauto_uitleningen WHERE uitgeleend_door=p_user_id OR ingenomen_door=p_user_id),0),
    'contracten', NULLIF((SELECT count(*) FROM contract_documents WHERE created_by=p_user_id OR salesperson_id=p_user_id OR registered_by=p_user_id OR stored_by=p_user_id),0),
    'voertuigen', NULLIF((SELECT count(*) FROM vehicles WHERE sold_by_user_id=p_user_id OR purchased_by_user_id=p_user_id OR sold_registered_by=p_user_id OR b2b_delivered_by=p_user_id),0),
    'inkoophistorie', NULLIF((SELECT count(*) FROM vehicle_purchase_audit_log WHERE purchased_by=p_user_id),0),
    'schadeherstel', NULLIF((SELECT count(*) FROM damage_repair_records WHERE employee_id=p_user_id),0),
    'garantie', NULLIF((SELECT count(*) FROM warranty_claims WHERE kosten_ingevuld_door=p_user_id),0),
    'statuslog', NULLIF((SELECT count(*) FROM vehicle_status_audit_log WHERE changed_by=p_user_id),0),
    'prijslog', NULLIF((SELECT count(*) FROM vehicle_price_audit_log WHERE changed_by=p_user_id),0),
    'bestanden', NULLIF((SELECT count(*) FROM vehicle_files WHERE uploaded_by=p_user_id),0),
    'weekverkopen', NULLIF((SELECT count(*) FROM weekly_sales WHERE salesperson_id=p_user_id),0)
  )) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.medewerker_historie(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medewerker_historie(uuid) TO authenticated, service_role;

-- Lloyd Mahabier is uit dienst (ban en rollen zijn al geregeld)
UPDATE public.profiles SET actief = false, uit_dienst_sinds = now()
WHERE id = '37eb30a7-e034-4315-8d1b-c2f61d2535a3';