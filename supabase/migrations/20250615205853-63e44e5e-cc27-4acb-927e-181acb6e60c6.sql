
-- 1. Contacts Table
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('supplier', 'b2b', 'b2c')),
  company_name text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address_street text,
  address_city text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Vehicles Table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  color text,
  license_number text,
  vin text,
  mileage integer,
  status text NOT NULL DEFAULT 'voorraad',
  location text,
  selling_price numeric,
  customer_id uuid REFERENCES contacts(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Leads Table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL,
  priority text NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  interested_vehicle uuid REFERENCES vehicles(id),
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Contracts Table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  type text NOT NULL CHECK (type IN ('b2b', 'b2c')),
  status text NOT NULL,
  customer_id uuid REFERENCES contacts(id),
  vehicle_id uuid REFERENCES vehicles(id),
  contract_amount numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Warranty Claims Table
CREATE TABLE public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  claim_status text NOT NULL DEFAULT 'pending',
  description text,
  claim_amount numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Loan Cars Table
CREATE TABLE public.loan_cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id),
  customer_id uuid REFERENCES contacts(id),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status text NOT NULL DEFAULT 'uitgeleend',
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Minimal RLS Policies (future user-based security, currently open for admin/agent use)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_cars ENABLE ROW LEVEL SECURITY;

-- Open policies (replace later for per-user access)
CREATE POLICY "Allow all for now" ON public.contacts FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.vehicles FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.leads FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.contracts FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.warranty_claims FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.loan_cars FOR ALL USING (true);

-- Automatic 'updated_at' on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_warranty_claims_updated_at BEFORE UPDATE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_loan_cars_updated_at BEFORE UPDATE ON public.loan_cars FOR EACH ROW EXECUTE FUNCTION set_updated_at();
