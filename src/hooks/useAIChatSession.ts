
import { useState, useCallback } from 'react';
import { createChatSession, endChatSession, ChatSession } from '@/services/chatSessionService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAIChatSession = (agentId: string) => {
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const initializeSession = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsInitializing(true);
      const newSession = await createChatSession(agentId);
      setSession(newSession);
      
      return newSession;
    } catch (error) {
      console.error('Failed to initialize chat session:', error);
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

  const endSession = useCallback(async () => {
    if (!session) return;

    try {
      await endChatSession(session.id);
      setSession(null);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }, [session]);

  return {
    session,
    isInitializing,
    initializeSession,
    endSession,
  };
};
