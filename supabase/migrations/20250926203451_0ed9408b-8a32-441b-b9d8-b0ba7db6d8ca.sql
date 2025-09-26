-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', false);

-- Create table for vehicle files metadata
CREATE TABLE public.vehicle_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_files ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle files
CREATE POLICY "Users can view vehicle files" 
ON public.vehicle_files 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create vehicle files" 
ON public.vehicle_files 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own vehicle files" 
ON public.vehicle_files 
FOR UPDATE 
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own vehicle files" 
ON public.vehicle_files 
FOR DELETE 
USING (auth.uid() = uploaded_by);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_vehicle_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicle_files_updated_at
BEFORE UPDATE ON public.vehicle_files
FOR EACH ROW
EXECUTE FUNCTION public.update_vehicle_files_updated_at();

-- Create storage policies for vehicle documents
CREATE POLICY "Users can view vehicle documents they have access to" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can upload vehicle documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'vehicle-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own vehicle documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'vehicle-documents' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own vehicle documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'vehicle-documents' AND auth.uid() = owner);