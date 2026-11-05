DROP FUNCTION IF EXISTS public.leenauto_innemen(uuid, timestamptz, text);
CREATE OR REPLACE FUNCTION public.leenauto_innemen(p_uitlening_id uuid, p_ingeleverd_op timestamp with time zone DEFAULT now(), p_notities text DEFAULT NULL::text, p_warranty_claim_id uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_u public.leenauto_uitleningen%rowtype;
begin
  if not public.leenauto_mag_schrijven() then
    raise exception 'Je hebt geen rechten om leenauto''s in te nemen';
  end if;
  select * into v_u from public.leenauto_uitleningen where id = p_uitlening_id for update;
  if not found then raise exception 'Uitlening niet gevonden'; end if;
  if p_warranty_claim_id is not null and v_u.warranty_claim_id is distinct from p_warranty_claim_id then
    raise exception 'Deze uitlening hoort bij een andere claim';
  end if;
  if v_u.ingeleverd_op is not null then raise exception 'Deze uitlening is al afgesloten'; end if;
  if p_ingeleverd_op is null or p_ingeleverd_op < v_u.uitgeleend_op then
    raise exception 'Inlevermoment kan niet vóór het uitgiftemoment liggen';
  end if;
  update public.leenauto_uitleningen set ingeleverd_op = p_ingeleverd_op, ingenomen_door = auth.uid(),
    notities = case when nullif(trim(p_notities),'') is null then notities
                    else concat_ws(E'\n', notities, 'Inname: ' || trim(p_notities)) end
  where id = p_uitlening_id;
  update public.loan_cars set status = 'beschikbaar', customer_id = null, start_date = null, end_date = null, updated_at = now()
  where id = v_u.loan_car_id
    and not exists (select 1 from public.leenauto_uitleningen o where o.loan_car_id = v_u.loan_car_id and o.ingeleverd_op is null);
end $function$;
REVOKE ALL ON FUNCTION public.leenauto_innemen(uuid, timestamptz, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leenauto_innemen(uuid, timestamptz, text, uuid) TO authenticated, service_role;