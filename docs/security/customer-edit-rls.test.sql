-- Run through the Supabase migration tool. Every fixture is rolled back.
-- Existing accounts are used only as role identities; no account is modified.
BEGIN;

INSERT INTO public.contacts (id, type, first_name, last_name, email)
VALUES
 ('fc230001-0000-4000-8000-000000000001', 'b2c', 'TEST', 'Aftersales rechten', 'before-b2c@example.invalid'),
 ('fc230001-0000-4000-8000-000000000002', 'b2b', 'TEST', 'Aftersales rechten', 'before-b2b@example.invalid'),
 ('fc230001-0000-4000-8000-000000000003', 'supplier', 'TEST', 'Aftersales rechten', 'before-supplier@example.invalid'),
 ('fc230001-0000-4000-8000-000000000004', 'transporter', 'TEST', 'Aftersales rechten', 'before-transporter@example.invalid');

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  identity uuid;
  changed integer;
  contact_type text;
BEGIN
  FOREACH identity IN ARRAY ARRAY[
    '4b5d1501-2afb-48d0-875f-80443b450156'::uuid,
    '120b5fc2-cce6-40b3-9b17-d6e45e2e36f9'::uuid
  ] LOOP
    PERFORM set_config('request.jwt.claim.sub', identity::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', identity, 'role', 'authenticated')::text, true);
    IF NOT (public.has_role(identity, 'aftersales_manager') OR public.has_role(identity, 'operationeel_directeur')) THEN
      RAISE EXCEPTION 'Missing expected test role';
    END IF;
    FOREACH contact_type IN ARRAY ARRAY['b2c', 'b2b'] LOOP
      UPDATE public.contacts SET email = identity::text || '@example.invalid'
      WHERE id IN ('fc230001-0000-4000-8000-000000000001', 'fc230001-0000-4000-8000-000000000002')
        AND type = contact_type;
      GET DIAGNOSTICS changed = ROW_COUNT;
      IF changed <> 1 THEN RAISE EXCEPTION 'Customer update denied for %, %', identity, contact_type; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.contacts WHERE id IN
        ('fc230001-0000-4000-8000-000000000001', 'fc230001-0000-4000-8000-000000000002')
        AND type = contact_type AND email = identity::text || '@example.invalid') THEN
        RAISE EXCEPTION 'Updated customer email cannot be read back';
      END IF;
    END LOOP;
    UPDATE public.contacts SET email = 'forbidden@example.invalid'
      WHERE id IN ('fc230001-0000-4000-8000-000000000003', 'fc230001-0000-4000-8000-000000000004');
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 0 THEN RAISE EXCEPTION 'Supplier/transporter permissions broadened'; END IF;
    BEGIN
      UPDATE public.contacts SET type = 'supplier' WHERE id = 'fc230001-0000-4000-8000-000000000001';
      RAISE EXCEPTION 'Customer conversion bypassed WITH CHECK';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    DELETE FROM public.contacts WHERE id = 'fc230001-0000-4000-8000-000000000001';
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed <> 0 THEN RAISE EXCEPTION 'Customer deletion permission broadened'; END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub', '7ae12e98-fbff-434b-86fd-b1fb0c2faf77', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"7ae12e98-fbff-434b-86fd-b1fb0c2faf77","role":"authenticated"}', true);
  IF NOT public.has_role('7ae12e98-fbff-434b-86fd-b1fb0c2faf77', 'administratie') THEN
    RAISE EXCEPTION 'Missing read-only test role';
  END IF;
  UPDATE public.contacts SET email = 'forbidden@example.invalid' WHERE id = 'fc230001-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Read-only role can now edit customers'; END IF;
END;
$$;

RESET ROLE;
ROLLBACK;