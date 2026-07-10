
DROP INDEX IF EXISTS public.sales_targets_type_period_branch_salesperson_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS sales_targets_type_period_branch_salesperson_uidx
  ON public.sales_targets (target_type, target_period, branch, salesperson_id)
  NULLS NOT DISTINCT;
