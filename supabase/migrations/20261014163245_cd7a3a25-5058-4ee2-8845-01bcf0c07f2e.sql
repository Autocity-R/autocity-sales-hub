ALTER TABLE public.workshop_invoices
  ADD COLUMN IF NOT EXISTS tak text,
  ADD COLUMN IF NOT EXISTS omzet_datum date,
  ADD COLUMN IF NOT EXISTS telt_niet_mee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telt_niet_mee_reden text;

DO $$ BEGIN
  ALTER TABLE public.workshop_invoices ADD CONSTRAINT workshop_invoices_tak_check
    CHECK (tak IS NULL OR tak IN ('schadeherstel','werkplaats','poets'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gekoppelde werkorder-ids: source_work_order_ids als niet leeg, anders work_order_id
CREATE OR REPLACE FUNCTION public.invoice_order_ids(p_src jsonb, p_wo uuid)
RETURNS uuid[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_src) = 'array' AND jsonb_array_length(p_src) > 0
      THEN ARRAY(SELECT e::uuid FROM jsonb_array_elements_text(p_src) e WHERE e ~* '^[0-9a-f-]{36}$')
    WHEN p_wo IS NOT NULL THEN ARRAY[p_wo]
    ELSE ARRAY[]::uuid[] END
$$;

CREATE OR REPLACE FUNCTION public.workshop_invoice_fill_omzet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[] := public.invoice_order_ids(NEW.source_work_order_ids, NEW.work_order_id);
  v_spuit boolean; v_appr timestamptz; v_done timestamptz; v_sl boolean;
BEGIN
  SELECT bool_or(w.discipline = 'spuit'), max(w.approved_at), max(COALESCE(w.finished_at, w.approved_at))
    INTO v_spuit, v_appr, v_done
    FROM public.work_orders w WHERE w.id = ANY(v_ids);
  IF NEW.tak IS NULL THEN
    v_sl := EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.lines,'[]'::jsonb)) l
                    WHERE jsonb_typeof(l) = 'object' AND lower(COALESCE(l->>'description','')) LIKE 'schadeherstel%');
    NEW.tak := CASE
      WHEN NEW.invoice_kind = 'poets_intern' THEN 'poets'
      WHEN COALESCE(v_spuit,false) OR (NEW.invoice_kind = 'intern' AND v_sl) THEN 'schadeherstel'
      ELSE 'werkplaats' END;
  END IF;
  IF NEW.omzet_datum IS NULL THEN
    NEW.omzet_datum := (CASE
      WHEN NEW.invoice_kind = 'intern' THEN COALESCE(v_appr, NEW.created_at, now())
      WHEN NEW.invoice_kind = 'poets_intern' THEN COALESCE(v_done, NEW.created_at, now())
      ELSE COALESCE(NEW.created_at, now()) END AT TIME ZONE 'Europe/Amsterdam')::date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_workshop_invoice_fill_omzet ON public.workshop_invoices;
CREATE TRIGGER trg_workshop_invoice_fill_omzet
  BEFORE INSERT OR UPDATE ON public.workshop_invoices
  FOR EACH ROW EXECUTE FUNCTION public.workshop_invoice_fill_omzet();

-- Koppelingen herstellen (bedragen ongewijzigd)
UPDATE public.workshop_invoices SET
  work_order_id = '2b9c9246-48b9-414e-a972-6271fb87405d',
  source_work_order_ids = '["2b9c9246-48b9-414e-a972-6271fb87405d"]'::jsonb,
  vehicle_id = (SELECT vehicle_id FROM public.work_orders WHERE id = '2b9c9246-48b9-414e-a972-6271fb87405d'),
  tak = 'schadeherstel'
WHERE invoice_number = 'AR-2026-0114';

UPDATE public.workshop_invoices SET
  work_order_id = '1fc8aba8-8fca-45d9-8c96-e6da03594acf',
  source_work_order_ids = '["1fc8aba8-8fca-45d9-8c96-e6da03594acf"]'::jsonb,
  vehicle_id = (SELECT vehicle_id FROM public.work_orders WHERE id = '1fc8aba8-8fca-45d9-8c96-e6da03594acf'),
  tak = 'werkplaats'
WHERE invoice_number = 'AR-2026-0075';

UPDATE public.workshop_invoices SET telt_niet_mee = true, telt_niet_mee_reden = 'testfactuur'
WHERE invoice_number = 'AR-2026-0001';

-- Backfill: trigger vult lege tak/omzet_datum in
UPDATE public.workshop_invoices SET tak = tak WHERE tak IS NULL OR omzet_datum IS NULL;

-- Eén bron voor alle omzetschermen. SECURITY INVOKER: bestaande RLS op facturen/werkorders blijft gelden.
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
    WHERE inv.tak <> 'poets'
  ),
  tot AS (SELECT inv_id, sum(gewicht) AS g FROM alloc GROUP BY inv_id)
  SELECT inv.id, inv.invoice_number, inv.invoice_kind, inv.tak, inv.omzet_datum,
    inv.subtotal, inv.total, inv.status, inv.branch, inv.created_at,
    inv.customer->>'name', COALESCE(NULLIF(inv.vehicle->>'license_number',''), NULL),
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
GRANT EXECUTE ON FUNCTION public.invoice_order_ids(jsonb, uuid) TO authenticated;