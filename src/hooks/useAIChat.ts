
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

    setIsLoading(true);

    try {
      // Add user message
      await addUserMessage(session.id, content);

      // Process webhook message
      const webhookResult = await processWebhookMessage(agentId, session, content, messages);
      
      // Add assistant response
      await addAssistantMessage(
        session.id,
        webhookResult.message,
        webhookResult.success,
        webhookResult.data,
        webhookResult.processingTime
      );

    } catch (error) {
      console.error('Failed to send message:', error);
      
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
