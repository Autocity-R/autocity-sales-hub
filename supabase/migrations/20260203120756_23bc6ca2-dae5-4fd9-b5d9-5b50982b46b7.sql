-- Create a security definer function to complete checklist items
-- This allows aftersales_manager to update checklist items without general vehicle UPDATE permissions

CREATE OR REPLACE FUNCTION public.complete_pre_delivery_checklist_item(
  p_vehicle_id uuid,
  p_checklist_item_id text,
  p_completed_by_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_details jsonb;
  v_checklist jsonb;
  v_updated_checklist jsonb;
  v_item jsonb;
  v_index int;
BEGIN
  -- Check if user has permission (admin, owner, manager, verkoper, or aftersales_manager)
  IF NOT (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'owner') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'verkoper') OR 
    has_role(auth.uid(), 'aftersales_manager')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to complete checklist items';
  END IF;

  -- Get current vehicle details
  SELECT details INTO v_details
  FROM vehicles
  WHERE id = p_vehicle_id;

  IF v_details IS NULL THEN
    v_details := '{}'::jsonb;
  END IF;

  -- Get the checklist array
  v_checklist := COALESCE(v_details->'preDeliveryChecklist', '[]'::jsonb);
  
  -- Find and update the checklist item
  v_updated_checklist := '[]'::jsonb;
  
  FOR v_index IN 0..jsonb_array_length(v_checklist) - 1 LOOP
    v_item := v_checklist->v_index;
    
    IF v_item->>'id' = p_checklist_item_id THEN
      -- Update this item to completed
      v_item := jsonb_set(v_item, '{completed}', 'true'::jsonb);
      v_item := jsonb_set(v_item, '{completedAt}', to_jsonb(now()::text));
      v_item := jsonb_set(v_item, '{completedByName}', to_jsonb(p_completed_by_name || ' (via taak)'));
    END IF;
    
    v_updated_checklist := v_updated_checklist || jsonb_build_array(v_item);
  END LOOP;

  -- Update the vehicle with the new checklist
  UPDATE vehicles
  SET 
    details = jsonb_set(v_details, '{preDeliveryChecklist}', v_updated_checklist),
    updated_at = now()
  WHERE id = p_vehicle_id;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks roles)
GRANT EXECUTE ON FUNCTION public.complete_pre_delivery_checklist_item(uuid, text, text) TO authenticated;