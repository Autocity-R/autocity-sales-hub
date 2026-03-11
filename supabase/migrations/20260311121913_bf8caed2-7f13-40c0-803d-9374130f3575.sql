CREATE TABLE vehicle_showroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  shot_angle TEXT NOT NULL,
  photo_index INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, photo_index)
);

ALTER TABLE vehicle_showroom_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view showroom photos"
  ON vehicle_showroom_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert showroom photos"
  ON vehicle_showroom_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update showroom photos"
  ON vehicle_showroom_photos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete showroom photos"
  ON vehicle_showroom_photos FOR DELETE
  TO authenticated
  USING (true);