-- ============================================================================
-- FASE 1: ONLINE_SINCE_DATE KOLOM + BACKFILL + TRIGGERS
-- ============================================================================

-- STAP 1: Voeg online_since_date kolom toe aan vehicles tabel
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS online_since_date timestamp with time zone;

-- Commentaar voor duidelijkheid
COMMENT ON COLUMN vehicles.online_since_date IS 'Datum waarop auto online is gezet via showroomOnline=true. Stadagen = NOW() - online_since_date';

-- STAP 2: Backfill online_since_date voor auto's die NU online staan (showroomOnline=true)
UPDATE vehicles
SET online_since_date = COALESCE(
  import_updated_at,  -- Probeer eerst import_updated_at (moment van status update)
  created_at          -- Fallback naar created_at
)
WHERE status = 'voorraad' 
  AND (details->>'showroomOnline')::boolean = true
  AND online_since_date IS NULL;

-- STAP 3: Trigger om online_since_date te zetten wanneer showroomOnline naar true gaat
CREATE OR REPLACE FUNCTION set_online_since_date_on_showroom_toggle()
RETURNS TRIGGER AS $$
BEGIN
  -- Als showroomOnline verandert van false/null naar true
  IF (NEW.details->>'showroomOnline')::boolean = true 
     AND (OLD.details->>'showroomOnline' IS NULL OR (OLD.details->>'showroomOnline')::boolean = false) THEN
    -- Alleen zetten als nog niet gezet (of als het NULL is)
    IF NEW.online_since_date IS NULL THEN
      NEW.online_since_date = NOW();
    END IF;
  END IF;
  
  -- NIET resetten als auto offline gaat - behoud historische data
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger als hij al bestaat (voor idempotency)
DROP TRIGGER IF EXISTS vehicle_online_date_tracker ON vehicles;

-- Maak trigger aan
CREATE TRIGGER vehicle_online_date_tracker
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION set_online_since_date_on_showroom_toggle();