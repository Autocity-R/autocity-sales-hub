
-- =========================================================
-- Fase 2: RLS + backend-logica multi-vestiging
-- =========================================================

-- 1. Helper: huidige vestiging van gebruiker
CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch FROM public.profiles WHERE id = auth.uid()
$$;

-- =========================================================
-- 2. RLS: weekly_sales
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view weekly sales" ON public.weekly_sales;
CREATE POLICY "Branch-scoped view weekly sales"
  ON public.weekly_sales FOR SELECT
  USING (
    is_admin_or_owner()
    OR branch = current_user_branch()
    OR branch IS NULL
  );

-- =========================================================
-- 3. RLS: sales_targets — voeg branch-view toe voor niet-admins
-- =========================================================
CREATE POLICY "Users can view targets for their branch"
  ON public.sales_targets FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_admin_or_owner()
      OR branch = current_user_branch()
      OR branch IS NULL
    )
  );

-- =========================================================
-- 4. RLS: warranty_claims — branch scope voor niet-admins
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view warranty claims" ON public.warranty_claims;
CREATE POLICY "Branch-scoped view warranty claims"
  ON public.warranty_claims FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_admin_or_owner()
      OR branch = current_user_branch()
      OR branch IS NULL
    )
  );

-- =========================================================
-- 5. RLS: appointments — aflever-afspraken branch-scoped
-- =========================================================
DROP POLICY IF EXISTS "Authorized users can view appointments" ON public.appointments;
CREATE POLICY "Branch-scoped view appointments"
  ON public.appointments FOR SELECT
  USING (
    (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'verkoper'::app_role)
      OR has_role(auth.uid(), 'aftersales_manager'::app_role)
    )
    AND (
      is_admin_or_owner()
      OR type IS DISTINCT FROM 'aflevering'
      OR branch = current_user_branch()
      OR branch IS NULL
    )
  );

-- =========================================================
-- 6. RLS: vehicles — Verkocht B2C branch-scoped (rest ongewijzigd zichtbaar)
-- =========================================================
DROP POLICY IF EXISTS "All authenticated can view vehicles" ON public.vehicles;
CREATE POLICY "Branch-scoped view vehicles"
  ON public.vehicles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_admin_or_owner()
      OR status IS DISTINCT FROM 'verkocht_b2c'
      OR branch = current_user_branch()
      OR branch IS NULL
    )
  );

-- =========================================================
-- 7. weekly_sales: unieke sleutel uitbreiden met branch
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_sales_salesperson_id_week_start_date_key'
  ) THEN
    ALTER TABLE public.weekly_sales
      DROP CONSTRAINT weekly_sales_salesperson_id_week_start_date_key;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'weekly_sales_salesperson_week_branch_key'
  ) THEN
    ALTER TABLE public.weekly_sales
      ADD CONSTRAINT weekly_sales_salesperson_week_branch_key
      UNIQUE (salesperson_id, week_start_date, branch);
  END IF;
END$$;

-- =========================================================
-- 8. update_weekly_sales(): branch-parameter
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_weekly_sales(
  p_salesperson_id uuid,
  p_salesperson_name text,
  p_sales_type text,
  p_branch text DEFAULT 'rotterdam'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  week_start date;
  week_end date;
BEGIN
  week_start := get_week_start_date();
  week_end := week_start + INTERVAL '6 days';

  INSERT INTO weekly_sales (
    salesperson_id,
    salesperson_name,
    week_start_date,
    week_end_date,
    b2b_sales,
    b2c_sales,
    total_sales,
    branch
  )
  VALUES (
    p_salesperson_id,
    p_salesperson_name,
    week_start,
    week_end,
    CASE WHEN p_sales_type = 'b2b' THEN 1 ELSE 0 END,
    CASE WHEN p_sales_type = 'b2c' THEN 1 ELSE 0 END,
    1,
    COALESCE(p_branch, 'rotterdam')
  )
  ON CONFLICT (salesperson_id, week_start_date, branch)
  DO UPDATE SET
    salesperson_name = EXCLUDED.salesperson_name,
    b2b_sales = weekly_sales.b2b_sales + CASE WHEN p_sales_type = 'b2b' THEN 1 ELSE 0 END,
    b2c_sales = weekly_sales.b2c_sales + CASE WHEN p_sales_type = 'b2c' THEN 1 ELSE 0 END,
    total_sales = weekly_sales.total_sales + 1,
    updated_at = now();
END;
$$;

-- =========================================================
-- 9. Verhuis-trigger op vehicles.branch
-- =========================================================
CREATE OR REPLACE FUNCTION public.propagate_vehicle_branch_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch IS DISTINCT FROM OLD.branch THEN
    -- Open taken (niet voltooid/geannuleerd)
    UPDATE public.tasks
       SET branch = NEW.branch,
           updated_at = now()
     WHERE vehicle_id = NEW.id
       AND status NOT IN ('voltooid', 'geannuleerd');

    -- Toekomstige afspraken
    UPDATE public.appointments
       SET branch = NEW.branch,
           updated_at = now()
     WHERE vehicle_id = NEW.id
       AND start_time > now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_vehicle_branch_change ON public.vehicles;
CREATE TRIGGER trg_propagate_vehicle_branch_change
AFTER UPDATE OF branch ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.propagate_vehicle_branch_change();

-- =========================================================
-- 10. Bij verkoop: vehicles.branch overnemen van verkoper
-- =========================================================
CREATE OR REPLACE FUNCTION public.inherit_branch_from_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_branch text;
BEGIN
  IF NEW.status IN ('verkocht_b2b', 'verkocht_b2c')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('verkocht_b2b', 'verkocht_b2c'))
     AND NEW.sold_by_user_id IS NOT NULL
     -- alleen als branch NIET handmatig gewijzigd is in dezelfde update
     AND NEW.branch IS NOT DISTINCT FROM OLD.branch
  THEN
    SELECT branch INTO seller_branch
      FROM public.profiles
     WHERE id = NEW.sold_by_user_id;

    IF seller_branch IS NOT NULL THEN
      NEW.branch := seller_branch;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inherit_branch_from_seller ON public.vehicles;
CREATE TRIGGER trg_inherit_branch_from_seller
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.inherit_branch_from_seller();
