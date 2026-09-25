create or replace function public.leenauto_mag_schrijven() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid()
    and role::text in ('owner','admin','manager','aftersales_manager','werkplaats_chef','verkoper','operationeel','operationeel_directeur'))
$$;
revoke execute on function public.leenauto_mag_schrijven() from public, anon;
grant execute on function public.leenauto_mag_schrijven() to authenticated;

drop policy if exists werkplaats_calendar_settings_write on public.werkplaats_calendar_settings;
create policy werkplaats_calendar_settings_write on public.werkplaats_calendar_settings
  for all to authenticated
  using (has_role(auth.uid(),'aftersales_manager') or has_role(auth.uid(),'werkplaats_chef') or has_role(auth.uid(),'operationeel_directeur') or is_admin_user(auth.uid()))
  with check (has_role(auth.uid(),'aftersales_manager') or has_role(auth.uid(),'werkplaats_chef') or has_role(auth.uid(),'operationeel_directeur') or is_admin_user(auth.uid()));