
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAIChatSession } from './useAIChatSession';
import { useAIChatMessages } from './useAIChatMessages';
import { useAIChatWebhook } from './useAIChatWebhook';

export const useAIChat = (agentId: string) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    session,
    isInitializing,
    initializeSession,
    endSession: endChatSession,
  } = useAIChatSession(agentId);

  const {
    messages,
    addWelcomeMessage,
    addUserMessage,
    addAssistantMessage,
    clearMessages,
  } = useAIChatMessages();

  const { processWebhookMessage } = useAIChatWebhook();

  const initializeWithWelcome = useCallback(async () => {
    if (!agentId) return;
    
    try {
      const newSession = await initializeSession();
      if (newSession) {
        await addWelcomeMessage(newSession.id, agentId);
      }
    } catch (error) {
      console.error('Failed to initialize session with welcome:', error);
    }
  }, [agentId, initializeSession, addWelcomeMessage]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session || !content.trim()) return;

    console.log('📤 sendMessage called with:', {
      sessionId: session.id,
      agentId,
      content,
      messagesCount: messages.length
    });

    setIsLoading(true);

    try {
      // Add user message
      console.log('➕ Adding user message to chat...');
      await addUserMessage(session.id, content);

      // Process webhook message
      console.log('🔄 Processing webhook message...');
      const webhookResult = await processWebhookMessage(agentId, session, content, messages);
      
      console.log('📥 Webhook result received in sendMessage:', {
        success: webhookResult.success,
        message: webhookResult.message,
        hasData: !!webhookResult.data,
        processingTime: webhookResult.processingTime
      });
      
      // Add assistant response
      console.log('➕ Adding assistant message to chat...');
      await addAssistantMessage(
        session.id,
        webhookResult.message,
        webhookResult.success,
        webhookResult.data,
        webhookResult.processingTime
      );

      console.log('✅ Message flow completed successfully');

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      await addAssistantMessage(
        session.id,
        'Sorry, er is een fout opgetreden bij het verwerken van je bericht. Probeer het opnieuw.'
      );

      toast({
        title: 'Fout',
        description: 'Kon bericht niet versturen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, agentId, messages, addUserMessage, addAssistantMessage, processWebhookMessage, toast]);

  const endSession = useCallback(async () => {
    await endChatSession();
    clearMessages();
  }, [endChatSession, clearMessages]);

  useEffect(() => {
    initializeWithWelcome();
  }, [initializeWithWelcome]);

  return {
    session,
    messages,
    isLoading,
    isInitializing,
    sendMessage,
    endSession,
    reinitialize: initializeWithWelcome,
  };
};
