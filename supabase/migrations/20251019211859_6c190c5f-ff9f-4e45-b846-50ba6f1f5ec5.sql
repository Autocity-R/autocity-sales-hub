-- Fix SECURITY DEFINER functions missing SET search_path protection
-- This prevents search path manipulation attacks

-- 1. Fix update_task_updated_at()
CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Fix update_vehicle_files_updated_at()
CREATE OR REPLACE FUNCTION public.update_vehicle_files_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Fix update_email_threads_updated_at()
CREATE OR REPLACE FUNCTION public.update_email_threads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Fix update_thread_message_stats()
CREATE OR REPLACE FUNCTION public.update_thread_message_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE email_threads
  SET 
    message_count = message_count + 1,
    last_message_date = NEW.received_at,
    updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$function$;

-- 5. Fix log_task_changes()
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_history (
      task_id, 
      changed_by, 
      old_status, 
      new_status, 
      change_reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.status,
      NEW.status,
      CASE 
        WHEN NEW.status = 'voltooid' THEN 'Taak afgerond'
        WHEN NEW.status = 'in_uitvoering' THEN 'Taak gestart'
        WHEN NEW.status = 'uitgesteld' THEN 'Taak uitgesteld'
        WHEN NEW.status = 'geannuleerd' THEN 'Taak geannuleerd'
        ELSE 'Status gewijzigd'
      END
    );
  END IF;

  -- Log assignee changes
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.task_history (
      task_id,
      changed_by,
      old_assignee,
      new_assignee,
      change_reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.assigned_to,
      NEW.assigned_to,
      'Taak opnieuw toegewezen'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. Fix sync_ai_agent_webhook_status()
CREATE OR REPLACE FUNCTION public.sync_ai_agent_webhook_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When ai_agent_webhooks is inserted, updated, or deleted
  -- Update the corresponding ai_agents record
  
  IF TG_OP = 'DELETE' THEN
    -- Check if there are any other active webhooks for this agent
    UPDATE ai_agents 
    SET 
      is_webhook_enabled = (
        SELECT CASE 
          WHEN COUNT(*) > 0 THEN true 
          ELSE false 
        END
        FROM ai_agent_webhooks 
        WHERE agent_id = OLD.agent_id 
        AND is_active = true
      ),
      webhook_url = (
        SELECT webhook_url 
        FROM ai_agent_webhooks 
        WHERE agent_id = OLD.agent_id 
        AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      ),
      updated_at = now()
    WHERE id = OLD.agent_id;
    
    RETURN OLD;
  END IF;
  
  -- For INSERT and UPDATE operations
  UPDATE ai_agents 
  SET 
    is_webhook_enabled = NEW.is_active,
    webhook_url = CASE 
      WHEN NEW.is_active THEN NEW.webhook_url 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = NEW.agent_id;
  
  RETURN NEW;
END;
$function$;