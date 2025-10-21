-- Step 1: Update DELETE policy on vehicles table to allow manager and verkoper
DROP POLICY IF EXISTS "Only admins can delete vehicles" ON vehicles;
DROP POLICY IF EXISTS "Authorized users can delete vehicles" ON vehicles;

CREATE POLICY "Authorized users can delete vehicles" 
ON vehicles
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'owner'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'verkoper'::app_role)
);

COMMENT ON POLICY "Authorized users can delete vehicles" ON vehicles IS 
'Admin, owner, manager en verkoper kunnen voertuigen verwijderen. Operationele medewerkers niet.';

-- Step 2: Create cleanup function for vehicle-related data
CREATE OR REPLACE FUNCTION cleanup_vehicle_related_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log de verwijdering voor audit trail
  RAISE NOTICE 'Cleaning up data for deleted vehicle: % (% %)', OLD.id, OLD.brand, OLD.model;
  
  -- Verwijder gerelateerde records (in volgorde om foreign key issues te voorkomen)
  
  -- 1. Email gerelateerd
  DELETE FROM email_sent_log WHERE vehicle_id = OLD.id;
  DELETE FROM email_queue WHERE vehicle_id = OLD.id;
  DELETE FROM email_reminders WHERE vehicle_id = OLD.id;
  
  -- 2. Files (database records - storage files moeten apart via API)
  DELETE FROM vehicle_files WHERE vehicle_id = OLD.id;
  
  -- 3. Audit logs blijven bewaard voor compliance (niet verwijderen)
  -- We bewaren deze voor financiële rapportage en compliance
  
  -- 4. Warranty claims
  DELETE FROM warranty_claims WHERE vehicle_id = OLD.id;
  
  -- 5. Loan cars
  DELETE FROM loan_cars WHERE vehicle_id = OLD.id;
  
  -- 6. Tasks - SET NULL ipv DELETE (taken blijven bestaan maar zonder vehicle)
  UPDATE tasks 
  SET 
    vehicle_id = NULL,
    vehicle_brand = NULL,
    vehicle_model = NULL,
    vehicle_vin = NULL,
    vehicle_license_number = NULL,
    notes = COALESCE(notes || E'\n', '') || '[Voertuig ' || OLD.brand || ' ' || OLD.model || ' (kenteken: ' || COALESCE(OLD.license_number, 'onbekend') || ') verwijderd op ' || NOW()::date || ']'
  WHERE vehicle_id = OLD.id;
  
  -- 7. Contracts - verwijderen
  DELETE FROM contracts WHERE vehicle_id = OLD.id;
  
  -- 8. Leads - SET NULL ipv DELETE (leads blijven maar zonder vehicle reference)
  UPDATE leads 
  SET interested_vehicle = NULL 
  WHERE interested_vehicle = OLD.id;
  
  -- 9. Import logs - verwijderen
  DELETE FROM vehicle_import_logs WHERE vehicle_id = OLD.id;
  
  RAISE NOTICE 'Successfully cleaned up all related data for vehicle %', OLD.id;
  
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION cleanup_vehicle_related_data() IS 
'Ruimt automatisch alle gerelateerde data op wanneer een voertuig wordt verwijderd. Audit logs worden bewaard voor compliance. Tasks en leads blijven bestaan met notitie.';

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cleanup_vehicle_data ON vehicles;

CREATE TRIGGER trigger_cleanup_vehicle_data
  BEFORE DELETE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_vehicle_related_data();

COMMENT ON TRIGGER trigger_cleanup_vehicle_data ON vehicles IS 
'Trigger die automatisch gerelateerde data opruimt bij het verwijderen van een voertuig';