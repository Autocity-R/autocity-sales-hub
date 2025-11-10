-- Fix tasks category check constraint to include 'schadeherstel'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
  CHECK (category IN (
    'voorbereiding',
    'transport',
    'inspectie',
    'schoonmaak',
    'reparatie',
    'schadeherstel',
    'administratie',
    'aflevering',
    'ophalen',
    'overig'
  ));