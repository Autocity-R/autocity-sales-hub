
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

    // Fetch appointments if permitted
    if (permissions.appointments) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, title, starttime, endtime, customername, status, type, location, created_at, vehiclebrand, vehiclemodel')
        .gte('starttime', new Date().toISOString())
        .order('starttime', { ascending: true })
        .limit(maxItems);
      
      systemData.appointments = appointments || [];
      console.log('📅 Loaded appointments:', appointments?.length || 0);
    }

    // Fetch contacts/customers if permitted
    if (permissions.contacts || permissions.customers) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, type, company_name, first_name, last_name, email, phone, address_street, address_city, created_at')
        .order('created_at', { ascending: false })
        .limit(maxItems * 2); // More contacts for scheduling
      
      systemData.contacts = contacts || [];
      console.log('👥 Loaded contacts:', contacts?.length || 0);
    }

    // Fetch vehicles if permitted
    if (permissions.vehicles) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, year, color, license_number, vin, mileage, status, location, selling_price, customer_id, created_at')
        .order('created_at', { ascending: false })
        .limit(maxItems * 3); // More vehicles for inventory browsing
      
      systemData.vehicles = vehicles || [];
      
      // Separate available vehicles for easy scheduling
      systemData.availableVehicles = vehicles?.filter(v => v.status === 'voorraad') || [];
      console.log('🚗 Loaded vehicles:', vehicles?.length || 0, 'available:', systemData.availableVehicles.length);
    }

    // Fetch leads if permitted
    if (permissions.leads) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, status, priority, first_name, last_name, email, phone, interested_vehicle, assigned_to, created_at')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      
      systemData.leads = leads || [];
      console.log('📈 Loaded leads:', leads?.length || 0);
    }

    // Fetch contracts if permitted
    if (permissions.contracts) {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, contract_number, type, status, customer_id, vehicle_id, contract_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(maxItems);
      
      systemData.contracts = contracts || [];
      console.log('📄 Loaded contracts:', contracts?.length || 0);
    }

    // Get recent activity if enabled
    if (contextSettings?.include_recent_activity) {
      const recentActivity = [];

      // Recent appointments
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

      // Recent vehicle status changes
      if (permissions.vehicles) {
        const { data: recentVehicles } = await supabase
          .from('vehicles')
          .select('id, brand, model, status, created_at')
          .order('updated_at', { ascending: false })
          .limit(3);

        recentVehicles?.forEach(vehicle => {
          recentActivity.push({
            type: 'vehicle',
            id: vehicle.id,
            description: `${vehicle.brand} ${vehicle.model} status: ${vehicle.status}`,
            timestamp: vehicle.created_at
          });
        });
      }

      systemData.recentActivity = recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    }

    console.log('✅ System data loaded successfully:', Object.keys(systemData));
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

      case 'get_vehicle_availability':
        if (!permissions.vehicles) {
          return { success: false, error: 'No vehicle permissions' };
        }

        const { data: availableVehicles, error: vehicleError } = await supabase
          .from('vehicles')
          .select('id, brand, model, year, color, status, location')
          .eq('status', 'voorraad')
          .ilike('brand', `%${data.searchTerm || ''}%`);

        if (vehicleError) throw vehicleError;
        return { success: true, result: availableVehicles };

      case 'search_customers':
        if (!permissions.contacts && !permissions.customers) {
          return { success: false, error: 'No customer permissions' };
        }

        const { data: customers, error: customerError } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, company_name')
          .or(`first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`)
          .limit(20);

        if (customerError) throw customerError;
        return { success: true, result: customers };

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

  } catch (error) {
    console.error('❌ Agent CRM Operation failed:', error);
    return { success: false, error: error.message };
  }
};
