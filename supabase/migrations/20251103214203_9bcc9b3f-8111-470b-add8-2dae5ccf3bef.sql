-- Voeg transporter_id kolom toe aan vehicles tabel
ALTER TABLE vehicles 
ADD COLUMN transporter_id uuid REFERENCES contacts(id);

-- Voeg index toe voor snellere queries
CREATE INDEX idx_vehicles_transporter_id ON vehicles(transporter_id);

-- Voeg comment toe voor documentatie
COMMENT ON COLUMN vehicles.transporter_id IS 'Contact ID van de transporteur die het voertuig vervoert';