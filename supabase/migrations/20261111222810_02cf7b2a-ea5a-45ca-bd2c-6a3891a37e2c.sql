-- Inkoper erft alle verkoper-rechten: has_role(uid,'verkoper') is ook waar voor inkopers.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (_role = 'verkoper'::app_role AND role = 'inkoper'::app_role))
  )
$function$;

-- werkplaats_rol(): inkoper gedraagt zich als verkoper in werkplaats-/onderdelen-policies.
CREATE OR REPLACE FUNCTION public.werkplaats_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select coalesce((select case when role::text = 'inkoper' then 'verkoper' else role::text end from public.user_roles where user_id = auth.uid() limit 1), '') $function$;

CREATE OR REPLACE FUNCTION public.leenauto_mag_lezen()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','administratie','aftersales_manager','werkplaats_chef','operationeel_directeur','verkoper','inkoper','operationeel'))
$function$;

CREATE OR REPLACE FUNCTION public.leenauto_mag_schrijven()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','aftersales_manager','werkplaats_chef','verkoper','inkoper','operationeel','operationeel_directeur'))
$function$;

-- Verkopersteam-rollen zichtbaar houden (dropdowns met verkopers).
DROP POLICY IF EXISTS "Users can view sales team roles" ON public.user_roles;
CREATE POLICY "Users can view sales team roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR is_admin_or_owner()
    OR (role = ANY (ARRAY['verkoper'::app_role, 'inkoper'::app_role, 'admin'::app_role, 'owner'::app_role])));

-- Alexander Kool: verkoper -> inkoper.
UPDATE public.user_roles SET role = 'inkoper'::app_role
 WHERE user_id = '3be626db-ad93-4236-9e9f-e0ab14690f42' AND role = 'verkoper'::app_role;