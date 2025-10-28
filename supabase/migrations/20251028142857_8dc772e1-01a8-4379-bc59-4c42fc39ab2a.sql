-- Allow authenticated users to update loan car availability with safety checks
CREATE POLICY "Authenticated users can update loan car availability"
ON loan_cars FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  status IN ('beschikbaar', 'uitgeleend')
  AND (
    -- If marking as available, related fields must be NULL
    status <> 'beschikbaar'
    OR (status = 'beschikbaar' AND customer_id IS NULL AND start_date IS NULL AND end_date IS NULL)
  )
);