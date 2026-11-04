CREATE OR REPLACE FUNCTION public.voertuig_tijdlijn(p_vehicle_id uuid, p_toon_geannuleerd boolean DEFAULT false)
RETURNS TABLE(
  ts timestamptz,
  heeft_tijd boolean,
  categorie text,
  type text,
  titel text,
  detail text,
  door_naam text,
  bron_tabel text,
  bron_id text,
  via_ander_record boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me record;
  v_ids uuid[];
  v_mag_bpm boolean;
  v_mag_factuur boolean;
  v_mag_prijs boolean;
BEGIN
  SELECT v.id, v.created_at, v.sold_date, v.delivery_date, v.details,
         upper(regexp_replace(coalesce(v.license_number, ''), '[^A-Za-z0-9]', '', 'g')) AS plate,
         upper(regexp_replace(coalesce(v.vin, ''), '[^A-Za-z0-9]', '', 'g')) AS vinn
  INTO v_me
  FROM public.vehicles v
  WHERE v.id = p_vehicle_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT array_agg(v.id) INTO v_ids
  FROM public.vehicles v
  WHERE v.id = v_me.id
     OR (length(v_me.vinn) >= 6 AND upper(regexp_replace(coalesce(v.vin, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.vinn)
     OR (length(v_me.plate) >= 6 AND upper(regexp_replace(coalesce(v.license_number, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.plate);

  v_mag_bpm := has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin')
            OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'administratie');
  v_mag_factuur := v_mag_bpm OR has_role(auth.uid(), 'aftersales_manager') OR has_role(auth.uid(), 'operationeel_directeur');
  v_mag_prijs := has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager');

  -- ---- voertuig zelf: aangemaakt / verkocht / afgeleverd / checklist ----
  RETURN QUERY
  SELECT v_me.created_at, true, 'status', 'aangemaakt', 'Auto aangemaakt in CRM', NULL::text, NULL::text, 'vehicles', v_me.id::text, false;

  IF v_me.sold_date IS NOT NULL THEN
    RETURN QUERY
    SELECT v_me.sold_date, true, 'verkoop', 'verkocht', 'Auto verkocht', NULL::text, NULL::text, 'vehicles', v_me.id::text, false;
  END IF;

  IF v_me.delivery_date IS NOT NULL THEN
    RETURN QUERY
    SELECT v_me.delivery_date::timestamptz, false, 'verkoop', 'afgeleverd', 'Auto afgeleverd', NULL::text, NULL::text, 'vehicles', v_me.id::text, false;
  END IF;

  -- aflever-checklist items (afgevinkt door + wanneer)
  RETURN QUERY
  SELECT NULLIF(i.item->>'completedAt', '')::timestamptz, true, 'verkoop', 'checklist_item',
         'Checklist: ' || coalesce(i.item->>'description', 'item'),
         NULL::text,
         coalesce(NULLIF(i.item->>'completedByName', ''), CASE WHEN i.item->>'completedVia' = 'qr' THEN 'Medewerker (via QR)' END),
         'vehicles', v_me.id::text, false
  FROM jsonb_array_elements(coalesce(v_me.details->'preDeliveryChecklist', '[]'::jsonb)) AS i(item)
  WHERE coalesce((i.item->>'completed')::boolean, false)
    AND NULLIF(i.item->>'completedAt', '') IS NOT NULL;

  -- ---- statuswijzigingen ----
  BEGIN
    RETURN QUERY
    SELECT s.change_timestamp, true, 'status', 'status',
           'Status: ' || coalesce(initcap(replace(s.old_status, '_', ' ')), '—') || ' → ' || initcap(replace(s.new_status, '_', ' ')),
           NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = s.changed_by),
           'vehicle_status_audit_log', s.id::text, s.vehicle_id <> v_me.id
    FROM public.vehicle_status_audit_log s
    WHERE s.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- aankoop vastgelegd (zonder bedragen) ----
  BEGIN
    RETURN QUERY
    SELECT a.purchase_timestamp, true, 'status', 'aankoop', 'Aankoop vastgelegd', NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = a.purchased_by),
           'vehicle_purchase_audit_log', a.id::text, a.vehicle_id <> v_me.id
    FROM public.vehicle_purchase_audit_log a
    WHERE a.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- import / BPM ----
  BEGIN
    RETURN QUERY
    SELECT l.created_at, true, 'import', 'import_status',
           'Import: ' || coalesce(public._import_label(l.old_status), '—') || ' → ' || public._import_label(l.new_status),
           NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id::text = l.changed_by),
           'vehicle_import_logs', l.id::text, l.vehicle_id <> v_me.id
    FROM public.vehicle_import_logs l
    WHERE l.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    RETURN QUERY
    SELECT b.factuur_datum::timestamptz, false, 'import', 'bpm_factuur',
           'BPM-factuur ontvangen' || coalesce(' (' || b.factuur_nummer || ')', ''),
           CASE WHEN v_mag_bpm AND b.bedrag IS NOT NULL THEN 'Bedrag: € ' || to_char(b.bedrag, 'FM999G999G990D00') END,
           NULL::text, 'bpm_huys_facturen', b.id::text, coalesce(b.vehicle_id, v_me.id) <> v_me.id
    FROM public.bpm_huys_facturen b
    WHERE b.vehicle_id = ANY (v_ids)
       OR (b.vehicle_id IS NULL AND length(v_me.vinn) >= 6 AND upper(regexp_replace(coalesce(b.vin, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.vinn);
    RETURN QUERY
    SELECT b.betaald_op::timestamptz, false, 'import', 'bpm_betaald', 'BPM-factuur betaald',
           CASE WHEN v_mag_bpm AND b.bedrag IS NOT NULL THEN 'Bedrag: € ' || to_char(b.bedrag, 'FM999G999G990D00') END,
           NULL::text, 'bpm_huys_facturen', b.id::text, coalesce(b.vehicle_id, v_me.id) <> v_me.id
    FROM public.bpm_huys_facturen b
    WHERE b.betaald_op IS NOT NULL AND (
      b.vehicle_id = ANY (v_ids)
      OR (b.vehicle_id IS NULL AND length(v_me.vinn) >= 6 AND upper(regexp_replace(coalesce(b.vin, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.vinn));
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- inname ----
  BEGIN
    RETURN QUERY
    SELECT n.created_at, true, 'inname', 'inname_aangemaakt', 'Inname aangemaakt', n.note,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = n.created_by),
           'vehicle_intakes', n.id::text, n.vehicle_id <> v_me.id
    FROM public.vehicle_intakes n
    WHERE n.vehicle_id = ANY (v_ids);
    RETURN QUERY
    SELECT n.approved_at, true, 'inname', 'inname_goedgekeurd', 'Inname goedgekeurd', n.note,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = n.approved_by),
           'vehicle_intakes', n.id::text, n.vehicle_id <> v_me.id
    FROM public.vehicle_intakes n
    WHERE n.vehicle_id = ANY (v_ids) AND n.approved_at IS NOT NULL;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    RETURN QUERY
    SELECT x.created_at, true, 'inname', 'inspectie_aangemaakt', 'Inname-inspectie aangemaakt', x.samenvatting_team,
           NULLIF(x.created_by_name, ''), 'intake_inspections', x.id::text, x.vehicle_id <> v_me.id
    FROM public.intake_inspections x
    WHERE x.vehicle_id = ANY (v_ids) AND x.deleted_at IS NULL;
    RETURN QUERY
    SELECT x.reviewed_at, true, 'inname', 'inspectie_beoordeeld', 'Inname-inspectie beoordeeld', x.review_notes,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = x.reviewed_by_user_id),
           'intake_inspections', x.id::text, x.vehicle_id <> v_me.id
    FROM public.intake_inspections x
    WHERE x.vehicle_id = ANY (v_ids) AND x.deleted_at IS NULL AND x.reviewed_at IS NOT NULL;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- werkplaatsorders ----
  BEGIN
    RETURN QUERY
    SELECT w.created_at, true, 'werkplaats', 'order_aangemaakt',
           public._discipline_label(w.discipline) || ' aangemaakt',
           concat_ws(' · ',
             CASE coalesce(w.origin, w.source, '')
               WHEN 'checklist' THEN 'Bron: afleverchecklist'
               WHEN 'inname' THEN 'Bron: inname'
               WHEN 'aftersales' THEN 'Bron: aftersales'
               WHEN 'garantie' THEN 'Bron: garantieclaim'
               WHEN 'extern' THEN 'Bron: externe klus'
               WHEN 'handmatig' THEN 'Bron: handmatig'
               ELSE NULL END,
             w.description),
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = w.created_by),
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids)
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    RETURN QUERY
    SELECT w.planned_at, true, 'werkplaats', 'order_ingepland',
           public._discipline_label(w.discipline) || ' ingepland', w.description,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = w.assigned_to),
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids) AND w.planned_at IS NOT NULL
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    RETURN QUERY
    SELECT w.started_at, true, 'werkplaats', 'order_gestart',
           public._discipline_label(w.discipline) || ' gestart', w.description,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = w.assigned_to),
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids) AND w.started_at IS NOT NULL
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    RETURN QUERY
    SELECT w.finished_at, true, 'werkplaats', 'order_afgerond',
           public._discipline_label(w.discipline) || ' afgerond',
           concat_ws(' · ', w.description,
             CASE WHEN w.work_seconds > 0 THEN
               'Werktijd: ' || (w.work_seconds / 3600) || 'u ' || lpad(((w.work_seconds % 3600) / 60)::text, 2, '0') || 'm' END),
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = w.assigned_to),
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids) AND w.finished_at IS NOT NULL
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    RETURN QUERY
    SELECT w.approved_at, true, 'werkplaats', 'order_goedgekeurd',
           public._discipline_label(w.discipline) || ' goedgekeurd', w.description,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = w.approved_by),
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids) AND w.approved_at IS NOT NULL
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    RETURN QUERY
    SELECT coalesce(w.finished_at, w.planned_at, w.created_at), false, 'werkplaats', 'order_teruggestuurd',
           public._discipline_label(w.discipline) || ' teruggestuurd' || CASE WHEN w.rejected_count > 1 THEN ' (' || w.rejected_count || '×)' ELSE '' END,
           w.reject_note, NULL::text,
           'work_orders', w.id::text, w.vehicle_id <> v_me.id
    FROM public.work_orders w
    WHERE w.vehicle_id = ANY (v_ids) AND coalesce(w.rejected_count, 0) > 0
      AND (p_toon_geannuleerd OR w.status <> 'geannuleerd');

    IF p_toon_geannuleerd THEN
      RETURN QUERY
      SELECT coalesce(w.finished_at, w.planned_at, w.created_at), false, 'werkplaats', 'order_geannuleerd',
             public._discipline_label(w.discipline) || ' geannuleerd', w.description, NULL::text,
             'work_orders', w.id::text, w.vehicle_id <> v_me.id
      FROM public.work_orders w
      WHERE w.vehicle_id = ANY (v_ids) AND w.status = 'geannuleerd';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- onderdelen ----
  BEGIN
    RETURN QUERY
    SELECT o.ordered_at, true, 'werkplaats', 'deel_besteld',
           'Onderdeel besteld: ' || coalesce(o.part_name, '—'), o.leverancier,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = o.created_by),
           'parts_orders', o.id::text, coalesce(o.vehicle_id, v_me.id) <> v_me.id
    FROM public.parts_orders o
    WHERE o.ordered_at IS NOT NULL AND (
      o.vehicle_id = ANY (v_ids)
      OR (o.vehicle_id IS NULL AND length(v_me.plate) >= 6
          AND upper(regexp_replace(coalesce(o.manual_license, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.plate));
    RETURN QUERY
    SELECT o.arrived_at, true, 'werkplaats', 'deel_binnen',
           'Onderdeel binnen: ' || coalesce(o.part_name, '—'), o.leverancier, NULL::text,
           'parts_orders', o.id::text, coalesce(o.vehicle_id, v_me.id) <> v_me.id
    FROM public.parts_orders o
    WHERE o.arrived_at IS NOT NULL AND (
      o.vehicle_id = ANY (v_ids)
      OR (o.vehicle_id IS NULL AND length(v_me.plate) >= 6
          AND upper(regexp_replace(coalesce(o.manual_license, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.plate));
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- werkplaatsfacturen gekoppeld aan orders van deze auto ----
  BEGIN
    RETURN QUERY
    SELECT wi.created_at, true, 'werkplaats', 'factuur',
           'Factuur ' || coalesce(wi.invoice_number, '(concept)'),
           CASE WHEN v_mag_factuur AND wi.subtotal IS NOT NULL THEN 'Bedrag excl. btw: € ' || to_char(wi.subtotal, 'FM999G999G990D00') END,
           NULL::text, 'workshop_invoices', wi.id::text, false
    FROM public.workshop_invoices wi
    WHERE EXISTS (
      SELECT 1 FROM public.work_orders w
      WHERE w.vehicle_id = ANY (v_ids)
        AND w.id = ANY (public.invoice_order_ids(wi.source_work_order_ids, wi.work_order_id)));
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- verkoop: contracten ----
  BEGIN
    RETURN QUERY
    SELECT c.created_at, true, 'verkoop', 'contract_aangemaakt',
           'Koopcontract aangemaakt' || coalesce(' (' || c.contract_number || ')', ''), NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = c.created_by),
           'contract_documents', c.id::text, c.vehicle_id <> v_me.id
    FROM public.contract_documents c
    WHERE c.vehicle_id = ANY (v_ids);
    RETURN QUERY
    SELECT c.sent_at, true, 'verkoop', 'contract_verstuurd',
           'Koopcontract verstuurd' || coalesce(' (' || c.contract_number || ')', ''), NULL::text, NULL::text,
           'contract_documents', c.id::text, c.vehicle_id <> v_me.id
    FROM public.contract_documents c
    WHERE c.vehicle_id = ANY (v_ids) AND c.sent_at IS NOT NULL;
    RETURN QUERY
    SELECT c.signed_at, true, 'verkoop', 'contract_getekend',
           'Koopcontract getekend' || coalesce(' (' || c.contract_number || ')', ''), NULL::text, NULL::text,
           'contract_documents', c.id::text, c.vehicle_id <> v_me.id
    FROM public.contract_documents c
    WHERE c.vehicle_id = ANY (v_ids) AND c.signed_at IS NOT NULL;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- verkoop: prijswijzigingen (alleen owner/admin/manager) ----
  IF v_mag_prijs THEN
    BEGIN
      RETURN QUERY
      SELECT a.changed_at, true, 'verkoop', 'prijs_gewijzigd', 'Prijs gewijzigd',
             CASE WHEN a.old_selling_price IS NOT NULL OR a.new_selling_price IS NOT NULL THEN
               'Verkoopprijs: € ' || to_char(coalesce(a.old_selling_price, 0), 'FM999G999G990D00')
               || ' → € ' || to_char(coalesce(a.new_selling_price, 0), 'FM999G999G990D00') END,
             (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = a.changed_by),
             'vehicle_price_audit_log', a.id::text, a.vehicle_id <> v_me.id
      FROM public.vehicle_price_audit_log a
      WHERE a.vehicle_id = ANY (v_ids);
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END IF;

  -- ---- verkoop: website-reservering ----
  BEGIN
    RETURN QUERY
    SELECT r.created_at, true, 'verkoop', 'website_reservering',
           'Website-reservering (' || r.resultaat || ')', r.fout, NULL::text,
           'website_reservering_log', r.id::text, r.vehicle_id <> v_me.id
    FROM public.website_reservering_log r
    WHERE r.vehicle_id = ANY (v_ids);
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- nazorg: garantieclaims ----
  BEGIN
    RETURN QUERY
    SELECT c.created_at, true, 'nazorg', 'claim_aangemaakt', 'Garantieclaim aangemaakt', c.description, NULL::text,
           'warranty_claims', c.id::text, coalesce(c.vehicle_id, v_me.id) <> v_me.id
    FROM public.warranty_claims c
    WHERE c.vehicle_id = ANY (v_ids)
       OR (c.vehicle_id IS NULL AND length(v_me.plate) >= 6
           AND upper(regexp_replace(coalesce(c.manual_license_number, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.plate);
    RETURN QUERY
    SELECT c.resolution_date::timestamptz, false, 'nazorg', 'claim_opgelost', 'Garantieclaim opgelost', c.resolution_description, NULL::text,
           'warranty_claims', c.id::text, coalesce(c.vehicle_id, v_me.id) <> v_me.id
    FROM public.warranty_claims c
    WHERE c.resolution_date IS NOT NULL AND (
      c.vehicle_id = ANY (v_ids)
      OR (c.vehicle_id IS NULL AND length(v_me.plate) >= 6
          AND upper(regexp_replace(coalesce(c.manual_license_number, ''), '[^A-Za-z0-9]', '', 'g')) = v_me.plate));
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- nazorg: deze auto als leenauto ingezet ----
  BEGIN
    RETURN QUERY
    SELECT u.uitgeleend_op, true, 'nazorg', 'leenauto_uitgeleend',
           'Uitgeleend als leenauto aan ' || coalesce(u.klant_naam, '—'), u.reden, NULL::text,
           'leenauto_uitleningen', u.id::text, false
    FROM public.leenauto_uitleningen u
    JOIN public.loan_cars lc ON lc.id = u.loan_car_id
    WHERE lc.vehicle_id = ANY (v_ids) AND u.uitgeleend_op IS NOT NULL;
    RETURN QUERY
    SELECT u.ingeleverd_op, true, 'nazorg', 'leenauto_ingenomen',
           'Leenauto weer ingenomen (' || coalesce(u.klant_naam, '—') || ')', u.notities, NULL::text,
           'leenauto_uitleningen', u.id::text, false
    FROM public.leenauto_uitleningen u
    JOIN public.loan_cars lc ON lc.id = u.loan_car_id
    WHERE lc.vehicle_id = ANY (v_ids) AND u.ingeleverd_op IS NOT NULL;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- overig: taken ----
  BEGIN
    RETURN QUERY
    SELECT t.created_at, true, 'overig', 'taak_aangemaakt', 'Taak: ' || coalesce(t.title, '—'),
           NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = t.assigned_to),
           'tasks', t.id::text, coalesce(t.vehicle_id, t.linked_vehicle_id) <> v_me.id
    FROM public.tasks t
    WHERE t.vehicle_id = ANY (v_ids) OR t.linked_vehicle_id = ANY (v_ids);
    RETURN QUERY
    SELECT t.completed_at, true, 'overig', 'taak_voltooid', 'Taak voltooid: ' || coalesce(t.title, '—'),
           NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = t.assigned_to),
           'tasks', t.id::text, coalesce(t.vehicle_id, t.linked_vehicle_id) <> v_me.id
    FROM public.tasks t
    WHERE (t.vehicle_id = ANY (v_ids) OR t.linked_vehicle_id = ANY (v_ids)) AND t.completed_at IS NOT NULL;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- overig: bestanden, samengevoegd per dag/categorie/uploader ----
  BEGIN
    RETURN QUERY
    SELECT date_trunc('day', f.created_at), false, 'overig', 'bestanden',
           COUNT(*)::text || ' ' || CASE WHEN f.category = 'photo' THEN 'foto''s' ELSE 'documenten' END || ' toegevoegd',
           NULL::text,
           (SELECT nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '') FROM public.profiles p WHERE p.id = f.uploaded_by),
           'vehicle_files', NULL::text, false
    FROM public.vehicle_files f
    WHERE f.vehicle_id = ANY (v_ids)
    GROUP BY date_trunc('day', f.created_at), f.category, f.uploaded_by;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RETURN;
END;
$$;