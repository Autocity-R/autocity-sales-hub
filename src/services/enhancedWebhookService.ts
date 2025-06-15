import { supabase } from "@/integrations/supabase/client";

// Define webhook types locally since they're not exported from webhookService
export interface WebhookPayload {
  agentId: string;
  message: string;
  sessionId: string;
  workflowType: string;
  userContext?: any;
}

export interface WebhookOptions {
  retries?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface WebhookResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  processingTime?: number;
}

export const triggerEnhancedWebhook = async (
  webhookUrl: string,
  payload: WebhookPayload,
  options: WebhookOptions = {}
): Promise<WebhookResult> => {
  const startTime = Date.now();
  let attempt = 0;
  const maxRetries = options.retries || 3;

  while (attempt <= maxRetries) {
    try {
      console.log(`🔄 Enhanced webhook attempt ${attempt + 1}/${maxRetries + 1} to:`, webhookUrl);

      // Get agent details and permissions
      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select('id, name, data_access_permissions, context_settings, capabilities')
        .eq('id', payload.agentId)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent not found: ${payload.agentId}`);
      }

      // Parse permissions safely
      const permissions = typeof agent.data_access_permissions === 'string' 
        ? JSON.parse(agent.data_access_permissions)
        : agent.data_access_permissions || {};

      const contextSettings = typeof agent.context_settings === 'string'
        ? JSON.parse(agent.context_settings)
        : agent.context_settings || {};

      console.log('🤖 Agent permissions:', permissions);

      // Get comprehensive system data based on permissions
      const { getAgentSystemData } = await import('./systemDataService');
      const systemData = await getAgentSystemData(payload.agentId, permissions, contextSettings);

      // Enhance payload with full CRM context
      const enhancedPayload = {
        ...payload,
        agent: {
          id: agent.id,
          name: agent.name,
          capabilities: agent.capabilities || [],
          permissions: permissions
        },
        systemData: systemData,
        context: {
          ...payload.userContext,
          crmData: systemData,
          agentCapabilities: agent.capabilities,
          timestamp: new Date().toISOString(),
          totalAppointments: systemData.appointments?.length || 0,
          totalContacts: systemData.contacts?.length || 0,
          totalVehicles: systemData.vehicles?.length || 0,
          availableVehicles: systemData.availableVehicles?.length || 0,
          recentActivity: systemData.recentActivity || []
        },
        // Add helpful context for n8n workflows
        workflow: {
          type: payload.workflowType,
          suggestedActions: getSuggestedActions(payload.message, systemData, permissions),
          dataOverview: {
            appointments: {
              upcoming: systemData.appointments?.filter(a => new Date(a.starttime) > new Date()).length || 0,
              today: systemData.appointments?.filter(a => {
                const today = new Date().toDateString();
                return new Date(a.starttime).toDateString() === today;
              }).length || 0
            },
            vehicles: {
              available: systemData.availableVehicles?.length || 0,
              total: systemData.vehicles?.length || 0
            },
            contacts: {
              total: systemData.contacts?.length || 0,
              customers: systemData.contacts?.filter(c => c.type === 'b2c').length || 0,
              business: systemData.contacts?.filter(c => c.type === 'b2b').length || 0
            }
          }
        }
      };

      console.log('📤 Sending enhanced payload with CRM data:', {
        agentName: agent.name,
        dataTypes: Object.keys(systemData),
        appointmentsCount: systemData.appointments?.length || 0,
        contactsCount: systemData.contacts?.length || 0,
        vehiclesCount: systemData.vehicles?.length || 0
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CRM-AI-Agent/1.0',
          ...options.headers,
        },
        body: JSON.stringify(enhancedPayload),
        signal: AbortSignal.timeout(options.timeout || 30000),
      });

      const responseData = await response.text();
      let parsedData: any = responseData;

      try {
        parsedData = JSON.parse(responseData);
      } catch {
        // Keep as text if not JSON
      }

      const processingTime = Date.now() - startTime;

      // Log the enhanced webhook call
      await logWebhookCall(
        payload.agentId,
        webhookUrl,
        enhancedPayload,
        parsedData,
        response.status,
        response.ok,
        processingTime,
        attempt
      );

      if (response.ok) {
        console.log('✅ Enhanced webhook successful with full CRM data');
        return {
          success: true,
          data: parsedData,
          message: parsedData?.message || 'Webhook executed successfully with CRM context',
          processingTime
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      attempt++;
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ Enhanced webhook attempt ${attempt} failed:`, error);

      if (attempt > maxRetries) {
        await logWebhookCall(
          payload.agentId,
          webhookUrl,
          payload,
          null,
          0,
          false,
          processingTime,
          attempt - 1,
          error.message
        );

        return {
          success: false,
          error: error.message,
          message: 'Failed to execute webhook after multiple retries',
          processingTime
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    message: 'Webhook failed after all retry attempts'
  };
};

// Helper function to suggest actions based on message content and available data
const getSuggestedActions = (message: string, systemData: any, permissions: any): string[] => {
  const suggestions: string[] = [];
  const lowerMessage = message.toLowerCase();

  if (permissions.appointments) {
    if (lowerMessage.includes('afspraak') || lowerMessage.includes('inplan')) {
      suggestions.push('create_appointment');
    }
    if (lowerMessage.includes('beschikbaar') || lowerMessage.includes('vrij')) {
      suggestions.push('check_availability');
    }
  }

  if (permissions.vehicles) {
    if (lowerMessage.includes('auto') || lowerMessage.includes('voertuig') || lowerMessage.includes('car')) {
      suggestions.push('search_vehicles');
    }
    if (lowerMessage.includes('voorraad') || lowerMessage.includes('beschikbare')) {
      suggestions.push('list_available_vehicles');
    }
  }

  if (permissions.contacts) {
    if (lowerMessage.includes('klant') || lowerMessage.includes('contact') || lowerMessage.includes('customer')) {
      suggestions.push('search_customers');
    }
  }

  return suggestions;
};

// Log webhook calls for auditing and debugging
const logWebhookCall = async (
  agentId: string,
  webhookUrl: string,
  payload: any,
  response: any,
  statusCode: number,
  success: boolean,
  processingTime: number,
  attempt: number,
  errorMessage?: string
) => {
  try {
    await supabase
      .from('ai_agent_webhook_logs')
      .insert({
        agent_id: agentId,
        webhook_url: webhookUrl,
        request_payload: {
          message: payload.message,
          sessionId: payload.sessionId,
          workflowType: payload.workflowType,
          timestamp: new Date().toISOString()
        },
        response_data: response,
        status_code: statusCode,
        success: success,
        processing_time_ms: processingTime,
        attempt_number: attempt + 1,
        error_message: errorMessage || null
      });
  } catch (error) {
    console.error('Failed to log webhook call:', error);
  }
};
