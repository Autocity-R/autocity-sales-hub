-- Voeg showroom foto kolommen toe aan vehicles tabel
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS showroom_photo_url TEXT,
ADD COLUMN IF NOT EXISTS showroom_photo_generated_at TIMESTAMPTZ;

-- Maak car-photos storage bucket aan
INSERT INTO storage.buckets (id, name, public) 
VALUES ('car-photos', 'car-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Publieke leestoegang voor car-photos bucket
CREATE POLICY "Public read access for car-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-photos');

-- Authenticated users kunnen uploaden
CREATE POLICY "Authenticated upload to car-photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'car-photos' 
    AND auth.role() = 'authenticated'
  );

-- Service role kan ook uploaden (voor edge functions)
CREATE POLICY "Service role upload to car-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'car-photos');