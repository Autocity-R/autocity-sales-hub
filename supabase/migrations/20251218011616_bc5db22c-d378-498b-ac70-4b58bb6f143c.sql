-- Hernoem CEO Agent van "Hendrik - CEO AI" naar "Jacob - CEO AI"
UPDATE ai_agents 
SET 
  name = 'Jacob - CEO AI',
  persona = REPLACE(persona, 'Ik ben Hendrik', 'Ik ben Jacob'),
  updated_at = now()
WHERE id = '43004cb6-26e9-4453-861d-75ff8dffb3fe';