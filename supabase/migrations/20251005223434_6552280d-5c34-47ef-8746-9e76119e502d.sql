-- Fase 1.3: Lead Temperature Classificatie
-- Voeg intelligente lead scoring toe voor automatische prioritering

-- Add lead temperature and type columns
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_temperature TEXT 
CHECK (lead_temperature IN ('hot', 'warm', 'cold', 'ice'));

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS lead_type TEXT;

-- Index voor snelle filtering op temperature
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(lead_temperature);

-- Comments voor documentatie
COMMENT ON COLUMN leads.lead_temperature IS 'hot=Financial/Proefrit, warm=Vraag, cold=Gemiste oproep, ice=Genegeerd';
COMMENT ON COLUMN leads.lead_type IS 'Specifieke classificatie: financial_approved, test_drive_request, trade_in_request, etc.';