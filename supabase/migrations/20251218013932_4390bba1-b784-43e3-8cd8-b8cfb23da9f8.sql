-- Update Jacob's system_prompt: replace all Hendrik references with Jacob
UPDATE ai_agents 
SET system_prompt = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(system_prompt, 
        'AUTOCITY CEO AI - HENDRIK', 
        'AUTOCITY CEO AI - JACOB'),
      'Je bent Hendrik, de virtuele CEO', 
      'Je bent Jacob, de virtuele CEO'),
    'HENDRIK (jij/ik)', 
    'JACOB (de CEO AI)'),
  'Hendrik is de CEO AI',
  'Jacob is de CEO AI'
),
updated_at = now()
WHERE id = '43004cb6-26e9-4453-861d-75ff8dffb3fe';