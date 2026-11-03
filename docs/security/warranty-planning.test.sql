BEGIN;
INSERT INTO public.contacts(id,type,first_name,last_name,email) VALUES
 ('fa031001-0000-4000-8000-000000000001','b2c','TEST','Garantieplanning','test@example.invalid');
INSERT INTO public.warranty_claims(id,branch,description,manual_vehicle_brand,manual_vehicle_model,manual_license_number,manual_customer_name) VALUES
 ('fa031001-0000-4000-8000-000000000002','rotterdam','TEST – niet uitvoeren','TEST','Garantie','TT-931-G','TEST Garantieplanning');
SET LOCAL ROLE authenticated;
DO $$
DECLARE o uuid; again uuid; v uuid; n integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','4b5d1501-2afb-48d0-875f-80443b450156',true);
 PERFORM set_config('request.jwt.claims','{"sub":"4b5d1501-2afb-48d0-875f-80443b450156","role":"authenticated"}',true);
 IF public.werkplaats_rol()<>'aftersales_manager' THEN RAISE EXCEPTION 'Wrong test role'; END IF;
 o:=public.garantie_werkorder_inplannen('fa031001-0000-4000-8000-000000000002','TEST – niet uitvoeren','2099-12-01 09:00Z',NULL,false,'fa031001-0000-4000-8000-000000000001');
 SELECT vehicle_id INTO v FROM public.work_orders WHERE id=o AND status='ingepland' AND source='garantie' AND origin='intern' AND planned_at='2099-12-01 09:00Z';
 IF v IS NULL THEN RAISE EXCEPTION 'Scheduled order not readable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=v AND status='extern' AND details->>'excludeFromStock'='true' AND details->>'showroomOnline'='false') THEN RAISE EXCEPTION 'Vehicle entered stock'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.warranty_claims WHERE id='fa031001-0000-4000-8000-000000000002' AND vehicle_id=v AND customer_id='fa031001-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Customer/vehicle links missing'; END IF;
 again:=public.garantie_werkorder_inplannen('fa031001-0000-4000-8000-000000000002','TEST – niet uitvoeren','2099-12-01 09:00Z');
 IF again<>o THEN RAISE EXCEPTION 'Duplicate order'; END IF;
 SELECT count(*) INTO n FROM public.work_orders WHERE warranty_claim_id='fa031001-0000-4000-8000-000000000002';
 IF n<>1 THEN RAISE EXCEPTION 'Wrong order count'; END IF;
 PERFORM set_config('request.jwt.claim.sub','120b5fc2-cce6-40b3-9b17-d6e45e2e36f9',true);
 IF public.garantie_werkorder_inplannen('fa031001-0000-4000-8000-000000000002','TEST','2099-12-01 09:00Z')<>o THEN RAISE EXCEPTION 'Director cannot schedule'; END IF;
 PERFORM set_config('request.jwt.claim.sub','047fee5e-a2f5-40e0-9937-27cdbd110645',true);
 BEGIN
   PERFORM public.garantie_werkorder_inplannen('fa031001-0000-4000-8000-000000000002','TEST','2099-12-01 09:00Z');
   RAISE EXCEPTION 'Mechanic can schedule';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END;
$$;
RESET ROLE;
ROLLBACK;