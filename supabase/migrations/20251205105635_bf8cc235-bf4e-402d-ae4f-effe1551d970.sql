-- Fix foreign key constraint on ai_chat_sessions to allow user deletion
ALTER TABLE public.ai_chat_sessions
DROP CONSTRAINT IF EXISTS ai_chat_sessions_user_id_fkey;

ALTER TABLE public.ai_chat_sessions
ADD CONSTRAINT ai_chat_sessions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;