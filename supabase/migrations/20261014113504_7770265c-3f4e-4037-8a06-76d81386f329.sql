CREATE OR REPLACE FUNCTION public.voertuig_werkhistorie(p_vehicle_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, vin, license_number,
           upper(regexp_replace(coalesce(license_number,''), '[^A-Za-z0-9]', '', 'g')) AS plate,
           upper(regexp_replace(coalesce(vin,''), '[^A-Za-z0-9]', '', 'g')) AS vinn
    FROM vehicles WHERE id = p_vehicle_id
  ),
  recs AS (
    SELECT v.id, v.status, (v.id <> me.id) AS ander
    FROM vehicles v, me
    WHERE v.id = me.id
       OR (length(me.vinn) >= 6 AND upper(regexp_replace(coalesce(v.vin,''), '[^A-Za-z0-9]', '', 'g')) = me.vinn)
       OR (length(me.plate) >= 6 AND upper(regexp_replace(coalesce(v.license_number,''), '[^A-Za-z0-9]', '', 'g')) = me.plate)
  )
  SELECT jsonb_build_object(
    'orders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', w.id, 'vehicle_id', w.vehicle_id, 'discipline', w.discipline, 'source', w.source, 'origin', w.origin,
        'description', w.description, 'part', w.part, 'parts', w.parts, 'status', w.status,
        'created_at', w.created_at, 'started_at', w.started_at, 'finished_at', w.finished_at,
        'approved_at', w.approved_at, 'planned_at', w.planned_at, 'work_seconds', w.work_seconds,
        'warranty_claim_id', w.warranty_claim_id, 'claim_status', c.claim_status,
        'assigned_name', nullif(trim(coalesce(pa.first_name,'') || ' ' || coalesce(pa.last_name,'')), ''),
        'assigned_actief', pa.actief,
        'approved_name', nullif(trim(coalesce(pb.first_name,'') || ' ' || coalesce(pb.last_name,'')), ''),
        'via_ander_record', r.ander, 'record_status', r.status
      ) ORDER BY w.created_at)
      FROM work_orders w
      JOIN recs r ON r.id = w.vehicle_id
      LEFT JOIN warranty_claims c ON c.id = w.warranty_claim_id
      LEFT JOIN profiles pa ON pa.id = w.assigned_to
      LEFT JOIN profiles pb ON pb.id = w.approved_by
    ), '[]'::jsonb),
    'claims', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'created_at', c.created_at, 'description', c.description, 'claim_status', c.claim_status,
        'kosten_totaal', c.kosten_totaal, 'vehicle_id', c.vehicle_id, 'manual_license_number', c.manual_license_number
      ) ORDER BY c.created_at DESC)
      FROM warranty_claims c, me
      WHERE c.vehicle_id = me.id
         OR (c.vehicle_id IS NULL AND length(me.plate) >= 6
             AND upper(regexp_replace(coalesce(c.manual_license_number,''), '[^A-Za-z0-9]', '', 'g')) = me.plate)
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.voertuig_werkhistorie(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voertuig_werkhistorie(uuid) TO authenticated;