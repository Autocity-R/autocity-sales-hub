
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess } from "@/types/systemData";

export const performAgentCRMOperation = async (
  agentId: string,
  operation: string,
  entityType: string,
  data: any,
  permissions: SystemDataAccess
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    console.log('🤖 Agent CRM Operation:', { agentId, operation, entityType, data });

    // Check permissions first
    const hasPermission = permissions[entityType as keyof SystemDataAccess];
    if (!hasPermission) {
      return { success: false, error: `Agent does not have permission to access ${entityType}` };
    }

    switch (operation) {
      case 'create_appointment':
        return await createAppointment(agentId, data, permissions);
      case 'update_appointment':
        return await updateAppointment(data, permissions);
      case 'create_contact':
        return await createContact(data, permissions);
      case 'search_contacts':
        return await searchContacts(data, permissions);
      case 'create_vehicle':
        return await createVehicle(data, permissions);
      case 'search_vehicles':
        return await searchVehicles(data, permissions);
      case 'create_lead':
        return await createLead(data, permissions);
      case 'search_leads':
        return await searchLeads(data, permissions);
      case 'create_contract':
        return await createContract(data, permissions);
      case 'search_contracts':
        return await searchContracts(data, permissions);
      case 'get_vehicle_availability':
        return await getVehicleAvailability(permissions);
      case 'search_customers':
        return await searchCustomers(data, permissions);
      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }
  } catch (error) {
    console.error('❌ Agent CRM Operation failed:', error);
    return { success: false, error: error.message };
  }
};

// Individual operation functions
const createAppointment = async (agentId: string, data: any, permissions: SystemDataAccess) => {
  if (!permissions.appointments) {
    return { success: false, error: 'No appointment permissions' };
  }

  const { data: newAppointment, error } = await supabase
    .from('appointments')
    .insert({
      ...data,
      created_by_ai: true,
      ai_agent_id: agentId,
      createdby: `AI Agent: Calendar Assistant`
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: newAppointment };
};

const updateAppointment = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.appointments) {
    return { success: false, error: 'No appointment permissions' };
  }

  const { data: updatedAppointment, error } = await supabase
    .from('appointments')
    .update(data)
    .eq('id', data.id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: updatedAppointment };
};

const createContact = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.contacts) {
    return { success: false, error: 'No contact permissions' };
  }

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: newContact };
};

const searchContacts = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.contacts) {
    return { success: false, error: 'No contact permissions' };
  }

  const { data: foundContacts, error } = await supabase
    .from('contacts')
    .select('*')
    .or(`first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return { success: true, result: foundContacts };
};

const createVehicle = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.vehicles) {
    return { success: false, error: 'No vehicle permissions' };
  }

  const { data: newVehicle, error } = await supabase
    .from('vehicles')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: newVehicle };
};

const searchVehicles = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.vehicles) {
    return { success: false, error: 'No vehicle permissions' };
  }

  const { data: foundVehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .or(`brand.ilike.%${data.searchTerm}%,model.ilike.%${data.searchTerm}%,license_number.ilike.%${data.searchTerm}%`)
    .limit(15);

  if (error) throw error;
  return { success: true, result: foundVehicles };
};

const createLead = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.leads) {
    return { success: false, error: 'No leads permissions' };
  }

  const { data: newLead, error } = await supabase
    .from('leads')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: newLead };
};

const searchLeads = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.leads) {
    return { success: false, error: 'No leads permissions' };
  }

  const { data: foundLeads, error } = await supabase
    .from('leads')
    .select('*')
    .or(`first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`)
    .limit(15);

  if (error) throw error;
  return { success: true, result: foundLeads };
};

const createContract = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.contracts) {
    return { success: false, error: 'No contracts permissions' };
  }

  const { data: newContract, error } = await supabase
    .from('contracts')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return { success: true, result: newContract };
};

const searchContracts = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.contracts) {
    return { success: false, error: 'No contracts permissions' };
  }

  const { data: foundContracts, error } = await supabase
    .from('contracts')
    .select('*')
    .or(`contract_number.ilike.%${data.searchTerm}%,status.ilike.%${data.searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return { success: true, result: foundContracts };
};

const getVehicleAvailability = async (permissions: SystemDataAccess) => {
  if (!permissions.vehicles) {
    return { success: false, error: 'No vehicle permissions' };
  }

  const { data: availableVehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'voorraad')
    .limit(10);

  if (error) throw error;
  return { success: true, result: availableVehicles };
};

const searchCustomers = async (data: any, permissions: SystemDataAccess) => {
  if (!permissions.contacts && !permissions.customers) {
    return { success: false, error: 'No contact/customer permissions' };
  }

  const { data: foundCustomers, error } = await supabase
    .from('contacts')
    .select('*')
    .in('type', ['b2b', 'b2c'])
    .or(`first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`)
    .limit(10);

  if (error) throw error;
  return { success: true, result: foundCustomers };
};
