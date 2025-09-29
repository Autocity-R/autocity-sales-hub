-- Fix the test vehicle and register the sale
-- Update the test vehicle with Alexander Kool as the salesperson
UPDATE vehicles 
SET 
  sold_by_user_id = '3be626db-ad93-4236-9e9f-e0ab14690f42',
  sold_date = NOW() - INTERVAL '1 hour'
WHERE 
  id = '379efb8f-801d-4563-9ecf-d661379ade15' 
  AND brand = 'test' 
  AND model = 'test';

-- Register the sale in weekly_sales using the update_weekly_sales function
SELECT update_weekly_sales(
  '3be626db-ad93-4236-9e9f-e0ab14690f42'::uuid,
  'Alexander Kool',
  'b2c'
);