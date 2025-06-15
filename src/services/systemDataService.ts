import { supabase } from "@/integrations/supabase/client";

export interface SystemDataAccess {
  leads: boolean;
  customers: boolean;
  vehicles: boolean;
  appointments: boolean;
  contracts: boolean;
  contacts: boolean;     // Added for full contact management
  warranty: boolean;     // Added for warranty claims
  loan_cars: boolean;    // Added for loan car management
}

export interface AgentContext {
  id: string;
  agent_id: string;
  context_type: string;
  query_template: string;
  is_active: boolean;
  priority: number;
}

export interface Contact {
  id: string;
  type: 'supplier' | 'b2b' | 'b2c';
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  license_number?: string;
  vin?: string;
  mileage?: number;
  status: string;
  location?: string;
  selling_price?: number;
  customer_id?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  status: string;
  priority: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  interested_vehicle?: string;
  assigned_to?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  type: 'b2b' | 'b2c';
  status: string;
  customer_id: string;
  vehicle_id: string;
  contract_amount: number;
  created_at: string;
}

export interface SystemData {
  appointments?: any[];
  contacts?: Contact[];
  vehicles?: Vehicle[];
  leads?: Lead[];
  contracts?: Contract[];
  recentActivity?: any[];
  availableVehicles?: Vehicle[];
  warranty_claims?: any[];
  loan_cars?: any[];
}

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

    // Appointments
    if (permissions.appointments) {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('starttime', new Date().toISOString())
        .order('starttime', { ascending: true })
        .limit(maxItems);
      systemData.appointments = appointments || [];
      console.log('📅 Loaded appointments:', appointments?.length || 0);
    }

    // Contacts
    if (permissions.contacts || permissions.customers) {
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      systemData.contacts = contacts || [];
      console.log('👥 Loaded contacts:', contacts?.length || 0);
    }

    // Vehicles
    if (permissions.vehicles) {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      systemData.vehicles = vehicles || [];
      systemData.availableVehicles = (vehicles || []).filter(v => v.status === 'voorraad');
      console.log('🚗 Loaded vehicles:', vehicles?.length || 0);
    }

    // Leads
    if (permissions.leads) {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      systemData.leads = leads || [];
      console.log('📈 Loaded leads:', leads?.length || 0);
    }

    // Contracts
    if (permissions.contracts) {
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      systemData.contracts = contracts || [];
      console.log('📄 Loaded contracts:', contracts?.length || 0);
    }

    // Recent activity
    if (contextSettings?.include_recent_activity) {
      const recentActivity = [];

      // Appointments
      if (permissions.appointments) {
        const { data: recentAppts } = await supabase
          .from('appointments')
          .select('id, title, customername, created_at, type')
          .order('created_at', { ascending: false })
          .limit(5);

        recentAppts?.forEach(appt => {
          recentActivity.push({
            type: 'appointment',
            id: appt.id,
            description: `${appt.type}: ${appt.title} met ${appt.customername}`,
            timestamp: appt.created_at
          });
        });
      }

      // New: recent contacts
      if (permissions.contacts || permissions.customers) {
        const { data: recentContacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        recentContacts?.forEach(contact => {
          recentActivity.push({
            type: 'contact',
            id: contact.id,
            description: `Nieuwe contact: ${contact.first_name} ${contact.last_name}`,
            timestamp: contact.created_at
          });
        });
      }

      // Vehicles
      if (permissions.vehicles) {
        const { data: recentVehicles } = await supabase
          .from('vehicles')
          .select('id, brand, model, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        recentVehicles?.forEach(vehicle => {
          recentActivity.push({
            type: 'vehicle',
            id: vehicle.id,
            description: `Auto toegevoegd: ${vehicle.brand} ${vehicle.model} (${vehicle.status})`,
            timestamp: vehicle.created_at
          });
        });
      }

      systemData.recentActivity = recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 12);
    }

    console.log('✅ Loaded full CRM system data for agent');
    return systemData;

  } catch (error) {
    console.error('❌ Error fetching system data:', error);
    return systemData;
  }
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

