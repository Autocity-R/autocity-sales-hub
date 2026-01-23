-- Synchroniseer alle bestaande taak-checklist koppelingen
-- Dit fixt taken die werden aangemaakt voordat de auto-save was geïmplementeerd

DO $$
DECLARE
  task_record RECORD;
  current_checklist JSONB;
  updated_checklist JSONB;
  checklist_item JSONB;
  i INTEGER;
  sync_count INTEGER := 0;
BEGIN
  -- Loop door alle taken met een linked_checklist_item_id
  FOR task_record IN 
    SELECT t.id as task_id, t.linked_checklist_item_id, t.linked_vehicle_id
    FROM tasks t
    WHERE t.linked_checklist_item_id IS NOT NULL
      AND t.linked_vehicle_id IS NOT NULL
  LOOP
    -- Haal huidige checklist op
    SELECT details->'preDeliveryChecklist' INTO current_checklist
    FROM vehicles
    WHERE id = task_record.linked_vehicle_id;
    
    IF current_checklist IS NOT NULL AND jsonb_array_length(current_checklist) > 0 THEN
      updated_checklist := '[]'::jsonb;
      
      -- Loop door alle checklist items
      FOR i IN 0..jsonb_array_length(current_checklist) - 1 LOOP
        checklist_item := current_checklist->i;
        
        -- Als dit het gekoppelde item is, voeg linkedTaskId toe
        IF checklist_item->>'id' = task_record.linked_checklist_item_id::text THEN
          checklist_item := checklist_item || jsonb_build_object('linkedTaskId', task_record.task_id::text);
          sync_count := sync_count + 1;
        END IF;
        
        updated_checklist := updated_checklist || jsonb_build_array(checklist_item);
      END LOOP;
      
      -- Update het voertuig met de nieuwe checklist
      UPDATE vehicles
      SET details = jsonb_set(
        COALESCE(details, '{}'::jsonb),
        '{preDeliveryChecklist}',
        updated_checklist
      )
      WHERE id = task_record.linked_vehicle_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Gesynchroniseerd: % taak-checklist koppelingen', sync_count;
END $$;