
-- Add RLS policies for ai_webhook_logs table
CREATE POLICY "Authenticated users can insert webhook logs" 
ON public.ai_webhook_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Add RLS policies for ai_chat_messages table  
CREATE POLICY "Users can insert chat messages for their sessions"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM public.ai_chat_sessions 
    WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

-- Add RLS policies for ai_chat_sessions table
CREATE POLICY "Users can insert their own chat sessions"
ON public.ai_chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own chat sessions"
ON public.ai_chat_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
