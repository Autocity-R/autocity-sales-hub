
import { useState, useEffect, useCallback } from 'react';
import { createChatSession, addChatMessage, getChatMessages, endChatSession, ChatSession, ChatMessage } from '@/services/chatSessionService';
import { getAgentWebhooks, WebhookPayload } from '@/services/webhookService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAIChat = (agentId: string) => {
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const initializeSession = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsInitializing(true);
      const newSession = await createChatSession(agentId);
      setSession(newSession);
      
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
        newSession.id,
        'assistant',
        welcomeText
      );
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize chat session:', error);
      toast({
        title: 'Fout',
        description: 'Kon chat sessie niet starten.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  }, [agentId, toast]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session || !content.trim()) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Add user message
      const userMessage = await addChatMessage(session.id, 'user', content);
      setMessages(prev => [...prev, userMessage]);

      // Get agent webhooks
      const webhooks = await getAgentWebhooks(agentId);
      
      if (webhooks.length === 0) {
        // Fallback response if no webhooks configured
        const fallbackMessage = await addChatMessage(
          session.id,
          'assistant',
          'Ik heb je bericht ontvangen, maar er zijn geen workflows geconfigureerd voor deze agent. Configureer een webhook in de agent instellingen.'
        );
        setMessages(prev => [...prev, fallbackMessage]);
        return;
      }

      // Determine which webhook to use (for now, use the first active one)
      const webhook = webhooks[0];
      
      // Prepare webhook payload
      const payload: WebhookPayload = {
        sessionId: session.id,
        message: content,
        workflowType: webhook.workflow_type,
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

      console.log('🔄 Sending enhanced webhook payload:', payload);

      // Import and use enhanced webhook trigger
      const { triggerEnhancedWebhook } = await import('@/services/enhancedWebhookService');
      
      // Trigger enhanced webhook with system data
      const webhookResult = await triggerEnhancedWebhook(
        webhook.webhook_url,
        payload,
        {
          timeout: webhook.timeout_seconds * 1000,
          retries: webhook.retry_count,
          headers: webhook.headers as Record<string, string>,
        }
      );

      const processingTime = Date.now() - startTime;

      // Add assistant response
      const assistantMessage = await addChatMessage(
        session.id,
        'assistant',
        webhookResult.message || 'Ik heb je verzoek verwerkt en de relevante gegevens geanalyseerd.',
        true,
        webhookResult.data,
        processingTime
      );

      setMessages(prev => [...prev, assistantMessage]);

      if (!webhookResult.success) {
        toast({
          title: 'Webhook Warning',
          description: 'Er was een probleem met de workflow verwerking.',
          variant: 'destructive',
        });
      } else {
        console.log('✅ Enhanced webhook successful with system data');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = await addChatMessage(
        session.id,
        'assistant',
        'Sorry, er is een fout opgetreden bij het verwerken van je bericht. Probeer het opnieuw.'
      );
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: 'Fout',
        description: 'Kon bericht niet versturen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, agentId, toast, messages]);

  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      await endChatSession(session.id);
      setSession(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [session]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    session,
    messages,
    isLoading,
    isInitializing,
    sendMessage,
    endSession,
    reinitialize: initializeSession,
  };
};
