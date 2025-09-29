-- Update alle bestaande afspraken naar verkoop@auto-city.nl
UPDATE appointments 
SET google_calendar_id = 'verkoop@auto-city.nl' 
WHERE google_calendar_id = 'inkoop@auto-city.nl' OR google_calendar_id IS NULL;

-- Update company calendar settings naar verkoop@auto-city.nl
UPDATE company_calendar_settings 
SET calendar_email = 'verkoop@auto-city.nl'
WHERE calendar_email = 'inkoop@auto-city.nl' OR company_id = 'auto-city';