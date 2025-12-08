-- Stap 1: Verwijder de oude constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

-- Stap 2: Update bestaande taken met oude categorieën naar 'overig' EERST
UPDATE tasks SET category = 'overig' WHERE category IN ('inspectie', 'voorbereiding', 'administratie', 'ophalen');

-- Stap 3: Voeg de nieuwe constraint toe met de bijgewerkte categorieën
ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
CHECK (category = ANY (ARRAY[
  'klaarmaken'::text,
  'onderdelen_bestellen'::text,
  'transport'::text, 
  'schoonmaak'::text, 
  'reparatie'::text, 
  'schadeherstel'::text, 
  'werkplaats'::text,
  'aflevering'::text, 
  'overig'::text
]));