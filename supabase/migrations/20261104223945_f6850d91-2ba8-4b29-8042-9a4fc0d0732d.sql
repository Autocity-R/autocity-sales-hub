LOCK TABLE public.warranty_claims IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.warranty_claims ADD COLUMN claim_nummer text UNIQUE, ADD COLUMN claim_contact_naam text, ADD COLUMN claim_contact_telefoon text, ADD COLUMN claim_contact_email text, ADD COLUMN manual_customer_email text;
CREATE TABLE public.warranty_claim_tellers(jaar integer PRIMARY KEY, laatste integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.warranty_claim_tellers TO service_role;
ALTER TABLE public.warranty_claim_tellers ENABLE ROW LEVEL SECURITY;
WITH numbered AS (SELECT id,extract(year from created_at AT TIME ZONE 'Europe/Amsterdam')::int y,row_number() OVER(PARTITION BY extract(year from created_at AT TIME ZONE 'Europe/Amsterdam') ORDER BY created_at,id) n FROM public.warranty_claims)
UPDATE public.warranty_claims c SET claim_nummer='GC-'||n.y||'-'||lpad(n.n::text,4,'0') FROM numbered n WHERE c.id=n.id;
INSERT INTO public.warranty_claim_tellers(jaar,laatste) SELECT substring(claim_nummer,4,4)::int,max(substring(claim_nummer,9)::int) FROM public.warranty_claims GROUP BY 1;
ALTER TABLE public.warranty_claims ALTER COLUMN claim_nummer SET NOT NULL;
CREATE FUNCTION public.warranty_claim_nummer_toekennen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE y int; n int; BEGIN
IF TG_OP='UPDATE' THEN IF NEW.claim_nummer IS DISTINCT FROM OLD.claim_nummer THEN RAISE EXCEPTION 'Claimnummer is onveranderbaar'; END IF; RETURN NEW; END IF;
y:=extract(year from coalesce(NEW.created_at,now()) AT TIME ZONE 'Europe/Amsterdam');
INSERT INTO public.warranty_claim_tellers(jaar,laatste) VALUES(y,1) ON CONFLICT(jaar) DO UPDATE SET laatste=warranty_claim_tellers.laatste+1,updated_at=now() RETURNING laatste INTO n;
IF n>9999 THEN RAISE EXCEPTION 'Claimnummer jaarreeks is vol'; END IF;
NEW.claim_nummer:='GC-'||y||'-'||lpad(n::text,4,'0'); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.warranty_claim_nummer_toekennen() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER warranty_claim_nummer BEFORE INSERT OR UPDATE OF claim_nummer ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.warranty_claim_nummer_toekennen();
CREATE TABLE public.warranty_claim_wijzigingen(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),claim_id uuid NOT NULL REFERENCES public.warranty_claims(id) ON DELETE CASCADE,door uuid,oud jsonb NOT NULL,nieuw jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.warranty_claim_wijzigingen TO authenticated;
GRANT ALL ON public.warranty_claim_wijzigingen TO service_role;
ALTER TABLE public.warranty_claim_wijzigingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY claim_wijzigingen_lezen ON public.warranty_claim_wijzigingen FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.warranty_claims c WHERE c.id=claim_id));
CREATE FUNCTION public.warranty_claim_contact_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE olddata jsonb; newdata jsonb; ct public.contacts%ROWTYPE; BEGIN
olddata:=jsonb_build_object('customer_id',OLD.customer_id,'naam',coalesce(OLD.claim_contact_naam,OLD.manual_customer_name),'telefoon',coalesce(OLD.claim_contact_telefoon,OLD.manual_customer_phone),'email',coalesce(OLD.claim_contact_email,OLD.manual_customer_email));
newdata:=jsonb_build_object('customer_id',NEW.customer_id,'naam',coalesce(NEW.claim_contact_naam,NEW.manual_customer_name),'telefoon',coalesce(NEW.claim_contact_telefoon,NEW.manual_customer_phone),'email',coalesce(NEW.claim_contact_email,NEW.manual_customer_email));
IF olddata IS DISTINCT FROM newdata THEN
SELECT * INTO ct FROM public.contacts WHERE id=OLD.customer_id;
olddata:=olddata||jsonb_build_object('naam',coalesce(OLD.claim_contact_naam,OLD.manual_customer_name,nullif(trim(coalesce(ct.first_name,'')||' '||coalesce(ct.last_name,'')),''),ct.company_name),'telefoon',coalesce(OLD.claim_contact_telefoon,OLD.manual_customer_phone,ct.phone),'email',coalesce(OLD.claim_contact_email,OLD.manual_customer_email,ct.email));
INSERT INTO public.warranty_claim_wijzigingen(claim_id,door,oud,nieuw) VALUES(NEW.id,auth.uid(),olddata,newdata);
SELECT * INTO ct FROM public.contacts WHERE id=NEW.customer_id;
UPDATE public.work_orders SET external_customer=coalesce(external_customer,'{}'::jsonb)||jsonb_build_object('name',coalesce(NEW.claim_contact_naam,NEW.manual_customer_name,ct.company_name,trim(coalesce(ct.first_name,'')||' '||coalesce(ct.last_name,''))),'phone',coalesce(NEW.claim_contact_telefoon,NEW.manual_customer_phone,ct.phone),'email',coalesce(NEW.claim_contact_email,NEW.manual_customer_email,ct.email)) WHERE warranty_claim_id=NEW.id;
END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.warranty_claim_contact_log() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER warranty_claim_contact_audit AFTER UPDATE OF customer_id,manual_customer_name,manual_customer_phone,manual_customer_email,claim_contact_naam,claim_contact_telefoon,claim_contact_email ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.warranty_claim_contact_log();
CREATE FUNCTION public.garantie_contact_wijzigen(p_claim_id uuid,p_customer_id uuid,p_naam text,p_telefoon text,p_email text,p_klantkaart boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$ DECLARE c public.warranty_claims%ROWTYPE; changed int; BEGIN
SELECT * INTO c FROM public.warranty_claims WHERE id=p_claim_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Claim niet beschikbaar' USING ERRCODE='42501'; END IF;
IF nullif(trim(p_naam),'') IS NULL THEN RAISE EXCEPTION 'Naam is verplicht'; END IF;
IF coalesce(p_telefoon,'')<>'' AND regexp_replace(p_telefoon,'[ ()-]','','g') !~ '^(0[1-9][0-9]{8}|\+31[1-9][0-9]{8})$' THEN RAISE EXCEPTION 'Ongeldig Nederlands telefoonnummer'; END IF;
IF coalesce(p_email,'')<>'' AND p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Ongeldig e-mailadres'; END IF;
IF p_customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contacts WHERE id=p_customer_id AND type IN('b2b','b2c')) THEN RAISE EXCEPTION 'Klant niet beschikbaar'; END IF;
UPDATE public.warranty_claims SET customer_id=p_customer_id,claim_contact_naam=trim(p_naam),claim_contact_telefoon=coalesce(trim(p_telefoon),''),claim_contact_email=coalesce(trim(p_email),''),manual_customer_name=CASE WHEN p_customer_id IS NULL THEN trim(p_naam) ELSE manual_customer_name END,manual_customer_phone=CASE WHEN p_customer_id IS NULL THEN p_telefoon ELSE manual_customer_phone END,manual_customer_email=CASE WHEN p_customer_id IS NULL THEN p_email ELSE manual_customer_email END WHERE id=p_claim_id;
GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Geen rechten om claim te wijzigen' USING ERRCODE='42501'; END IF;
IF p_klantkaart AND p_customer_id IS NOT NULL THEN
UPDATE public.contacts SET first_name=trim(p_naam),last_name='',company_name=CASE WHEN type='b2b' THEN trim(p_naam) ELSE company_name END,phone=p_telefoon,email=p_email WHERE id=p_customer_id;
GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Geen rechten om klantkaart bij te werken' USING ERRCODE='42501'; END IF;
END IF; END $$;
REVOKE ALL ON FUNCTION public.garantie_contact_wijzigen(uuid,uuid,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.garantie_contact_wijzigen(uuid,uuid,text,text,text,boolean) TO authenticated;
CREATE FUNCTION public.voertuig_open_punten(p_vehicle_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$ DECLARE me public.vehicles%ROWTYPE; ids uuid[]; outdata jsonb:='[]'; items jsonb; plate text; vinn text; BEGIN
SELECT * INTO me FROM public.vehicles WHERE id=p_vehicle_id; IF NOT FOUND THEN RETURN outdata; END IF;
plate:=upper(regexp_replace(coalesce(me.license_number,''),'[^A-Za-z0-9]','','g')); vinn:=upper(regexp_replace(coalesce(me.vin,''),'[^A-Za-z0-9]','','g'));
SELECT array_agg(id) INTO ids FROM public.vehicles v WHERE v.id=me.id OR (length(vinn)>=6 AND upper(regexp_replace(coalesce(v.vin,''),'[^A-Za-z0-9]','','g'))=vinn) OR (length(plate)>=6 AND upper(regexp_replace(coalesce(v.license_number,''),'[^A-Za-z0-9]','','g'))=plate);
BEGIN SELECT jsonb_agg(jsonb_build_object('id',w.id,'soort','order','groep',w.discipline,'omschrijving',concat_ws(' · ',w.description,w.part),'status',w.status,'planned_at',w.planned_at,'due_date',w.due_date,'assigned_name',trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),'claim_nummer',c.claim_nummer,'via_ander_record',w.vehicle_id<>me.id)) INTO items FROM public.work_orders w LEFT JOIN public.profiles p ON p.id=w.assigned_to LEFT JOIN public.warranty_claims c ON c.id=w.warranty_claim_id WHERE w.vehicle_id=ANY(ids) AND w.status IN('ingepland','bezig','gepauzeerd','afgerond'); outdata:=outdata||coalesce(items,'[]'); EXCEPTION WHEN insufficient_privilege THEN NULL; END;
BEGIN SELECT jsonb_agg(jsonb_build_object('id',p.id,'soort','onderdeel','groep','Onderdelen','omschrijving',p.part_name,'status',p.status,'ordered_at',p.ordered_at,'via_ander_record',p.vehicle_id<>me.id)) INTO items FROM public.parts_orders p WHERE p.vehicle_id=ANY(ids) AND p.arrived_at IS NULL AND p.status NOT IN('geannuleerd','cancelled'); outdata:=outdata||coalesce(items,'[]'); EXCEPTION WHEN insufficient_privilege THEN NULL; END;
BEGIN SELECT jsonb_agg(jsonb_build_object('id',t.id,'soort','taak','groep','Taken','omschrijving',t.title,'status',t.status,'due_date',t.due_date,'assigned_name',trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')),'via_ander_record',t.vehicle_id<>me.id)) INTO items FROM public.tasks t LEFT JOIN public.profiles p ON p.id=t.assigned_to WHERE (t.vehicle_id=ANY(ids) OR t.linked_vehicle_id=ANY(ids)) AND t.status NOT IN('voltooid','geannuleerd','completed','cancelled'); outdata:=outdata||coalesce(items,'[]'); EXCEPTION WHEN insufficient_privilege THEN NULL; END;
BEGIN SELECT jsonb_agg(jsonb_build_object('id',c.id,'soort','claim','groep','Garantie','omschrijving',c.description,'status',c.claim_status,'claim_nummer',c.claim_nummer,'via_ander_record',coalesce(c.vehicle_id,me.id)<>me.id)) INTO items FROM public.warranty_claims c WHERE (c.vehicle_id=ANY(ids) OR (length(plate)>=6 AND upper(regexp_replace(coalesce(c.manual_license_number,''),'[^A-Za-z0-9]','','g'))=plate)) AND c.claim_status NOT IN('resolved','void','rejected','afgewezen'); outdata:=outdata||coalesce(items,'[]'); EXCEPTION WHEN insufficient_privilege THEN NULL; END;
IF me.status='verkocht_b2c' THEN SELECT jsonb_agg(jsonb_build_object('id',coalesce(i->>'id','checklist-'||n),'soort','checklist','groep','Aflever-checklist','omschrijving',i->>'description','status','open','planned_at',me.details->>'deliveryAppointment')) INTO items FROM jsonb_array_elements(CASE WHEN jsonb_typeof(me.details->'preDeliveryChecklist')='array' THEN me.details->'preDeliveryChecklist' ELSE '[]'::jsonb END) WITH ORDINALITY a(i,n) WHERE coalesce((i->>'completed')::boolean,false)=false; outdata:=outdata||coalesce(items,'[]'); END IF;
IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN('owner','admin','aftersales_manager','werkplaats_chef','operationeel_directeur','administratie')) THEN
BEGIN SELECT jsonb_agg(jsonb_build_object('id',w.id,'soort','factuur','groep','Nog te factureren','omschrijving',w.description,'status','goedgekeurd','planned_at',w.approved_at,'via_ander_record',w.vehicle_id<>me.id)) INTO items FROM public.work_orders w WHERE w.vehicle_id=ANY(ids) AND w.status='goedgekeurd' AND w.origin='extern' AND NOT w.factuur_niet_nodig AND NOT EXISTS(SELECT 1 FROM public.workshop_invoices wi WHERE w.id=ANY(public.invoice_order_ids(wi.source_work_order_ids,wi.work_order_id))); outdata:=outdata||coalesce(items,'[]'); EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END IF; RETURN outdata; END $$;
REVOKE ALL ON FUNCTION public.voertuig_open_punten(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.voertuig_open_punten(uuid) TO authenticated,service_role;