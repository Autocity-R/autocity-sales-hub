
import { useCallback } from 'react';
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
    console.log('🚀 Starting processWebhookMessage with direct OpenAI integration:', {
      agentId,
      sessionId: session.id,
      messageContent: content,
      messagesCount: messages.length
    });

    try {
      // Check if this is Hendrik (sales agent) - use direct OpenAI integration
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select('name, capabilities')
        .eq('id', agentId)
        .single();

      const isHendrikAgent = agentData?.name?.toLowerCase().includes('hendrik') || 
                             agentData?.capabilities?.includes('email-processing') ||
                             agentData?.capabilities?.includes('lead-scoring');

      if (isHendrikAgent) {
        console.log('🤖 Using direct OpenAI integration for Hendrik');
        
        // Call our new Hendrik AI Chat edge function
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
          'hendrik-ai-chat',
          {
            body: {
              sessionId: session.id,
              message: content,
              agentId: agentId,
              userContext: {
                ...session.context,
                sessionToken: session.sessionToken,
                messageHistory: messages.slice(-3).map(m => ({
                  type: m.messageType,
                  content: m.content,
                  timestamp: m.createdAt
                }))
              }
            }
          }
        );

        if (aiError) {
          console.error('❌ Direct AI integration error:', aiError);
          throw new Error(`AI service error: ${aiError.message}`);
        }

        const processingTime = Date.now() - startTime;
        
        console.log('✅ Direct OpenAI integration successful:', {
          success: aiResponse.success,
          hasMessage: !!aiResponse.message,
          functionCalled: aiResponse.function_called,
          contextUsed: aiResponse.context_used,
          processingTime
        });

        if (!aiResponse.success) {
          throw new Error(aiResponse.error || 'AI service failed');
        }

        return {
          success: true,
          message: aiResponse.message || 'Ik heb je bericht verwerkt.',
          data: {
            function_called: aiResponse.function_called,
            function_result: aiResponse.function_result,
            context_used: aiResponse.context_used
          },
          processingTime
        };
      }

      // For other agents, fall back to webhook system (if configured)
      console.log('🔄 Using webhook system for non-Hendrik agent');
      
      const { data: webhookAgent } = await supabase
        .from('ai_agents')
        .select('webhook_url, webhook_config, is_webhook_enabled')
        .eq('id', agentId)
        .single();

      if (!webhookAgent?.is_webhook_enabled || !webhookAgent?.webhook_url) {
        return {
          success: false,
          message: 'Deze agent heeft geen direct AI systeem of webhook geconfigureerd. Hendrik heeft wel directe AI integratie beschikbaar.',
          processingTime: Date.now() - startTime
        };
      }

      // Use existing webhook logic for other agents
      const { triggerEnhancedWebhook } = await import('@/services/enhancedWebhookService');
      
      const webhookResult = await triggerEnhancedWebhook(
        webhookAgent.webhook_url,
        {
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
          }
        },
        {
          timeout: 30000,
          retries: 3,
          headers: {},
        }
      );

      const processingTime = Date.now() - startTime;

      return {
        success: webhookResult.success,
        message: webhookResult.message || 'Ik heb je verzoek verwerkt.',
        data: webhookResult.data,
        processingTime
      };

    } catch (error) {
      console.error('❌ Message processing error:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        message: 'Sorry, er is een fout opgetreden bij het verwerken van je bericht. Probeer het opnieuw.',
        processingTime
      };
    }
  }, [toast]);

  return {
    processWebhookMessage,
  };
};
