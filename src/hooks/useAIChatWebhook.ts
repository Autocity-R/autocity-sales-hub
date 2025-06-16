
import { useCallback } from 'react';
import { checkWebhookStatus, WebhookPayload } from '@/services/webhookService';
import { supabase } from '@/integrations/supabase/client';
import { ChatSession, ChatMessage } from '@/services/chatSessionService';
import { useToast } from '@/hooks/use-toast';

export const useAIChatWebhook = () => {
  const { toast } = useToast();

  const processWebhookMessage = useCallback(async (
    agentId: string,
    session: ChatSession,
    content: string,
    messages: ChatMessage[]
  ) => {
    const startTime = Date.now();
    console.log('🚀 Starting processWebhookMessage with:', {
      agentId,
      sessionId: session.id,
      messageContent: content,
      messagesCount: messages.length
    });

    // Check webhook status using unified approach (ai_agents table)
    const hasWebhook = await checkWebhookStatus(agentId);
    console.log('🔍 Webhook status check result:', hasWebhook);
    
    if (!hasWebhook) {
      return {
        success: false,
        message: 'Ik heb je bericht ontvangen, maar er zijn geen workflows geconfigureerd voor deze agent. Configureer een webhook in de agent instellingen.',
        processingTime: Date.now() - startTime
      };
    }

    // Get webhook URL from ai_agents table (unified approach)
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('webhook_url, webhook_config')
      .eq('id', agentId)
      .single();

    console.log('🔍 Agent data from database:', agentData);

    if (!agentData?.webhook_url) {
      return {
        success: false,
        message: 'Webhook is ingeschakeld maar geen URL geconfigureerd. Controleer de configuratie.',
        processingTime: Date.now() - startTime
      };
    }
    
    // Prepare webhook payload
    const payload: WebhookPayload = {
      sessionId: session.id,
      message: content,
      workflowType: 'chat_interaction',
      agentId: agentId,
      userContext: {
        ...session.context,
        currentMessage: content,
        sessionToken: session.sessionToken,
        messageHistory: messages.slice(-5).map(m => ({
          type: m.messageType,
          content: m.content,
          timestamp: m.createdAt
        }))
      },
    };

    console.log('🔄 Sending webhook payload via unified approach:', payload);

    try {
      // Import and use enhanced webhook trigger
      const { triggerEnhancedWebhook } = await import('@/services/enhancedWebhookService');
      
      // Get webhook configuration from ai_agents table with proper type handling
      let webhookConfig: any = {};
      if (agentData.webhook_config) {
        if (typeof agentData.webhook_config === 'object' && agentData.webhook_config !== null) {
          webhookConfig = agentData.webhook_config as any;
        }
      }
      
      console.log('🔧 Webhook config:', webhookConfig);
      
      // Trigger enhanced webhook with safe property access
      const webhookResult = await triggerEnhancedWebhook(
        agentData.webhook_url,
        payload,
        {
          timeout: (typeof webhookConfig.timeout === 'number' ? webhookConfig.timeout : 30) * 1000,
          retries: typeof webhookConfig.retries === 'number' ? webhookConfig.retries : 3,
          headers: (typeof webhookConfig.headers === 'object' && webhookConfig.headers !== null) ? webhookConfig.headers : {},
        }
      );

      console.log('🎯 Webhook result received:', {
        success: webhookResult.success,
        hasMessage: !!webhookResult.message,
        hasData: !!webhookResult.data,
        messageValue: webhookResult.message,
        dataValue: webhookResult.data,
        processingTime: webhookResult.processingTime
      });

      const processingTime = Date.now() - startTime;

      if (!webhookResult.success) {
        toast({
          title: 'Webhook Warning',
          description: 'Er was een probleem met de workflow verwerking.',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Unified webhook approach successful');
      }

      // The enhanced webhook service now handles all message extraction
      // We just use whatever it returns as the message
      const displayMessage = webhookResult.message || 'Ik heb je verzoek verwerkt via de geconfigureerde workflow.';
      
      console.log('🎯 Using message from enhanced webhook service:', displayMessage);

      return {
        success: webhookResult.success,
        message: displayMessage,
        data: webhookResult.data,
        processingTime
      };

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return {
        success: false,
        message: 'Sorry, er is een fout opgetreden bij het verwerken van je bericht. Probeer het opnieuw.',
        processingTime: Date.now() - startTime
      };
    }
  }, [toast]);

  return {
    processWebhookMessage,
  };
};
