-- Competitor Dealers tabel
CREATE TABLE public.competitor_dealers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT,
  scrape_url TEXT NOT NULL,
  scrape_schedule TEXT NOT NULL DEFAULT 'daily',
  scrape_time TIME NOT NULL DEFAULT '10:00:00',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  last_scrape_status TEXT DEFAULT 'pending',
  last_scrape_vehicles_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Competitor Vehicles tabel (kern van het systeem)
CREATE TABLE public.competitor_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.competitor_dealers(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  external_url TEXT,
  license_plate TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  build_year INTEGER,
  mileage INTEGER,
  mileage_bucket INTEGER,
  price NUMERIC,
  fuel_type TEXT,
  transmission TEXT,
  body_type TEXT,
  color TEXT,
  image_url TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_stock',
  consecutive_missing_scrapes INTEGER NOT NULL DEFAULT 0,
  total_stock_days INTEGER NOT NULL DEFAULT 0,
  reappeared_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, fingerprint)
);

-- Competitor Price History tabel
CREATE TABLE public.competitor_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.competitor_vehicles(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC,
  price_change NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Competitor Scrape Logs tabel
CREATE TABLE public.competitor_scrape_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.competitor_dealers(id) ON DELETE CASCADE,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  vehicles_found INTEGER DEFAULT 0,
  vehicles_new INTEGER DEFAULT 0,
  vehicles_sold INTEGER DEFAULT 0,
  vehicles_reappeared INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

-- Indexes voor performance
CREATE INDEX idx_competitor_vehicles_dealer_id ON public.competitor_vehicles(dealer_id);
CREATE INDEX idx_competitor_vehicles_status ON public.competitor_vehicles(status);
CREATE INDEX idx_competitor_vehicles_fingerprint ON public.competitor_vehicles(fingerprint);
CREATE INDEX idx_competitor_vehicles_sold_at ON public.competitor_vehicles(sold_at);
CREATE INDEX idx_competitor_price_history_vehicle_id ON public.competitor_price_history(vehicle_id);
CREATE INDEX idx_competitor_scrape_logs_dealer_id ON public.competitor_scrape_logs(dealer_id);

-- Enable RLS
ALTER TABLE public.competitor_dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_scrape_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor competitor_dealers
CREATE POLICY "Authorized users can view competitor dealers"
ON public.competitor_dealers FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "Admins can manage competitor dealers"
ON public.competitor_dealers FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role)
);

-- RLS Policies voor competitor_vehicles
CREATE POLICY "Authorized users can view competitor vehicles"
ON public.competitor_vehicles FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "System can manage competitor vehicles"
ON public.competitor_vehicles FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies voor competitor_price_history
CREATE POLICY "Authorized users can view price history"
ON public.competitor_price_history FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'verkoper'::app_role)
);

CREATE POLICY "System can insert price history"
ON public.competitor_price_history FOR INSERT
WITH CHECK (true);

-- RLS Policies voor competitor_scrape_logs
CREATE POLICY "Authorized users can view scrape logs"
ON public.competitor_scrape_logs FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "System can manage scrape logs"
ON public.competitor_scrape_logs FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger voor updated_at
CREATE TRIGGER update_competitor_dealers_updated_at
  BEFORE UPDATE ON public.competitor_dealers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_competitor_vehicles_updated_at
  BEFORE UPDATE ON public.competitor_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();