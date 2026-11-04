ALTER TABLE public.warranty_claim_wijzigingen ADD CONSTRAINT warranty_claim_wijzigingen_door_fkey FOREIGN KEY(door) REFERENCES public.profiles(id) ON DELETE SET NULL;
BEGIN;
DO $$ DECLARE a public.warranty_claims%ROWTYPE; b public.warranty_claims%ROWTYPE; blocked boolean:=false; BEGIN
INSERT INTO public.warranty_claims(description,created_at,manual_customer_name) VALUES('BUILD14-ROLLBACK-ONLY','2026-11-04T22:38:00Z','TEST') RETURNING * INTO a;
INSERT INTO public.warranty_claims(description,created_at,manual_customer_name) VALUES('BUILD14-ROLLBACK-ONLY','2026-11-04T22:38:00Z','TEST') RETURNING * INTO b;
IF substring(b.claim_nummer,9)::int<>substring(a.claim_nummer,9)::int+1 OR a.claim_nummer=b.claim_nummer THEN RAISE EXCEPTION 'Nummer test mislukt'; END IF;
BEGIN UPDATE public.warranty_claims SET claim_nummer='GC-2026-9999' WHERE id=a.id; EXCEPTION WHEN raise_exception THEN blocked:=true; END;
IF NOT blocked THEN RAISE EXCEPTION 'Onveranderbaar test mislukt'; END IF;
UPDATE public.warranty_claims SET claim_contact_naam='TEST NIEUW',claim_contact_telefoon='0612345678',claim_contact_email='build14@example.invalid' WHERE id=a.id;
IF NOT EXISTS(SELECT 1 FROM public.warranty_claim_wijzigingen WHERE claim_id=a.id AND nieuw->>'naam'='TEST NIEUW') THEN RAISE EXCEPTION 'Audit test mislukt'; END IF;
RAISE NOTICE 'PASS consecutive %, %, immutable, audit',a.claim_nummer,b.claim_nummer;
END $$;
ROLLBACK;