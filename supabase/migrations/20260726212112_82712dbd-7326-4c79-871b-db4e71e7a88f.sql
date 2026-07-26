CREATE POLICY "vi_select_uitvoerders" ON public.vehicle_intakes
FOR SELECT TO authenticated
USING (public.werkplaats_rol() = ANY (ARRAY['monteur','schadeherstel','uitdeuker_extern','poetser']));