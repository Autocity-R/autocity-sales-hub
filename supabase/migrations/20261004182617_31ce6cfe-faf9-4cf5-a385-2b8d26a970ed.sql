ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS sort_manual boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_poetser_sort_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.werkplaats_rol() = 'poetser'
     AND (NEW.sort_order IS DISTINCT FROM OLD.sort_order OR NEW.sort_manual IS DISTINCT FROM OLD.sort_manual) THEN
    RAISE EXCEPTION 'Poetsers mogen de volgorde niet aanpassen';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_poetser_sort_order() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_poetser_sort_order ON public.work_orders;
CREATE TRIGGER trg_guard_poetser_sort_order BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_poetser_sort_order();

DROP POLICY IF EXISTS wo_delete ON public.work_orders;
CREATE POLICY wo_delete ON public.work_orders FOR DELETE TO authenticated
USING (public.werkplaats_rol() = ANY (ARRAY['owner','admin','manager','aftersales_manager','werkplaats_chef']));