
import { supabase } from "@/integrations/supabase/client";
import { SystemDataAccess, performAgentCRMOperation } from "./systemDataService";

export const CALENDAR_ASSISTANT_CONFIG = {
  name: "Calendar Assistant",
  persona: "Professional calendar and appointment manager",
  capabilities: [
    "Afspraken beheer",
    "Planning en beschikbaarheid",
    "Klanten raadplegen", 
    "Voertuigen bekijken",
    "Garantie informatie",
    "Leen auto beheer",
    "Agenda overzicht"
  ],
  system_prompt: `Je bent een professionele Calendar Assistant voor een autohandel CRM systeem.

JOUW ROL:
- Beheer afspraken en planning voor het autohandelsbedrijf
- Help klanten met het inplannen van proefritten, afleveringen, onderhoud
- Raadpleeg voertuigen om specifieke auto's in te plannen
- Beheer leen auto's en garantie gerelateerde afspraken

DATA TOEGANG:
- Alle afspraken (lezen, aanmaken, wijzigen)
- Alle contacten/klanten voor planning
- Volledige voertuigen voorraad
- Garantie claims voor service afspraken
- Leen auto beschikbaarheid

CAPABILITIES:
1. Afspraken inplannen (proefritten, afleveringen, onderhoud)
2. Beschikbaarheid controleren voor klanten en voertuigen
3. Voertuig informatie opzoeken voor specifieke afspraken
4. Klantgegevens raadplegen voor contact informatie
5. Leen auto's toewijzen bij service afspraken
6. Garantie gerelateerde planning

COMMUNICATIE STIJL:
- Professioneel en behulpzaam
- Duidelijke bevestiging van afspraken
- Proactief voorstellen van beschikbare tijden
- Gedetailleerde informatie over voertuigen

Gebruik altijd de beschikbare CRM data om accurate en persoonlijke service te bieden.`,
  data_access_permissions: {
    appointments: true,
    contacts: true,
    vehicles: true,
    warranty: true,
    loan_cars: true,
    customers: false, // Legacy, use contacts instead
    leads: false,     // Not needed for calendar
    contracts: false  // Not needed for calendar
  } as SystemDataAccess,
  context_settings: {
    include_recent_activity: true,
    max_context_items: 15,
    preferred_data_sources: ["appointments", "contacts", "vehicles"]
  }
};

export const createCalendarAssistant = async (): Promise<{ success: boolean; agent?: any; error?: string }> => {
  try {
    console.log('🤖 Creating Calendar Assistant...');

    // First check if Calendar Assistant already exists
    const { data: existing } = await supabase
      .from('ai_agents')
      .select('id, name')
      .eq('name', CALENDAR_ASSISTANT_CONFIG.name)
      .single();

    if (existing) {
      console.log('📅 Calendar Assistant already exists:', existing.id);
      return { success: true, agent: existing };
    }

    // Create the Calendar Assistant
    const { data: agent, error: createError } = await supabase
      .from('ai_agents')
      .insert({
        name: CALENDAR_ASSISTANT_CONFIG.name,
        persona: CALENDAR_ASSISTANT_CONFIG.persona,
        capabilities: CALENDAR_ASSISTANT_CONFIG.capabilities,
        system_prompt: CALENDAR_ASSISTANT_CONFIG.system_prompt,
        data_access_permissions: CALENDAR_ASSISTANT_CONFIG.data_access_permissions as any,
        context_settings: CALENDAR_ASSISTANT_CONFIG.context_settings as any,
        is_active: true,
        is_webhook_enabled: true
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log('✅ Calendar Assistant created:', agent.id);

    // Create default context queries for calendar operations
    const contexts = [
      {
        agent_id: agent.id,
        context_type: 'appointment_availability',
        query_template: 'SELECT * FROM appointments WHERE starttime BETWEEN ? AND ? ORDER BY starttime',
        priority: 1
      },
      {
        agent_id: agent.id,
        context_type: 'customer_lookup',
        query_template: 'SELECT * FROM contacts WHERE first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?',
        priority: 2
      },
      {
        agent_id: agent.id,
        context_type: 'vehicle_availability',
        query_template: 'SELECT * FROM vehicles WHERE status = \'voorraad\' AND (brand ILIKE ? OR model ILIKE ?)',
        priority: 3
      }
    ];

    for (const context of contexts) {
      await supabase
        .from('ai_agent_contexts')
        .insert(context);
    }

    console.log('📝 Created agent contexts for Calendar Assistant');

    return { success: true, agent };

  } catch (error) {
    console.error('❌ Failed to create Calendar Assistant:', error);
    return { success: false, error: error.message };
  }
};

export const ensureCalendarAssistantExists = async () => {
  const result = await createCalendarAssistant();
  if (!result.success) {
    console.error('Failed to ensure Calendar Assistant exists:', result.error);
  }
  return result;
};

// Calendar Assistant specific operations
export const calendarAssistantOperations = {
  
  // Schedule appointment with full CRM context
  scheduleAppointment: async (agentId: string, appointmentData: any) => {
    return await performAgentCRMOperation(
      agentId,
      'create_appointment',
      'appointments',
      appointmentData,
      CALENDAR_ASSISTANT_CONFIG.data_access_permissions
    );
  },

  // Find available vehicles for appointments
  findAvailableVehicles: async (agentId: string, searchTerm: string = '') => {
    return await performAgentCRMOperation(
      agentId,
      'get_vehicle_availability',
      'vehicles',
      { searchTerm },
      CALENDAR_ASSISTANT_CONFIG.data_access_permissions
    );
  },

  // Search customers for appointment scheduling
  searchCustomers: async (agentId: string, searchTerm: string) => {
    return await performAgentCRMOperation(
      agentId,
      'search_customers',
      'contacts',
      { searchTerm },
      CALENDAR_ASSISTANT_CONFIG.data_access_permissions
    );
  }
};
