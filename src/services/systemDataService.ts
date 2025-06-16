
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess, SystemData } from "@/types/systemData";
import { 
  fetchAppointments, 
  fetchContacts, 
  fetchVehicles, 
  fetchLeads, 
  fetchContracts 
} from "./dataFetchers";
import { fetchRecentActivity } from "./recentActivityService";
import { performAgentCRMOperation } from "./crmOperationsService";

// Re-export types and functions for backward compatibility
export type { 
  SystemDataAccess, 
  AgentContext, 
  Contact, 
  Vehicle, 
  Lead, 
  Contract, 
  SystemData 
} from "@/types/systemData";

export { 
  createAgentContext, 
  getAgentContexts, 
  updateAgentDataPermissions 
} from "./agentContextService";

export { performAgentCRMOperation } from "./crmOperationsService";

export const getAgentSystemData = async (
  agentId: string, 
  permissions: SystemDataAccess,
  contextSettings: any
): Promise<SystemData> => {
  const systemData: SystemData = {};
  const maxItems = contextSettings?.max_context_items || 10;

  try {
    console.log('🔍 Fetching system data for agent:', agentId, 'with permissions:', permissions);

    // Get agent contexts
    const { data: contexts } = await supabase
      .from('ai_agent_contexts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .order('priority');

    // Fetch all data using the modular services
    systemData.appointments = await fetchAppointments(permissions, maxItems);
    systemData.contacts = await fetchContacts(permissions, maxItems);
    
    const vehicleData = await fetchVehicles(permissions, maxItems);
    systemData.vehicles = vehicleData.vehicles;
    systemData.availableVehicles = vehicleData.availableVehicles;
    
    systemData.leads = await fetchLeads(permissions, maxItems);
    systemData.contracts = await fetchContracts(permissions, maxItems);

    // Recent activity
    if (contextSettings?.include_recent_activity) {
      systemData.recentActivity = await fetchRecentActivity(permissions);
    }

    console.log('✅ Loaded full CRM system data for agent');
    return systemData;

  } catch (error) {
    console.error('❌ Error fetching system data:', error);
    return systemData;
  }
};
