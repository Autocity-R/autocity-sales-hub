-- Create weekly sales tracking table
CREATE TABLE public.weekly_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id uuid NOT NULL,
  salesperson_name text NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  b2b_sales integer NOT NULL DEFAULT 0,
  b2c_sales integer NOT NULL DEFAULT 0,
  total_sales integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view weekly sales" 
ON public.weekly_sales 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert weekly sales" 
ON public.weekly_sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update weekly sales" 
ON public.weekly_sales 
FOR UPDATE 
USING (true);

-- Create index for performance
CREATE INDEX idx_weekly_sales_week_start ON public.weekly_sales(week_start_date);
CREATE INDEX idx_weekly_sales_salesperson ON public.weekly_sales(salesperson_id);

-- Create function to get current week start (Monday)
CREATE OR REPLACE FUNCTION public.get_week_start_date(input_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (input_date - INTERVAL '1 day' * EXTRACT(DOW FROM input_date)::int + INTERVAL '1 day')::date;
$$;

-- Create function to update weekly sales
CREATE OR REPLACE FUNCTION public.update_weekly_sales(
  p_salesperson_id uuid,
  p_salesperson_name text,
  p_sales_type text -- 'b2b' or 'b2c'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  week_start date;
  week_end date;
BEGIN
  -- Get current week start (Monday)
  week_start := get_week_start_date();
  week_end := week_start + INTERVAL '6 days';
  
  -- Insert or update weekly sales record
  INSERT INTO weekly_sales (
    salesperson_id, 
    salesperson_name, 
    week_start_date, 
    week_end_date,
    b2b_sales,
    b2c_sales,
    total_sales
  )
  VALUES (
    p_salesperson_id,
    p_salesperson_name,
    week_start,
    week_end,
    CASE WHEN p_sales_type = 'b2b' THEN 1 ELSE 0 END,
    CASE WHEN p_sales_type = 'b2c' THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (salesperson_id, week_start_date) 
  DO UPDATE SET
    salesperson_name = EXCLUDED.salesperson_name,
    b2b_sales = weekly_sales.b2b_sales + CASE WHEN p_sales_type = 'b2b' THEN 1 ELSE 0 END,
    b2c_sales = weekly_sales.b2c_sales + CASE WHEN p_sales_type = 'b2c' THEN 1 ELSE 0 END,
    total_sales = weekly_sales.total_sales + 1,
    updated_at = now();
END;
$$;

-- Add unique constraint
ALTER TABLE public.weekly_sales ADD CONSTRAINT unique_salesperson_week UNIQUE (salesperson_id, week_start_date);