-- Clean up duplicate records in jpcars_voorraad_monitor (keep newest per license_plate per sync date)
DELETE FROM jpcars_voorraad_monitor a
USING jpcars_voorraad_monitor b
WHERE a.ctid < b.ctid
  AND a.license_plate = b.license_plate
  AND a.synced_at::date = b.synced_at::date;

-- Add unique constraint to prevent future duplicates
ALTER TABLE jpcars_voorraad_monitor ADD CONSTRAINT unique_license_plate_sync_date UNIQUE (license_plate, synced_at);