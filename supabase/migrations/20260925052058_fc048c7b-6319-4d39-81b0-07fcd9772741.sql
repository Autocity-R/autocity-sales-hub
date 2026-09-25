create extension if not exists btree_gist with schema extensions;

create table public.leenauto_uitleningen (
  id uuid primary key default gen_random_uuid(),
  loan_car_id uuid not null references public.loan_cars(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  klant_naam text not null,
  klant_telefoon text,
  klant_email text,
  klant_adres text,
  klant_postcode text,
  klant_plaats text,
  warranty_claim_id uuid references public.warranty_claims(id) on delete set null,
  reden text not null default 'overig' check (reden in ('garantie','werkplaats','personeel','overig')),
  uitgeleend_op timestamptz not null,
  verwacht_terug_op timestamptz,
  ingeleverd_op timestamptz,
  uitgeleend_door uuid default auth.uid(),
  ingenomen_door uuid,
  notities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leenauto_inleveren_na_uitgifte check (ingeleverd_op is null or ingeleverd_op >= uitgeleend_op),
  constraint leenauto_geen_overlap exclude using gist (
    loan_car_id with =,
    tstzrange(uitgeleend_op, coalesce(ingeleverd_op, 'infinity'::timestamptz), '[)') with &&
  )
);
create index leenauto_uitleningen_car_idx on public.leenauto_uitleningen(loan_car_id, uitgeleend_op desc);
create index leenauto_uitleningen_claim_idx on public.leenauto_uitleningen(warranty_claim_id);

grant select, delete on public.leenauto_uitleningen to authenticated;
grant all on public.leenauto_uitleningen to service_role;
alter table public.leenauto_uitleningen enable row level security;

create table public.leenauto_uitlening_wijzigingen (
  id uuid primary key default gen_random_uuid(),
  uitlening_id uuid not null,
  actie text not null,
  gewijzigd_door uuid default auth.uid(),
  gewijzigd_op timestamptz not null default now(),
  oude_waarden jsonb,
  nieuwe_waarden jsonb
);
create index leenauto_wijz_uitlening_idx on public.leenauto_uitlening_wijzigingen(uitlening_id);
grant select on public.leenauto_uitlening_wijzigingen to authenticated;
grant all on public.leenauto_uitlening_wijzigingen to service_role;
alter table public.leenauto_uitlening_wijzigingen enable row level security;

-- Rolhelpers
create or replace function public.leenauto_mag_lezen() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','administratie','aftersales_manager','werkplaats_chef','operationeel_directeur','verkoper','operationeel'))
$$;
create or replace function public.leenauto_mag_schrijven() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','aftersales_manager','werkplaats_chef','verkoper','operationeel'))
$$;
grant execute on function public.leenauto_mag_lezen() to authenticated;
grant execute on function public.leenauto_mag_schrijven() to authenticated;

create policy "Leenauto uitleningen lezen" on public.leenauto_uitleningen
  for select to authenticated using (public.leenauto_mag_lezen());
create policy "Leenauto uitleningen verwijderen owner/admin" on public.leenauto_uitleningen
  for delete to authenticated using (public.has_role(auth.uid(),'owner') or public.has_role(auth.uid(),'admin'));
create policy "Leenauto wijzigingen lezen" on public.leenauto_uitlening_wijzigingen
  for select to authenticated using (public.leenauto_mag_lezen());

create trigger leenauto_uitleningen_updated_at before update on public.leenauto_uitleningen
  for each row execute function public.update_updated_at_column();

create or replace function public.leenauto_uitlening_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.leenauto_uitlening_wijzigingen(uitlening_id, actie, oude_waarden, nieuwe_waarden)
    values (old.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.leenauto_uitlening_wijzigingen(uitlening_id, actie, oude_waarden, nieuwe_waarden)
    values (old.id, 'DELETE', to_jsonb(old), null);
    return old;
  end if;
end $$;
revoke execute on function public.leenauto_uitlening_audit() from public, anon, authenticated;
create trigger leenauto_uitleningen_audit after update or delete on public.leenauto_uitleningen
  for each row execute function public.leenauto_uitlening_audit();

-- Uitlenen
create or replace function public.leenauto_uitlenen(
  p_loan_car_id uuid,
  p_contact_id uuid default null,
  p_klant_naam text default null,
  p_klant_telefoon text default null,
  p_klant_email text default null,
  p_klant_adres text default null,
  p_klant_postcode text default null,
  p_klant_plaats text default null,
  p_warranty_claim_id uuid default null,
  p_reden text default 'overig',
  p_uitgeleend_op timestamptz default now(),
  p_verwacht_terug_op timestamptz default null,
  p_notities text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_car public.loan_cars%rowtype;
  v_c public.contacts%rowtype;
  v_naam text := nullif(trim(p_klant_naam),'');
  v_tel text := nullif(trim(p_klant_telefoon),'');
  v_mail text := nullif(trim(p_klant_email),'');
  v_adres text := nullif(trim(p_klant_adres),'');
  v_pc text := nullif(trim(p_klant_postcode),'');
  v_plaats text := nullif(trim(p_klant_plaats),'');
  v_id uuid;
  v_open record;
begin
  if not public.leenauto_mag_schrijven() then
    raise exception 'Je hebt geen rechten om leenauto''s uit te lenen';
  end if;
  select * into v_car from public.loan_cars where id = p_loan_car_id for update;
  if not found then raise exception 'Leenauto niet gevonden'; end if;

  if p_contact_id is not null then
    select * into v_c from public.contacts where id = p_contact_id;
    if found then
      v_naam := coalesce(v_naam, nullif(trim(coalesce(v_c.first_name,'') || ' ' || coalesce(v_c.last_name,'')),''), nullif(v_c.company_name,''));
      v_tel := coalesce(v_tel, nullif(v_c.phone,''));
      v_mail := coalesce(v_mail, nullif(v_c.email,''));
      v_adres := coalesce(v_adres, nullif(trim(coalesce(v_c.address_street,'') || ' ' || coalesce(v_c.address_number,'')),''));
      v_pc := coalesce(v_pc, nullif(v_c.address_postal_code,''));
      v_plaats := coalesce(v_plaats, nullif(v_c.address_city,''));
    end if;
  end if;

  if v_naam is null then raise exception 'Naam van de klant is verplicht'; end if;
  if v_tel is null and v_mail is null then raise exception 'Telefoon of e-mail van de klant is verplicht'; end if;
  if p_uitgeleend_op is null then raise exception 'Uitgiftemoment is verplicht'; end if;
  if p_verwacht_terug_op is not null and p_verwacht_terug_op < p_uitgeleend_op then
    raise exception 'Verwachte terugkomst ligt vóór het uitgiftemoment';
  end if;
  if coalesce(p_reden,'') not in ('garantie','werkplaats','personeel','overig') then
    raise exception 'Ongeldige reden';
  end if;

  select u.klant_naam, u.uitgeleend_op into v_open from public.leenauto_uitleningen u
    where u.loan_car_id = p_loan_car_id and u.ingeleverd_op is null limit 1;
  if found then
    raise exception 'Deze leenauto is al uitgeleend aan % sinds %. Neem hem eerst in.',
      v_open.klant_naam, to_char(v_open.uitgeleend_op at time zone 'Europe/Amsterdam','DD-MM-YYYY HH24:MI');
  end if;

  begin
    insert into public.leenauto_uitleningen(loan_car_id, vehicle_id, contact_id, klant_naam, klant_telefoon, klant_email,
      klant_adres, klant_postcode, klant_plaats, warranty_claim_id, reden, uitgeleend_op, verwacht_terug_op, notities, uitgeleend_door)
    values (p_loan_car_id, v_car.vehicle_id, p_contact_id, v_naam, v_tel, v_mail, v_adres, v_pc, v_plaats,
      p_warranty_claim_id, p_reden, p_uitgeleend_op, p_verwacht_terug_op, nullif(trim(p_notities),''), auth.uid())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Deze leenauto was in die periode al aan iemand anders uitgeleend';
  end;

  update public.loan_cars set status = 'uitgeleend', customer_id = p_contact_id,
    start_date = p_uitgeleend_op, end_date = p_verwacht_terug_op, updated_at = now()
  where id = p_loan_car_id;

  if p_warranty_claim_id is not null then
    update public.warranty_claims set loan_car_id = p_loan_car_id, loan_car_assigned = true, updated_at = now()
    where id = p_warranty_claim_id;
  end if;
  return v_id;
end $$;

-- Innemen
create or replace function public.leenauto_innemen(
  p_uitlening_id uuid,
  p_ingeleverd_op timestamptz default now(),
  p_notities text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_u public.leenauto_uitleningen%rowtype;
begin
  if not public.leenauto_mag_schrijven() then
    raise exception 'Je hebt geen rechten om leenauto''s in te nemen';
  end if;
  select * into v_u from public.leenauto_uitleningen where id = p_uitlening_id for update;
  if not found then raise exception 'Uitlening niet gevonden'; end if;
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
end $$;

-- Oude 'uitgeleend'-status (van vóór registratie) vrijgeven zonder uitlening
create or replace function public.leenauto_vrijgeven_zonder_registratie(p_loan_car_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.leenauto_mag_schrijven() then raise exception 'Je hebt geen rechten om leenauto''s in te nemen'; end if;
  if exists (select 1 from public.leenauto_uitleningen where loan_car_id = p_loan_car_id and ingeleverd_op is null) then
    raise exception 'Deze leenauto heeft een geregistreerde uitlening; neem die in via Inleveren';
  end if;
  update public.loan_cars set status = 'beschikbaar', customer_id = null, start_date = null, end_date = null, updated_at = now()
  where id = p_loan_car_id;
end $$;

-- Wie reed er?
create or replace function public.leenauto_wie_reed(p_kenteken text, p_moment timestamptz)
returns table (
  uitlening_id uuid, loan_car_id uuid, kenteken text, merk text, model text,
  klant_naam text, klant_telefoon text, klant_email text, klant_adres text, klant_postcode text, klant_plaats text,
  uitgeleend_op timestamptz, verwacht_terug_op timestamptz, ingeleverd_op timestamptz, reden text,
  warranty_claim_id uuid, notities text, uitgeleend_door_naam text, ingenomen_door_naam text
)
language plpgsql stable security definer set search_path = public as $$
declare v_k text := regexp_replace(upper(coalesce(p_kenteken,'')), '[^A-Z0-9]', '', 'g');
begin
  if not public.leenauto_mag_lezen() then raise exception 'Je hebt geen rechten om leenauto-historie te bekijken'; end if;
  if v_k = '' or p_moment is null then return; end if;
  return query
  select u.id, u.loan_car_id, v.license_number, v.brand, v.model,
    u.klant_naam, u.klant_telefoon, u.klant_email, u.klant_adres, u.klant_postcode, u.klant_plaats,
    u.uitgeleend_op, u.verwacht_terug_op, u.ingeleverd_op, u.reden, u.warranty_claim_id, u.notities,
    nullif(trim(coalesce(pu.first_name,'') || ' ' || coalesce(pu.last_name,'')),''),
    nullif(trim(coalesce(pi.first_name,'') || ' ' || coalesce(pi.last_name,'')),'')
  from public.leenauto_uitleningen u
  join public.loan_cars lc on lc.id = u.loan_car_id
  join public.vehicles v on v.id = coalesce(u.vehicle_id, lc.vehicle_id)
  left join public.profiles pu on pu.id = u.uitgeleend_door
  left join public.profiles pi on pi.id = u.ingenomen_door
  where regexp_replace(upper(coalesce(v.license_number,'')), '[^A-Z0-9]', '', 'g') = v_k
    and p_moment >= u.uitgeleend_op
    and p_moment < coalesce(u.ingeleverd_op, 'infinity'::timestamptz);
end $$;

revoke execute on function public.leenauto_uitlenen(uuid,uuid,text,text,text,text,text,text,uuid,text,timestamptz,timestamptz,text) from public, anon;
revoke execute on function public.leenauto_innemen(uuid,timestamptz,text) from public, anon;
revoke execute on function public.leenauto_vrijgeven_zonder_registratie(uuid) from public, anon;
revoke execute on function public.leenauto_wie_reed(text,timestamptz) from public, anon;
grant execute on function public.leenauto_uitlenen(uuid,uuid,text,text,text,text,text,text,uuid,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.leenauto_innemen(uuid,timestamptz,text) to authenticated;
grant execute on function public.leenauto_vrijgeven_zonder_registratie(uuid) to authenticated;
grant execute on function public.leenauto_wie_reed(text,timestamptz) to authenticated;