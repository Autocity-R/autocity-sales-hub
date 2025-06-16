
import { supabase } from "@/integrations/supabase/client";
import { AgentContext, SystemDataAccess } from "@/types/systemData";

export const createAgentContext = async (
  agentId: string,
  contextType: string,
  queryTemplate: string,
  priority: number = 1
): Promise<AgentContext | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_contexts')
      .insert({
        agent_id: agentId,
        context_type: contextType,
        query_template: queryTemplate,
        priority: priority,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating agent context:', error);
    return null;
  }
};

export const getAgentContexts = async (agentId: string): Promise<AgentContext[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_agent_contexts')
      .select('*')
      .eq('agent_id', agentId)
      .order('priority');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching agent contexts:', error);
    return [];
  }
};

export const updateAgentDataPermissions = async (
  agentId: string,
  permissions: SystemDataAccess,
  contextSettings: any
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_agents')
      .update({
        data_access_permissions: permissions as any,
        context_settings: contextSettings as any
      })
      .eq('id', agentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating agent permissions:', error);
    return false;
  }
};
