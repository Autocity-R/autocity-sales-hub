-- ============================================
-- PHASE 1: Fix Critical Privilege Escalation
-- ============================================

-- Step 1: Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'manager', 'verkoper', 'operationeel', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL;

-- Step 4: Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 5: Update existing helper functions to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin_user.user_id
      AND role IN ('admin', 'owner')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$function$;

-- Step 6: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (is_admin_or_owner());

CREATE POLICY "Admin users can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- Step 7: Update profiles RLS policies to prevent role modification
DROP POLICY IF EXISTS "Admin users can update all profiles" ON public.profiles;

CREATE POLICY "Admin users can update all profiles (except role)"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 8: Remove role column from profiles (will be done after frontend update)
-- This will be executed in a follow-up migration after frontend is updated
-- ALTER TABLE public.profiles DROP COLUMN role;

-- ============================================
-- PHASE 2: Secure Email Communication Data
-- ============================================

-- Fix email_messages RLS policies
DROP POLICY IF EXISTS "Users can view all email messages" ON email_messages;
DROP POLICY IF EXISTS "System can manage email messages" ON email_messages;

CREATE POLICY "Authenticated users can view email messages"
ON email_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert email messages"
ON email_messages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin users can manage email messages"
ON email_messages FOR ALL
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- Fix email_threads RLS policies
DROP POLICY IF EXISTS "Users can view all email threads" ON email_threads;
DROP POLICY IF EXISTS "System can manage email threads" ON email_threads;

CREATE POLICY "Authenticated users can view email threads"
ON email_threads FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert email threads"
ON email_threads FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admin users can manage email threads"
ON email_threads FOR ALL
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

-- ============================================
-- PHASE 3: Fix Database Function Security
-- ============================================

-- Fix all functions missing SET search_path

CREATE OR REPLACE FUNCTION public.update_vehicle_files_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_email_threads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_task_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_thread_message_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.log_vehicle_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE NOTICE 'Vehicle % status changed from % to %', NEW.id, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_vehicle_import_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.import_status IS DISTINCT FROM NEW.import_status) OR 
     (OLD.details IS DISTINCT FROM NEW.details) THEN
    NEW.import_updated_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;