// New function to perform CRM operations via agents
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
        if (!permissions.appointments) {
          return { success: false, error: 'No appointment permissions' };
        }

        const { data: newAppointment, error: createError } = await supabase
          .from('appointments')
          .insert({
            ...data,
            created_by_ai: true,
            ai_agent_id: agentId,
            createdby: `AI Agent: Calendar Assistant`
          })
          .select()
          .single();

        if (createError) throw createError;
        return { success: true, result: newAppointment };

      case 'update_appointment':
        if (!permissions.appointments) {
          return { success: false, error: 'No appointment permissions' };
        }

        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update(data)
          .eq('id', data.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return { success: true, result: updatedAppointment };

      case 'create_contact':
        if (!permissions.contacts) {
          return { success: false, error: 'No contact permissions' };
        }
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert(data)
          .select()
          .single();
        if (contactError) throw contactError;
        return { success: true, result: newContact };

      case 'search_contacts':
        if (!permissions.contacts) {
          return { success: false, error: 'No contact permissions' };
        }
        const { data: foundContacts, error: findContactError } = await supabase
          .from('contacts')
          .select('*')
          .or(
            `first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`
          )
          .limit(10);
        if (findContactError) throw findContactError;
        return { success: true, result: foundContacts };

      case 'create_vehicle':
        if (!permissions.vehicles) {
          return { success: false, error: 'No vehicle permissions' };
        }
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert(data)
          .select()
          .single();
        if (vehicleError) throw vehicleError;
        return { success: true, result: newVehicle };

      case 'search_vehicles':
        if (!permissions.vehicles) {
          return { success: false, error: 'No vehicle permissions' };
        }
        const { data: foundVehicles, error: findVehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .or(
            `brand.ilike.%${data.searchTerm}%,model.ilike.%${data.searchTerm}%,license_number.ilike.%${data.searchTerm}%`
          )
          .limit(15);
        if (findVehicleError) throw findVehicleError;
        return { success: true, result: foundVehicles };

      case 'create_lead':
        if (!permissions.leads) {
          return { success: false, error: 'No leads permissions' };
        }
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert(data)
          .select()
          .single();
        if (leadError) throw leadError;
        return { success: true, result: newLead };

      case 'search_leads':
        if (!permissions.leads) {
          return { success: false, error: 'No leads permissions' };
        }
        const { data: foundLeads, error: findLeadsError } = await supabase
          .from('leads')
          .select('*')
          .or(
            `first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`
          )
          .limit(15);
        if (findLeadsError) throw findLeadsError;
        return { success: true, result: foundLeads };

      case 'create_contract':
        if (!permissions.contracts) {
          return { success: false, error: 'No contracts permissions' };
        }
        const { data: newContract, error: contractError } = await supabase
          .from('contracts')
          .insert(data)
          .select()
          .single();
        if (contractError) throw contractError;
        return { success: true, result: newContract };

      case 'search_contracts':
        if (!permissions.contracts) {
          return { success: false, error: 'No contracts permissions' };
        }
        const { data: foundContracts, error: findContractsError } = await supabase
          .from('contracts')
          .select('*')
          .or(
            `contract_number.ilike.%${data.searchTerm}%,status.ilike.%${data.searchTerm}%`
          )
          .limit(10);
        if (findContractsError) throw findContractsError;
        return { success: true, result: foundContracts };

      case 'get_vehicle_availability':
        // Return available vehicles
        if (!permissions.vehicles) {
          return { success: false, error: 'No vehicle permissions' };
        }
        const { data: availableVehicles, error: availError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('status', 'voorraad')
          .limit(10);
        if (availError) throw availError;
        return { success: true, result: availableVehicles };

      case 'search_customers':
        if (!permissions.contacts && !permissions.customers) {
          return { success: false, error: 'No contact/customer permissions' };
        }
        // For now: search only in contacts as 'b2c' or 'b2b'
        const { data: foundCustomers, error: custError } = await supabase
          .from('contacts')
          .select('*')
          .in('type', ['b2b', 'b2c'])
          .or(
            `first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`
          )
          .limit(10);
        if (custError) throw custError;
        return { success: true, result: foundCustomers };

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

  } catch (error) {
    console.error('❌ Agent CRM Operation failed:', error);
    return { success: false, error: error.message };
  }
};

