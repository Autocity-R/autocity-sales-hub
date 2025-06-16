
import { supabase } from "@/integrations/supabase/client";

export const logWebhookCall = async (
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
    console.log('📝 Attempting to log webhook call...', {
      agentId,
      webhookUrl,
      statusCode,
      success,
      processingTime,
      attempt
    });

    const { error } = await supabase
      .from('ai_webhook_logs')
      .insert({
        agent_id: agentId,
        webhook_url: webhookUrl,
        request_payload: {
          message: payload.message,
          sessionId: payload.sessionId,
          workflowType: payload.workflowType,
          timestamp: new Date().toISOString()
        },
        response_payload: response,
        status_code: statusCode,
        success: success,
        processing_time_ms: processingTime,
        retry_attempt: attempt + 1,
        error_message: errorMessage || null
      });

    if (error) {
      console.error('❌ Failed to log webhook call:', error);
    } else {
      console.log('✅ Webhook call logged successfully');
    }
  } catch (error) {
    console.error('❌ Exception while logging webhook call:', error);
  }
};
