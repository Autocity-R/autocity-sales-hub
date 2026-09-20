DROP POLICY IF EXISTS aftersales_can_read_agent_chats ON public.garantie_agent_chats;
CREATE POLICY aftersales_can_read_agent_chats ON public.garantie_agent_chats
FOR SELECT TO authenticated
USING (
  is_admin_user(auth.uid())
  OR has_role(auth.uid(), 'aftersales_manager'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'operationeel_directeur'::app_role)
);