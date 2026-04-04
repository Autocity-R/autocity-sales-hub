
-- Stap 1: Nieuwe kolommen toevoegen
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS aangekomen_at timestamptz;

ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES contacts(id);

-- Stap 2: Trigger functie vervangen met uitgebreide logica
CREATE OR REPLACE FUNCTION update_vehicle_import_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Alleen uitvoeren als import_status daadwerkelijk is gewijzigd
  IF OLD.import_status IS DISTINCT FROM NEW.import_status THEN
    -- Altijd import_updated_at en updated_at bijwerken
    NEW.import_updated_at = now();
    NEW.updated_at = now();
    
    -- Losse timestamp-velden vullen op basis van nieuwe status
    CASE NEW.import_status
      WHEN 'aanvraag_ontvangen' THEN
        NEW.aanvraag_ontvangen_at = now();
      WHEN 'aangekomen' THEN
        NEW.aangekomen_at = now();
      WHEN 'goedgekeurd' THEN
        NEW.goedgekeurd_at = now();
      WHEN 'bpm_betaald' THEN
        NEW.bpm_betaald_at = now();
      WHEN 'ingeschreven' THEN
        NEW.ingeschreven_at = now();
      ELSE
        -- Geen extra timestamp voor andere statussen
        NULL;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
