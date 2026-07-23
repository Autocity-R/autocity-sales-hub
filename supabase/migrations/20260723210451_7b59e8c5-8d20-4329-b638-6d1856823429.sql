-- Garantie Agent chat memory (aftersales-only)
CREATE TABLE IF NOT EXISTS public.garantie_agent_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.garantie_email_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garantie_agent_chats_thread ON public.garantie_agent_chats(thread_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.garantie_agent_chats TO authenticated;
GRANT ALL ON public.garantie_agent_chats TO service_role;

ALTER TABLE public.garantie_agent_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aftersales_can_read_agent_chats" ON public.garantie_agent_chats;
CREATE POLICY "aftersales_can_read_agent_chats" ON public.garantie_agent_chats
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR public.has_role(auth.uid(), 'aftersales_manager')
    OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "aftersales_can_insert_agent_chats" ON public.garantie_agent_chats;
CREATE POLICY "aftersales_can_insert_agent_chats" ON public.garantie_agent_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid())
    OR public.has_role(auth.uid(), 'aftersales_manager')
    OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "aftersales_can_delete_agent_chats" ON public.garantie_agent_chats;
CREATE POLICY "aftersales_can_delete_agent_chats" ON public.garantie_agent_chats
  FOR DELETE TO authenticated
  USING (
    public.is_admin_user(auth.uid())
    OR public.has_role(auth.uid(), 'aftersales_manager')
    OR public.has_role(auth.uid(), 'manager')
  );