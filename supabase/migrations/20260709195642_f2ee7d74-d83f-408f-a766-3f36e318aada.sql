
-- ============================================================
-- FASE 1: Multi-vestiging datamodel
-- ============================================================

-- 1. branches tabel
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  company_name text,
  address text,
  postal_code text,
  city text,
  phone text,
  email text,
  kvk_number text,
  btw_number text,
  iban text,
  google_calendar_id text,
  google_auth_email text,
  color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read branches"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/owner can insert branches"
  ON public.branches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admin/owner can update branches"
  ON public.branches FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_owner())
  WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admin/owner can delete branches"
  ON public.branches FOR DELETE
  TO authenticated
  USING (public.is_admin_or_owner());

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed data
INSERT INTO public.branches (code, name, company_name, address, postal_code, city, phone, email, google_calendar_id, google_auth_email, color)
VALUES
  ('rotterdam', 'Rotterdam', 'Auto City B.V.', NULL, NULL, 'Rotterdam', NULL, 'verkoop@auto-city.nl', 'primary', 'verkoop@auto-city.nl', '#3b82f6'),
  ('heerhugowaard', 'Heerhugowaard', 'Autocity Noord Holland B.V.', 'Pascalstraat 25', '1704 RE', 'Heerhugowaard', '072-3036623', NULL, NULL, NULL, '#f59e0b')
ON CONFLICT (code) DO NOTHING;

-- 3. branch kolom toevoegen (text, met FK-achtige check via app-laag; enum vermeden voor flexibiliteit)
ALTER TABLE public.vehicles                  ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.profiles                  ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.appointments              ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.warranty_claims           ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.tasks                     ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.weekly_sales              ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.sales_targets             ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.leads                     ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.contracts                 ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';
ALTER TABLE public.company_calendar_settings ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'rotterdam';

-- Indexes voor filters
CREATE INDEX IF NOT EXISTS idx_vehicles_branch        ON public.vehicles(branch);
CREATE INDEX IF NOT EXISTS idx_profiles_branch        ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS idx_appointments_branch    ON public.appointments(branch);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_branch ON public.warranty_claims(branch);
CREATE INDEX IF NOT EXISTS idx_tasks_branch           ON public.tasks(branch);
CREATE INDEX IF NOT EXISTS idx_weekly_sales_branch    ON public.weekly_sales(branch);
CREATE INDEX IF NOT EXISTS idx_leads_branch           ON public.leads(branch);
CREATE INDEX IF NOT EXISTS idx_contracts_branch       ON public.contracts(branch);

-- Backfill tasks.branch vanuit gekoppelde vehicle waar mogelijk
UPDATE public.tasks t
SET branch = v.branch
FROM public.vehicles v
WHERE t.vehicle_id = v.id
  AND t.branch = 'rotterdam'
  AND v.branch <> 'rotterdam';

-- 4. B2B uitgeleverd-vlag op vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS b2b_delivered boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS b2b_delivered_at timestamptz;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS b2b_delivered_by uuid;

CREATE INDEX IF NOT EXISTS idx_vehicles_b2b_delivered ON public.vehicles(b2b_delivered) WHERE b2b_delivered = true;

-- 5. Audit log uitbreiden met branch-wijziging
ALTER TABLE public.vehicle_status_audit_log ADD COLUMN IF NOT EXISTS old_branch text;
ALTER TABLE public.vehicle_status_audit_log ADD COLUMN IF NOT EXISTS new_branch text;

CREATE OR REPLACE FUNCTION public.log_vehicle_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.location IS DISTINCT FROM NEW.location
     OR OLD.branch IS DISTINCT FROM NEW.branch THEN
    RAISE NOTICE 'Vehicle % status % -> %, location % -> %, branch % -> %',
      NEW.id, OLD.status, NEW.status, OLD.location, NEW.location, OLD.branch, NEW.branch;

    INSERT INTO public.vehicle_status_audit_log (
      vehicle_id, changed_by,
      old_status, new_status,
      old_location, new_location,
      old_branch, new_branch,
      change_metadata
    ) VALUES (
      NEW.id, auth.uid(),
      OLD.status, NEW.status,
      OLD.location, NEW.location,
      OLD.branch, NEW.branch,
      jsonb_build_object(
        'old_selling_price', OLD.selling_price,
        'new_selling_price', NEW.selling_price,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
