-- Administratie: uitsluitend leesrechten (aanvullende policies, bestaande blijven ongemoeid)

CREATE POLICY "Administratie can view contacts"
ON public.contacts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administratie'));

CREATE POLICY "Administratie can view workshop invoices"
ON public.workshop_invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administratie'));

CREATE POLICY "Administratie can view work orders"
ON public.work_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administratie'));

CREATE POLICY "Administratie can view vehicle files"
ON public.vehicle_files FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administratie'));

CREATE POLICY "Administratie can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administratie'));