create or replace function public.push_notify(_title text, _body text, _url text, _tag text, _dedupe_key text, _preset text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  begin
    v_secret := public.vault_secret('push_hook_secret');
    if v_secret is null then return; end if;

    perform extensions.net.http_post(
      url := 'https://fnwagrmoyfyimdoaynkg.supabase.co/functions/v1/crm-push-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', v_secret
      ),
      body := jsonb_build_object(
        'title', _title,
        'body', _body,
        'url', _url,
        'tag', _tag,
        'dedupe_key', _dedupe_key,
        'preset', _preset
      )
    );
  exception when others then
    raise notice 'push_notify faalde stil: %', sqlerrm;
  end;
end;
$$;

-- Auto binnengemeld (transport → aangekomen)
create or replace function public.push_on_vehicle_arrival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.details->>'transportStatus','') = 'aangekomen'
     and coalesce(old.details->>'transportStatus','') is distinct from 'aangekomen' then
    perform public.push_notify(
      'Auto binnen',
      concat_ws(' ', coalesce(new.brand,''), coalesce(new.model,''), coalesce(new.license_number,'')) || ' — inname klaarzetten',
      '/werkplaats/inname',
      'inname-' || new.id::text,
      'arrival:' || new.id::text,
      'aftersales_chef'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists z_push_on_vehicle_arrival on public.vehicles;
create trigger z_push_on_vehicle_arrival
after update on public.vehicles
for each row execute function public.push_on_vehicle_arrival();

-- Klus afgerond door vakman → goedkeuren
create or replace function public.push_on_workorder_done()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  v_disc text;
begin
  if new.status = 'afgerond' and old.status is distinct from 'afgerond' then
    select trim(concat_ws(' ', coalesce(license_number,''), coalesce(brand,''), coalesce(model,'')))
      into v_label from public.vehicles where id = new.vehicle_id;

    v_disc := case new.discipline
      when 'werkplaats' then 'Werkplaats'
      when 'spuit' then 'Schadeherstel'
      when 'uitdeuk' then 'Uitdeuken'
      when 'poets' then 'Poetsen'
      else coalesce(new.discipline, 'Klus')
    end;

    perform public.push_notify(
      v_disc || ' afgerond',
      coalesce(nullif(v_label, ''), 'Werkorder') || ' — goedkeuren',
      '/werkplaats/goedkeuren',
      'goedkeuren-' || new.id::text,
      'wo-done:' || new.id::text,
      'aftersales_chef'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists z_push_on_workorder_done on public.work_orders;
create trigger z_push_on_workorder_done
after update on public.work_orders
for each row execute function public.push_on_workorder_done();