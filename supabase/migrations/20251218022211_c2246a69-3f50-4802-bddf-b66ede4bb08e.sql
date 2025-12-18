-- Fix bestaande data: zet papersReceived op true voor auto's met goedgekeurd/bpm_betaald/ingeschreven status
UPDATE vehicles
SET details = details || '{"papersReceived": true}'::jsonb
WHERE import_status IN ('goedgekeurd', 'bpm_betaald', 'ingeschreven')
  AND (details->>'papersReceived' IS NULL OR (details->>'papersReceived')::boolean = false);

-- Maak trigger functie die papersReceived automatisch op true zet bij status wijziging
CREATE OR REPLACE FUNCTION public.auto_set_papers_received_on_import_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Als import_status wijzigt naar goedgekeurd, bpm_betaald of ingeschreven
  -- dan hebben we de papieren ontvangen (anders kan dit niet)
  IF NEW.import_status IN ('goedgekeurd', 'bpm_betaald', 'ingeschreven') 
     AND (OLD.import_status IS NULL OR OLD.import_status NOT IN ('goedgekeurd', 'bpm_betaald', 'ingeschreven')) THEN
    NEW.details = NEW.details || '{"papersReceived": true}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Maak de trigger aan
DROP TRIGGER IF EXISTS auto_papers_received_trigger ON vehicles;
CREATE TRIGGER auto_papers_received_trigger
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_papers_received_on_import_status();