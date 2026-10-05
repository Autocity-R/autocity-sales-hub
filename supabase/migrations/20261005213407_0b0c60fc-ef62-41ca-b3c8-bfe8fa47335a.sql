ALTER TABLE public.loan_cars ADD COLUMN IF NOT EXISTS bron text NOT NULL DEFAULT 'eigen',
  ADD COLUMN IF NOT EXISTS actief boolean NOT NULL DEFAULT true;
DO $$ BEGIN
  ALTER TABLE public.loan_cars ADD CONSTRAINT loan_cars_bron_check CHECK (bron IN ('eigen','voorraad'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.leenauto_mag_beheren()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','aftersales_manager','operationeel_directeur'))
$$;

CREATE OR REPLACE FUNCTION public.leenauto_toevoegen(p_brand text DEFAULT NULL, p_model text DEFAULT NULL, p_kenteken text DEFAULT NULL, p_vehicle_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_vid uuid; v_id uuid; v_k text;
begin
  if not public.leenauto_mag_beheren() then raise exception 'Je hebt geen rechten om leenauto''s toe te voegen'; end if;
  if p_vehicle_id is not null then
    if not exists (select 1 from public.vehicles where id = p_vehicle_id) then raise exception 'Voertuig niet gevonden'; end if;
    select id into v_id from public.loan_cars where vehicle_id = p_vehicle_id limit 1;
    if v_id is not null then
      if exists (select 1 from public.loan_cars where id = v_id and actief) then raise exception 'Deze auto staat al als leenauto in de lijst'; end if;
      update public.loan_cars set actief = true, status = 'beschikbaar', customer_id = null, start_date = null, end_date = null, updated_at = now() where id = v_id;
      return v_id;
    end if;
    insert into public.loan_cars(vehicle_id, status, bron) values (p_vehicle_id, 'beschikbaar', 'voorraad') returning id into v_id;
    return v_id;
  end if;
  if nullif(trim(p_brand),'') is null or nullif(trim(p_model),'') is null or nullif(trim(p_kenteken),'') is null then
    raise exception 'Merk, model en kenteken zijn verplicht';
  end if;
  v_k := trim(both '-' from regexp_replace(regexp_replace(upper(trim(p_kenteken)), '[^A-Z0-9-]', '-', 'g'), '-+', '-', 'g'));
  insert into public.vehicles(brand, model, license_number, status, details)
    values (trim(p_brand), trim(p_model), v_k, 'leenauto', jsonb_build_object('isLoanCar', true)) returning id into v_vid;
  insert into public.loan_cars(vehicle_id, status, bron) values (v_vid, 'beschikbaar', 'eigen') returning id into v_id;
  return v_id;
end $$;

CREATE OR REPLACE FUNCTION public.leenauto_bijwerken(p_loan_car_id uuid, p_brand text, p_model text, p_kenteken text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v public.loan_cars%rowtype;
begin
  if not public.leenauto_mag_beheren() then raise exception 'Je hebt geen rechten om leenauto''s te bewerken'; end if;
  select * into v from public.loan_cars where id = p_loan_car_id;
  if not found then raise exception 'Leenauto niet gevonden'; end if;
  if v.bron <> 'eigen' then raise exception 'Een voorraadauto bewerk je in de voorraad, niet hier'; end if;
  update public.vehicles set brand = trim(p_brand), model = trim(p_model),
    license_number = trim(both '-' from regexp_replace(regexp_replace(upper(trim(p_kenteken)), '[^A-Z0-9-]', '-', 'g'), '-+', '-', 'g'))
  where id = v.vehicle_id;
end $$;

CREATE OR REPLACE FUNCTION public.leenauto_deactiveren(p_loan_car_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.leenauto_mag_beheren() then raise exception 'Je hebt geen rechten om leenauto''s te beheren'; end if;
  if exists (select 1 from public.leenauto_uitleningen where loan_car_id = p_loan_car_id and ingeleverd_op is null) then
    raise exception 'Deze leenauto is nog uitgeleend. Neem hem eerst in.';
  end if;
  update public.loan_cars set actief = false, status = 'beschikbaar', customer_id = null, start_date = null, end_date = null, updated_at = now()
  where id = p_loan_car_id;
  if not found then raise exception 'Leenauto niet gevonden'; end if;
end $$;

CREATE OR REPLACE FUNCTION public.leenauto_guard_actief()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if exists (select 1 from public.loan_cars where id = NEW.loan_car_id and not actief) then
    raise exception 'Deze auto wordt niet meer als leenauto gebruikt';
  end if;
  return NEW;
end $$;
DROP TRIGGER IF EXISTS trg_leenauto_guard_actief ON public.leenauto_uitleningen;
CREATE TRIGGER trg_leenauto_guard_actief BEFORE INSERT ON public.leenauto_uitleningen
  FOR EACH ROW EXECUTE FUNCTION public.leenauto_guard_actief();

CREATE OR REPLACE FUNCTION public.leenauto_klant_zoeken(p_q text)
RETURNS TABLE(contact_id uuid, naam text, telefoon text, email text, adres text, postcode text, plaats text, autos text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare v_q text := trim(coalesce(p_q,'')); v_s text; v_like text;
begin
  if not public.leenauto_mag_schrijven() then raise exception 'Je hebt geen rechten om klanten te zoeken'; end if;
  if length(v_q) < 2 then return; end if;
  v_s := regexp_replace(lower(v_q), '[^a-z0-9]', '', 'g');
  v_like := '%' || replace(replace(v_q, '%', ''), '_', '') || '%';
  return query
  with veh as (
    select v.id, v.customer_id, v.brand, v.model, v.license_number, v.vin
    from public.vehicles v
    where (v_s <> '' and length(v_s) >= 3 and (regexp_replace(lower(coalesce(v.license_number,'')), '[^a-z0-9]', '', 'g') like '%'||v_s||'%'
            or lower(coalesce(v.vin,'')) like '%'||v_s||'%'))
       or (coalesce(v.brand,'') || ' ' || coalesce(v.model,'')) ilike v_like
    limit 300
  ),
  c_hits as (
    select c.id from public.contacts c
    where c.first_name ilike v_like or c.last_name ilike v_like or (c.first_name||' '||c.last_name) ilike v_like
      or c.company_name ilike v_like or c.email ilike v_like
      or (v_s <> '' and regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') like '%'||regexp_replace(v_q, '[^0-9]', '', 'g')||'%' and length(regexp_replace(v_q, '[^0-9]', '', 'g')) >= 4)
    union select customer_id from veh where customer_id is not null
    limit 15
  )
  select c.id,
    coalesce(nullif(trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')),''), c.company_name),
    c.phone, nullif(c.email,''),
    nullif(trim(coalesce(c.address_street,'')||' '||coalesce(c.address_number,'')),''), c.address_postal_code, c.address_city,
    coalesce((select array_agg(distinct 'Kocht: '||trim(coalesce(v2.brand,'')||' '||coalesce(v2.model,''))||' '||coalesce(v2.license_number,''))
      from public.vehicles v2 where v2.customer_id = c.id and v2.status in ('afgeleverd','verkocht_b2c','verkocht_b2b')), '{}')
    || coalesce((select array_agg(distinct 'Werkplaats: '||trim(coalesce(v3.brand,'')||' '||coalesce(v3.model,''))||' '||coalesce(v3.license_number,''))
      from public.work_orders w join public.vehicles v3 on v3.id = w.vehicle_id
      where (w.external_customer->>'customer_id')::text = c.id::text), '{}')
  from public.contacts c where c.id in (select id from c_hits)
  union all
  select null::uuid, w.external_customer->>'name', w.external_customer->>'phone', w.external_customer->>'email', null, null, null,
    array['Werkplaats: '||trim(coalesce(v.brand,'')||' '||coalesce(v.model,''))||' '||coalesce(v.license_number,'')]
  from public.work_orders w join veh v on v.id = w.vehicle_id
  where w.external_customer is not null and nullif(w.external_customer->>'customer_id','') is null
    and nullif(w.external_customer->>'name','') is not null
  limit 20;
end $$;

CREATE OR REPLACE FUNCTION public.leenauto_klant_opslaan(p_naam text, p_telefoon text DEFAULT NULL, p_email text DEFAULT NULL,
  p_adres text DEFAULT NULL, p_postcode text DEFAULT NULL, p_plaats text DEFAULT NULL, p_bedrijf text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare v_id uuid; v_n text := trim(coalesce(p_naam,'')); v_first text; v_last text;
begin
  if not public.leenauto_mag_schrijven() then raise exception 'Je hebt geen rechten om klanten op te slaan'; end if;
  if v_n = '' then raise exception 'Naam van de klant is verplicht'; end if;
  if nullif(trim(p_telefoon),'') is null and nullif(trim(p_email),'') is null then raise exception 'Telefoon of e-mail van de klant is verplicht'; end if;
  v_first := split_part(v_n, ' ', 1);
  v_last := trim(substr(v_n, length(v_first) + 1));
  insert into public.contacts(type, company_name, first_name, last_name, email, phone, address_street, address_postal_code, address_city)
  values (case when nullif(trim(p_bedrijf),'') is null then 'b2c' else 'b2b' end, nullif(trim(p_bedrijf),''),
    v_first, v_last, coalesce(nullif(trim(p_email),''), ''), nullif(trim(p_telefoon),''),
    nullif(trim(p_adres),''), nullif(trim(p_postcode),''), nullif(trim(p_plaats),''))
  returning id into v_id;
  return v_id;
end $$;

REVOKE EXECUTE ON FUNCTION public.leenauto_mag_beheren(), public.leenauto_toevoegen(text,text,text,uuid), public.leenauto_bijwerken(uuid,text,text,text),
  public.leenauto_deactiveren(uuid), public.leenauto_klant_zoeken(text), public.leenauto_klant_opslaan(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leenauto_mag_beheren(), public.leenauto_toevoegen(text,text,text,uuid), public.leenauto_bijwerken(uuid,text,text,text),
  public.leenauto_deactiveren(uuid), public.leenauto_klant_zoeken(text), public.leenauto_klant_opslaan(text,text,text,text,text,text,text) TO authenticated;