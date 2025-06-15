
import { supabase } from "@/integrations/supabase/client";

export interface SystemDataAccess {
  leads: boolean;
  customers: boolean;
  vehicles: boolean;
  appointments: boolean;
  contracts: boolean;
}

export interface AgentContext {
  id: string;
  agent_id: string;
  context_type: string;
  query_template: string;
  is_active: boolean;
  priority: number;
}

export interface SystemData {
  leads?: any[];
  customers?: any[];
  vehicles?: any[];
  appointments?: any[];
  contracts?: any[];
  recentActivity?: any[];
}

export const getAgentSystemData = async (
  agentId: string, 
  permissions: SystemDataAccess,
  contextSettings: any
): Promise<SystemData> => {
  const systemData: SystemData = {};
  const maxItems = contextSettings?.max_context_items || 10;

  try {
    // Get agent contexts
    const { data: contexts } = await supabase
      .from('ai_agent_contexts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('priority');

    // Execute context queries
    if (contexts) {
      for (const context of contexts) {
        try {
          if (context.context_type === 'lead_data' && permissions.leads) {
            const { data: leads } = await supabase
              .from('leads')
              .select('id, first_name, last_name, email, phone, status, interested_vehicle, budget, created_at')
              .in('status', ['new', 'contacted', 'qualified', 'interested'])
              .order('created_at', { ascending: false })
              .limit(maxItems);
            systemData.leads = leads || [];
          }

          if (context.context_type === 'appointment_data' && permissions.appointments) {
            const { data: appointments } = await supabase
              .from('appointments')
              .select('id, title, starttime, endtime, customername, status, type, created_at')
              .gte('starttime', new Date().toISOString())
              .order('starttime', { ascending: true })
              .limit(maxItems);
            systemData.appointments = appointments || [];
          }
        } catch (error) {
          console.error(`Error executing context query for ${context.context_type}:`, error);
        }
      }
    }

    // Get additional data based on permissions
    if (permissions.customers) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, company, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.min(maxItems, 5));
      systemData.customers = customers || [];
    }

    if (permissions.vehicles) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, license_number, status, price, created_at')
        .in('status', ['available', 'reserved', 'sold'])
        .order('created_at', { ascending: false })
        .limit(Math.min(maxItems, 5));
      systemData.vehicles = vehicles || [];
    }

    // Get recent activity if enabled
    if (contextSettings?.include_recent_activity) {
      const recentActivity = [];
      
      // Recent leads
      if (permissions.leads) {
        const { data: recentLeads } = await supabase
          .from('leads')
          .select('id, first_name, last_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(3);
        
        recentLeads?.forEach(lead => {
          recentActivity.push({
            type: 'lead',
            id: lead.id,
            description: `Nieuwe lead: ${lead.first_name} ${lead.last_name}`,
            timestamp: lead.created_at,
            status: lead.status
          });
        });
      }

      // Recent appointments
      if (permissions.appointments) {
        const { data: recentAppts } = await supabase
          .from('appointments')
          .select('id, title, customername, created_at')
          .order('created_at', { ascending: false })
          .limit(3);
        
        recentAppts?.forEach(appt => {
          recentActivity.push({
            type: 'appointment',
            id: appt.id,
            description: `Nieuwe afspraak: ${appt.title} met ${appt.customername}`,
            timestamp: appt.created_at
          });
        });
      }

      systemData.recentActivity = recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    }

  } catch (error) {
    console.error('Error fetching system data:', error);
  }

  return systemData;
};

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
        data_access_permissions: permissions,
        context_settings: contextSettings
      })
      .eq('id', agentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating agent permissions:', error);
    return false;
  }
};
