
import { useState, useCallback } from 'react';
import { addChatMessage, ChatMessage } from '@/services/chatSessionService';
import { supabase } from '@/integrations/supabase/client';

export const useAIChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addWelcomeMessage = useCallback(async (sessionId: string, agentId: string) => {
    try {
      // Add welcome message with context about agent capabilities
      const { data: agent } = await supabase.from('ai_agents')
        .select('name, capabilities, data_access_permissions')
        .eq('id', agentId)
        .single();
      
      const capabilities = agent?.capabilities || [];
      const dataAccess = agent?.data_access_permissions || {};
      
      let welcomeText = `Hallo! Ik ben ${agent?.name || 'je AI agent'}. `;
      
      if (capabilities.length > 0) {
        welcomeText += `Ik kan je helpen met: ${capabilities.join(', ')}. `;
      }
      
      const accessList = Object.entries(dataAccess)
        .filter(([_, hasAccess]) => hasAccess)
        .map(([key, _]) => {
          switch(key) {
            case 'leads': return 'leads';
            case 'customers': return 'klanten';
            case 'vehicles': return 'voertuigen';
            case 'appointments': return 'afspraken';
            case 'contracts': return 'contracten';
            default: return key;
          }
        });
      
      if (accessList.length > 0) {
        welcomeText += `Ik heb toegang tot de volgende gegevens: ${accessList.join(', ')}. `;
      }
      
      welcomeText += 'Hoe kan ik je vandaag helpen?';
      
      const welcomeMessage = await addChatMessage(
        sessionId,
        'assistant',
        welcomeText
      );
      setMessages([welcomeMessage]);
      
      return welcomeMessage;
    } catch (error) {
      console.error('Failed to add welcome message:', error);
      throw error;
    }
  }, []);

  const addUserMessage = useCallback(async (sessionId: string, content: string) => {
    const userMessage = await addChatMessage(sessionId, 'user', content);
    setMessages(prev => [...prev, userMessage]);
    return userMessage;
  }, []);

  const addAssistantMessage = useCallback(async (
    sessionId: string,
    content: string,
    webhookTriggered = false,
    webhookResponse?: any,
    processingTime?: number
  ) => {
    const assistantMessage = await addChatMessage(
      sessionId,
      'assistant',
      content,
      webhookTriggered,
      webhookResponse,
      processingTime
    );
    setMessages(prev => [...prev, assistantMessage]);
    return assistantMessage;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addWelcomeMessage,
    addUserMessage,
    addAssistantMessage,
    clearMessages,
  };
};
