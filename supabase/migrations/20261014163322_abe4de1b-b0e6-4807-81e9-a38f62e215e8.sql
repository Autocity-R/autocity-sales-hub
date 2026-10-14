CREATE OR REPLACE FUNCTION public.omzet_regels(p_van date, p_tot date, p_branch text DEFAULT NULL)
RETURNS TABLE(
  invoice_id uuid, invoice_number text, invoice_kind text, tak text, omzet_datum date,
  subtotal numeric, total numeric, status text, branch text, created_at timestamptz,
  klant text, kenteken text, telt_mee boolean, telt_niet_mee boolean, telt_niet_mee_reden text,
  gekoppeld boolean, work_order_id uuid, discipline text, medewerker_id uuid, aandeel_delen int, bedrag numeric
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH inv AS (
    SELECT i.*, public.invoice_order_ids(i.source_work_order_ids, i.work_order_id) AS ids,
      (NOT i.telt_niet_mee AND (i.status <> 'concept' OR i.invoice_kind IN ('intern','poets_intern'))) AS meetellen
    FROM public.workshop_invoices i
    WHERE i.omzet_datum >= p_van AND i.omzet_datum < p_tot
      AND (p_branch IS NULL OR i.branch = p_branch)
  ),
  alloc AS (
    SELECT inv.id AS inv_id, w.id AS wo_id, w.discipline, w.assigned_to,
      CASE WHEN inv.tak = 'schadeherstel' AND w.discipline = 'spuit'
        THEN GREATEST(1, CASE WHEN jsonb_typeof(w.parts) = 'array' THEN jsonb_array_length(w.parts) ELSE 0 END)
        ELSE 1 END AS gewicht
    FROM inv JOIN public.work_orders w ON w.id = ANY(inv.ids)
  ),
  tot AS (SELECT inv_id, sum(gewicht) AS g FROM alloc GROUP BY inv_id)
  SELECT inv.id, inv.invoice_number, inv.invoice_kind, inv.tak, inv.omzet_datum,
    inv.subtotal, inv.total, inv.status, inv.branch, inv.created_at,
    inv.customer->>'name', NULLIF(inv.vehicle->>'license_number',''),
    inv.meetellen, inv.telt_niet_mee, inv.telt_niet_mee_reden,
    (cardinality(inv.ids) > 0),
    a.wo_id, a.discipline, a.assigned_to, a.gewicht,
    CASE WHEN a.inv_id IS NULL THEN inv.subtotal
         ELSE round(inv.subtotal * a.gewicht / NULLIF(t.g,0), 2) END
  FROM inv
  LEFT JOIN alloc a ON a.inv_id = inv.id
  LEFT JOIN tot t ON t.inv_id = inv.id
$$;
GRANT EXECUTE ON FUNCTION public.omzet_regels(date, date, text) TO authenticated;