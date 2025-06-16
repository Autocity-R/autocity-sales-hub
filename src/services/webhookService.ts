
import { supabase } from "@/integrations/supabase/client";

export interface WebhookPayload {
  sessionId: string;
  message: string;
  userContext?: any;
  workflowType: string;
  agentId: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  processingTime?: number;
}

export const triggerWebhook = async (
  webhookUrl: string,
  payload: WebhookPayload,
  options: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<WebhookResponse> => {
  const startTime = Date.now();
  const { timeout = 30000, retries = 3, headers = {} } = options;

  // Check if webhook is enabled for this agent
  const { data: agentData } = await supabase
    .from('ai_agents')
    .select('is_webhook_enabled, webhook_url')
    .eq('id', payload.agentId)
    .single();

  if (!agentData?.is_webhook_enabled || !agentData?.webhook_url) {
    console.log('🚫 Webhook disabled or not configured for agent:', payload.agentId);
    return {
      success: false,
      message: 'Webhook is niet geactiveerd voor deze agent',
    };
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`🔄 Webhook attempt ${attempt + 1}/${retries} to:`, webhookUrl);
      console.log('📤 Webhook payload:', payload);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log successful webhook call
      await logWebhookCall({
        webhookUrl,
        payload,
        response: data,
        success: true,
        statusCode: response.status,
        processingTime,
        retryAttempt: attempt,
      });

      console.log('✅ Webhook successful:', data);
      return {
        success: true,
        message: data.message || 'Webhook executed successfully',
        data: data.data || data,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const isLastAttempt = attempt === retries - 1;
      
      console.error(`❌ Webhook attempt ${attempt + 1} failed:`, error);
      
      if (isLastAttempt) {
        // Log failed webhook call
        await logWebhookCall({
          webhookUrl,
          payload,
          success: false,
          statusCode: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
          retryAttempt: attempt,
        });

        return {
          success: false,
          message: `Webhook failed after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    message: 'Webhook failed: Maximum retries exceeded',
  };
};

const logWebhookCall = async (logData: {
  webhookUrl: string;
  payload: WebhookPayload;
  response?: any;
  success: boolean;
  statusCode: number;
  errorMessage?: string;
  processingTime: number;
  retryAttempt: number;
}) => {
  try {
    const { error } = await supabase
      .from('ai_webhook_logs')
      .insert({
        agent_id: logData.payload.agentId,
        webhook_url: logData.webhookUrl,
        request_payload: logData.payload as any,
        response_payload: logData.response as any,
        success: logData.success,
        status_code: logData.statusCode,
        error_message: logData.errorMessage,
        processing_time_ms: logData.processingTime,
        retry_attempt: logData.retryAttempt,
      });

    if (error) {
      console.error('Failed to log webhook call:', error);
    }
  } catch (err) {
    console.error('Error logging webhook call:', err);
  }
};

export const getAgentWebhooks = async (agentId: string) => {
  const { data, error } = await supabase
    .from('ai_agent_webhooks')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
};

export const checkWebhookStatus = async (agentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('ai_agents')
      .select('is_webhook_enabled, webhook_url')
      .eq('id', agentId)
      .single();

    if (error) {
      console.error('Error checking webhook status:', error);
      return false;
    }

    return !!(data?.is_webhook_enabled && data?.webhook_url);
  } catch (error) {
    console.error('Error checking webhook status:', error);
    return false;
  }
};

// New function to save webhook with proper conflict handling
export const saveWebhookConfiguration = async (data: {
  agentId: string;
  webhookUrl: string;
  enabled: boolean;
  config: any;
  webhookName: string;
  workflowType: string;
  retryCount: number;
  timeoutSeconds: number;
  headers: any;
}) => {
  try {
    // First update the agent
    const { error: agentError } = await supabase
      .from('ai_agents')
      .update({
        webhook_url: data.webhookUrl,
        is_webhook_enabled: data.enabled,
        webhook_config: data.config,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.agentId);

    if (agentError) throw agentError;

    // Check if webhook already exists
    const { data: existingWebhook } = await supabase
      .from('ai_agent_webhooks')
      .select('id')
      .eq('agent_id', data.agentId)
      .maybeSingle();

    let webhookError;
    
    if (existingWebhook) {
      // Update existing webhook
      const { error } = await supabase
        .from('ai_agent_webhooks')
        .update({
          webhook_name: data.webhookName,
          webhook_url: data.webhookUrl,
          workflow_type: data.workflowType,
          is_active: data.enabled,
          retry_count: data.retryCount,
          timeout_seconds: data.timeoutSeconds,
          headers: data.headers,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', data.agentId);
      
      webhookError = error;
    } else {
      // Create new webhook
      const { error } = await supabase
        .from('ai_agent_webhooks')
        .insert({
          agent_id: data.agentId,
          webhook_name: data.webhookName,
          webhook_url: data.webhookUrl,
          workflow_type: data.workflowType,
          is_active: data.enabled,
          retry_count: data.retryCount,
          timeout_seconds: data.timeoutSeconds,
          headers: data.headers,
        });
      
      webhookError = error;
    }

    if (webhookError) throw webhookError;

    return { success: true };
  } catch (error) {
    console.error('Error saving webhook configuration:', error);
    throw error;
  }
};
