
-- Fase 6b: sales_targets uniqueness moet nu ook per vestiging werken.
-- Vervang bestaande unique constraint (type, period, salesperson_id) door een
-- functionele unique index die branch meeneemt en NULL salesperson_id normaliseert.
ALTER TABLE public.sales_targets
  DROP CONSTRAINT IF EXISTS sales_targets_target_type_target_period_salesperson_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS sales_targets_type_period_branch_salesperson_uidx
  ON public.sales_targets (
    target_type,
    target_period,
    branch,
    COALESCE(salesperson_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
