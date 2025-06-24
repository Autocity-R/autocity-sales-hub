
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createEnhancedChatSession, processMessageWithMemory, addEnhancedChatMessage, getEnhancedWelcomeMessage } from '@/services/enhancedChatSessionService';
import { getChatMessages } from '@/services/chatSessionService';

export const useEnhancedAIChat = (agentId: string) => {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const initializeSession = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsInitializing(true);
      const newSession = await createEnhancedChatSession(agentId);
      setSession(newSession);
      
      // Get enhanced welcome message
      const welcomeMessage = await getEnhancedWelcomeMessage(newSession.id, agentId);
      
      const welcomeMsg = await addEnhancedChatMessage(
        newSession.id,
        'assistant',
        welcomeMessage
      );
      setMessages([welcomeMsg]);
      
      return newSession;
    } catch (error) {
      console.error('Failed to initialize enhanced chat session:', error);
      toast({
        title: 'Fout',
        description: 'Kon chat sessie niet starten.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [agentId, toast]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session || !content.trim()) return;

    console.log('📤 Enhanced sendMessage called with memory support:', {
      sessionId: session.id,
      agentId,
      content,
      messagesCount: messages.length
    });

    setIsLoading(true);

    try {
      // Add user message
      console.log('➕ Adding user message to enhanced chat...');
      const userMsg = await addEnhancedChatMessage(session.id, 'user', content);
      setMessages(prev => [...prev, userMsg]);

      // Process message with memory detection
      console.log('🧠 Processing message with memory...');
      const memoryResult = await processMessageWithMemory(session.id, content);
      
      // Call Hendrik AI with memory context
      console.log('🤖 Calling Hendrik AI with enhanced memory...');
      const response = await fetch('/api/hendrik-ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          message: content,
          agentId,
          memoryContext: memoryResult
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('📥 Enhanced Hendrik result with memory:', {
        success: result.success,
        message: result.message,
        hasMemoryContext: !!result.context_used?.memory_context,
        leadId: result.context_used?.memory_context?.lead_id
      });
      
      // Add assistant response with memory tracking
      const assistantMsg = await addEnhancedChatMessage(
        session.id,
        'assistant',
        result.message,
        true,
        result,
        undefined,
        ['memory_context', 'crm_data'],
        { leadDetected: !!memoryResult.leadId, memoryUsed: !!memoryResult.memoryContext }
      );
      setMessages(prev => [...prev, assistantMsg]);

      console.log('✅ Enhanced message flow with memory completed successfully');

    } catch (error) {
      console.error('❌ Failed to send enhanced message with memory:', error);
      
      const errorMsg = await addEnhancedChatMessage(
        session.id,
        'assistant',
        'Sorry, er is een fout opgetreden bij het verwerken van je bericht. Probeer het opnieuw.'
      );
      setMessages(prev => [...prev, errorMsg]);

      toast({
        title: 'Fout',
        description: 'Kon bericht niet versturen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, agentId, messages, toast]);

  const endSession = useCallback(async () => {
    if (session) {
      try {
        await fetch('/api/end-chat-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
    setSession(null);
    setMessages([]);
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
