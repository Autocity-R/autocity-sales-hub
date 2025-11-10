-- Add damage_parts column to tasks table for schadeherstel details
ALTER TABLE tasks 
ADD COLUMN damage_parts jsonb DEFAULT NULL;

COMMENT ON COLUMN tasks.damage_parts IS 'JSON structure: { "parts": [{ "id": "part_id", "name": "Part Name", "instruction": "What needs to be done" }] }';