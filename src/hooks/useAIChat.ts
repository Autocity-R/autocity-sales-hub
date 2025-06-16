
import { useState, useEffect, useCallback } from 'react';
import { createChatSession, addChatMessage, getChatMessages, endChatSession, ChatSession, ChatMessage } from '@/services/chatSessionService';
import { checkWebhookStatus, WebhookPayload } from '@/services/webhookService';
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

      // Check webhook status using unified approach (ai_agents table)
      const hasWebhook = await checkWebhookStatus(agentId);
      
      if (!hasWebhook) {
        // Fallback response if no webhook configured
        const fallbackMessage = await addChatMessage(
          session.id,
          'assistant',
          'Ik heb je bericht ontvangen, maar er zijn geen workflows geconfigureerd voor deze agent. Configureer een webhook in de agent instellingen.'
        );
        setMessages(prev => [...prev, fallbackMessage]);
        return;
      }

      // Get webhook URL from ai_agents table (unified approach)
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select('webhook_url, webhook_config')
        .eq('id', agentId)
        .single();

      if (!agentData?.webhook_url) {
        const fallbackMessage = await addChatMessage(
          session.id,
          'assistant',
          'Webhook is ingeschakeld maar geen URL geconfigureerd. Controleer de configuratie.'
        );
        setMessages(prev => [...prev, fallbackMessage]);
        return;
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

      // Import and use enhanced webhook trigger
      const { triggerEnhancedWebhook } = await import('@/services/enhancedWebhookService');
      
      // Get webhook configuration from ai_agents table with proper type handling
      let webhookConfig: any = {};
      if (agentData.webhook_config) {
        if (typeof agentData.webhook_config === 'object' && agentData.webhook_config !== null) {
          webhookConfig = agentData.webhook_config as any;
        }
      }
      
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

      const processingTime = Date.now() - startTime;

      // Add assistant response
      const assistantMessage = await addChatMessage(
        session.id,
        'assistant',
        webhookResult.message || 'Ik heb je verzoek verwerkt via de geconfigureerde workflow.',
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
        console.log('✅ Unified webhook approach successful');
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
