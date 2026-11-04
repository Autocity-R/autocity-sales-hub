DO $$ DECLARE d text; BEGIN SELECT pg_get_functiondef(oid) INTO d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='voertuig_open_punten'; d:=replace(d,'concat_ws('' · '',w.description,w.part)','concat_ws('' · '',w.description,w.part,CASE WHEN jsonb_typeof(w.parts)=''array'' THEN (SELECT string_agg(x,'' · '') FROM jsonb_array_elements_text(w.parts) a(x)) END)'); d:=replace(d,'''voltooid'', ''geannuleerd''','''voltooid'', ''geannuleerd'''); d:=replace(d,'''voltooid'',''geannuleerd'',''completed'',''cancelled''','''voltooid'',''geannuleerd'',''completed'',''cancelled'',''afgerond'',''done'''); d:=replace(d,'me.details->>''deliveryAppointmentDate''','(SELECT a.starttime FROM public.appointments a WHERE a.id::text=me.details->>''deliveryAppointmentId'')'); EXECUTE d; END $$;
BEGIN;
SELECT set_config('request.jwt.claim.sub','6d62becf-fa32-4eb6-9fb2-936ecfe4313f',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE cid uuid; BEGIN
INSERT INTO public.warranty_claims(description,manual_customer_name,branch) VALUES('BUILD14-ROLLBACK-ONLY','TEST','rotterdam') RETURNING id INTO cid;
PERFORM public.garantie_contact_wijzigen(cid,NULL,'TEST NIEUW','06 1234 5678','build14@example.invalid',false);
IF NOT EXISTS(SELECT 1 FROM public.warranty_claim_wijzigingen WHERE claim_id=cid AND nieuw->>'naam'='TEST NIEUW') THEN RAISE EXCEPTION 'Authenticated contact audit test failed'; END IF;
END $$;
ROLLBACK;