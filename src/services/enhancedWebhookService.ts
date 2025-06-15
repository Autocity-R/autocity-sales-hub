
import { supabase } from "@/integrations/supabase/client";
import { getAgentSystemData, SystemDataAccess } from "./systemDataService";
import { triggerWebhook as originalTriggerWebhook, WebhookPayload, WebhookResponse } from "./webhookService";

export interface EnhancedWebhookPayload extends WebhookPayload {
  systemData?: any;
  agentConfig?: {
    dataAccess: SystemDataAccess;
    contextSettings: any;
    capabilities: string[];
  };
  userInfo?: {
    id: string;
    email: string;
    name: string;
  };
}

export const triggerEnhancedWebhook = async (
  webhookUrl: string,
  payload: WebhookPayload,
  options: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<WebhookResponse> => {
  try {
    // Get agent details with data access permissions
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id, name, capabilities, data_access_permissions, context_settings')
      .eq('id', payload.agentId)
      .single();

    if (!agent) {
      console.error('Agent not found:', payload.agentId);
      return originalTriggerWebhook(webhookUrl, payload, options);
    }

    // Parse to correct SystemDataAccess type if needed
    const data_access_permissions: SystemDataAccess =
      typeof agent.data_access_permissions === "string"
        ? JSON.parse(agent.data_access_permissions)
        : agent.data_access_permissions || {};
    const context_settings =
      typeof agent.context_settings === "string"
        ? JSON.parse(agent.context_settings)
        : agent.context_settings || {};

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    let userInfo = null;
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      userInfo = {
        id: user.id,
        email: profile?.email || user.email || '',
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      };
    }

    // Get system data based on agent permissions
    const systemData = await getAgentSystemData(
      agent.id,
      data_access_permissions,
      context_settings
    );

    // Create enhanced payload
    const enhancedPayload: EnhancedWebhookPayload = {
      ...payload,
      systemData,
      agentConfig: {
        dataAccess: data_access_permissions,
        contextSettings: context_settings,
        capabilities: agent.capabilities || []
      },
      userInfo
    };

    console.log('🚀 Triggering enhanced webhook with system data:', {
      agent: agent.name,
      systemDataKeys: Object.keys(systemData),
      userInfo: userInfo?.email
    });

    // Log the enhanced payload for debugging
    await logEnhancedWebhookCall({
      agentId: agent.id,
      webhookUrl,
      payload: enhancedPayload,
      systemDataSummary: {
        // Only report appointments, rest not guaranteed to exist
        appointments: Array.isArray(systemData.appointments) ? systemData.appointments.length : 0,
        recentActivity: Array.isArray(systemData.recentActivity) ? systemData.recentActivity.length : 0
      }
    });

    return originalTriggerWebhook(webhookUrl, enhancedPayload, options);

  } catch (error) {
    console.error('Error creating enhanced webhook payload:', error);
    // Fallback to original webhook trigger
    return originalTriggerWebhook(webhookUrl, payload, options);
  }
};

const logEnhancedWebhookCall = async (logData: {
  agentId: string;
  webhookUrl: string;
  payload: EnhancedWebhookPayload;
  systemDataSummary: any;
}) => {
  try {
    await supabase
      .from('ai_webhook_logs')
      .insert({
        agent_id: logData.agentId,
        webhook_url: logData.webhookUrl,
        request_payload: {
          ...logData.payload,
          systemDataSummary: logData.systemDataSummary
        } as any,
        success: true,
        status_code: 200,
        processing_time_ms: 0,
        retry_attempt: 0
      });
  } catch (error) {
    console.error('Error logging enhanced webhook call:', error);
  }
};

export const testEnhancedWebhook = async (
  agentId: string,
  webhookUrl: string
): Promise<WebhookResponse> => {
  const testPayload: WebhookPayload = {
    sessionId: 'test_session_' + Date.now(),
    message: 'Dit is een test bericht om de enhanced webhook functionaliteit te testen.',
    workflowType: 'test',
    agentId: agentId,
    userContext: { test: true }
  };

  return triggerEnhancedWebhook(webhookUrl, testPayload, {
    timeout: 30000,
    retries: 1
  });
};
