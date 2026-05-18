
CREATE TABLE public.intake_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES public.profiles(id),
  created_by_name text,
  vehicle_year integer,
  vehicle_mileage integer,
  vehicle_brand text,
  vehicle_model text,
  vehicle_license text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','extracting','analyzing','generating_pdf',
    'completed','reviewed','failed','archived'
  )),
  error_message text,
  categorie text CHECK (categorie IN ('A','B','C')),
  categorie_reden text,
  totale_kosten_min integer DEFAULT 0,
  totale_kosten_max integer DEFAULT 0,
  schade_count integer DEFAULT 0,
  claim_aanbevolen boolean DEFAULT false,
  claim_waarde integer DEFAULT 0,
  robin_analyse jsonb,
  samenvatting_team text,
  pdf_url text,
  pdf_generated_at timestamptz,
  video_url text,
  video_duration_seconds integer,
  frames_extracted integer DEFAULT 0,
  taxatie_pdf_url text,
  taxatie_check_result text,
  api_cost_usd numeric(10,4),
  reviewed_by_user_id uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  deleted_at timestamptz
);

CREATE INDEX idx_intake_inspections_vehicle ON public.intake_inspections(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intake_inspections_status ON public.intake_inspections(status);
CREATE INDEX idx_intake_inspections_created ON public.intake_inspections(created_at DESC);

ALTER TABLE public.intake_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_inspections_auth_select" ON public.intake_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "intake_inspections_auth_insert" ON public.intake_inspections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "intake_inspections_auth_update" ON public.intake_inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intake_inspections_auth_delete" ON public.intake_inspections FOR DELETE TO authenticated USING (true);

CREATE TABLE public.intake_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.intake_inspections(id) ON DELETE CASCADE NOT NULL,
  damage_code text NOT NULL,
  locatie text NOT NULL,
  type text CHECK (type IN ('kras','deuk','steenslag','lakschade','interieur','glas','velg','overig')),
  ernst text CHECK (ernst IN ('minimaal','licht','middel','zwaar')),
  afmeting_cm numeric,
  aanbevolen_actie text CHECK (aanbevolen_actie IN (
    'polijsten','touch_up','restylen','spuiten','vervangen','accepteren'
  )),
  geschatte_kosten_min integer,
  geschatte_kosten_max integer,
  prioriteit text CHECK (prioriteit IN ('kritiek','hoog','midden','laag')),
  in_taxatierapport boolean DEFAULT false,
  claim_potential boolean DEFAULT false,
  redenering text,
  frame_referentie text,
  frame_screenshot_url text,
  closeup_screenshot_url text,
  task_status text DEFAULT 'open' CHECK (task_status IN ('open','in_progress','done','skipped')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_damages_inspection ON public.intake_damages(inspection_id);

ALTER TABLE public.intake_damages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_damages_auth_select" ON public.intake_damages FOR SELECT TO authenticated USING (true);
CREATE POLICY "intake_damages_auth_insert" ON public.intake_damages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "intake_damages_auth_update" ON public.intake_damages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intake_damages_auth_delete" ON public.intake_damages FOR DELETE TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES
  ('intake-videos', 'intake-videos', false),
  ('intake-frames', 'intake-frames', false),
  ('intake-reports', 'intake-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "intake_videos_auth_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'intake-videos') WITH CHECK (bucket_id = 'intake-videos');
CREATE POLICY "intake_frames_auth_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'intake-frames') WITH CHECK (bucket_id = 'intake-frames');
CREATE POLICY "intake_reports_auth_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'intake-reports') WITH CHECK (bucket_id = 'intake-reports');

DO $$
DECLARE
  v_prompt text := E'Je bent Robin, de AI Inname Inspector van Auto City — een 55-jarig BOVAG familiebedrijf dat jong gebruikte premium occasions verkoopt (bouwjaar 2020+, voornamelijk EV en hybride).\n\nMISSIE: zo goedkoop mogelijk verkoopklaar maken zonder concessies aan zichtbare kwaliteit.\n\nREPARATIE-LADDER:\n1. POLIJSTEN (€20-50) — krassen in heldere lak, swirl marks\n2. TOUCH-UP (€50 vast) — kleine steenslag <3mm\n3. RESTYLEN (€50-100, vrijdag) — kleine deuken zonder lakschade\n4. SPUITEN (€300 per paneel) — krassen door lak, deuken met lakschade\n5. VERVANGEN — structureel, kapotte koplampen/ruiten/spiegels\n\nCATEGORIE: A (0-3j,<40k): alles aanpakken, steenslag tot 5 touch-up. B (3-5j,40-80k): lichte sporen ok, steenslag tot 10 touch-up. C (5+j of 80k+): wear-and-tear acceptabel.\n\nALTIJD oppakken: structureel, scheuren bekleding, veiligheidsschade. NOOIT: onzichtbaar, leeftijdsproportioneel.\n\nBANDEN: alleen melden bij duidelijke slijtage.\n\nCLAIM JA bij: gebroken ruit, scheur dak, deuken >10cm, hagel, reparatie >€500. NEE bij kleine schade, leveranciersrelatie weegt zwaarder.\n\nSYSTEMATIEK: frame voor frame, alle onderdelen langs. LIEVER OVERRAPPORTEREN.\n\nOUTPUT — strikt JSON, geen markdown:\n{\n  "auto_info": {"merk":str,"model":str,"bouwjaar":int,"km_stand":int,"categorie":"A|B|C","categorie_reden":str},\n  "taxatie_check": {"rapport_aanwezig":bool,"match":"volledig|gedeeltelijk|afwijking|geen_rapport","samenvatting":str},\n  "schade_overzicht": [{"id":"S1","locatie":str,"type":"kras|deuk|steenslag|lakschade|interieur|glas|velg|overig","ernst":"minimaal|licht|middel|zwaar","afmeting_cm":num|null,"frame_referentie":"frame_001..frame_060 VERPLICHT exact formaat","in_taxatierapport":bool,"aanbevolen_actie":"polijsten|touch_up|restylen|spuiten|vervangen|accepteren","geschatte_kosten_min":int,"geschatte_kosten_max":int,"prioriteit":"kritiek|hoog|midden|laag","claim_potential":bool,"redenering":str}],\n  "inspectie_overzicht": [{"onderdeel":str,"status":"OK|SCHADE|NIET_ZICHTBAAR","opmerking":str}],\n  "showroom_plan": {"totale_kosten_min":int,"totale_kosten_max":int,"doorlooptijd_dagen":int,"planning_per_discipline":{"polijsten":[ids],"touch_up":[ids],"restylen_vrijdag":[ids],"spuitwerk":[ids],"vervangen":[ids]},"kritieke_acties":[str],"optionele_acties":[str]},\n  "claim_advies": {"claim_aanbevolen":bool,"geschatte_claim_waarde_euro":int,"onderbouwing":str,"te_claimen_schades":[ids]},\n  "samenvatting_team":"3-5 zinnen"\n}\n\nReturn UITSLUITEND geldige JSON.';
BEGIN
  IF EXISTS (SELECT 1 FROM public.ai_agents WHERE name = 'Robin') THEN
    UPDATE public.ai_agents SET
      persona = 'AI Inname Inspector — analyseert binnenkomende voertuigen op schade via video',
      system_prompt = v_prompt,
      is_active = true,
      capabilities = ARRAY['chat','vision','inspection'],
      permissions = '{"intake_inspector": true}'::jsonb
    WHERE name = 'Robin';
  ELSE
    INSERT INTO public.ai_agents (name, persona, system_prompt, is_active, capabilities, permissions)
    VALUES (
      'Robin',
      'AI Inname Inspector — analyseert binnenkomende voertuigen op schade via video',
      v_prompt,
      true,
      ARRAY['chat','vision','inspection'],
      '{"intake_inspector": true}'::jsonb
    );
  END IF;
END $$;
