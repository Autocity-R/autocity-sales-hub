
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAIChat } from './useEnhancedAIChat';
import { useAIChat } from './useAIChat';

export const useProductionAIChat = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedAgentData, setSelectedAgentData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Use enhanced chat for Hendrik, regular chat for others
  const isHendrikAgent = selectedAgentData?.name?.toLowerCase().includes('hendrik') ||
                        selectedAgentData?.capabilities?.includes('direct-ai-integration');

  const enhancedChat = useEnhancedAIChat(isHendrikAgent ? selectedAgent : '');
  const regularChat = useAIChat(!isHendrikAgent ? selectedAgent : '');

  // Select which chat system to use
  const activeChat = isHendrikAgent ? enhancedChat : regularChat;

  const loadAgents = useCallback(async () => {
    try {
      setAgentsLoading(true);
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
      
      // Auto-select Hendrik if available
      const hendrik = data?.find(agent => agent.name.toLowerCase().includes('hendrik'));
      if (hendrik && !selectedAgent) {
        setSelectedAgent(hendrik.id);
        setSelectedAgentData(hendrik);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: 'Fout',
        description: 'Kon AI agents niet laden.',
        variant: 'destructive',
      });
    } finally {
      setAgentsLoading(false);
    }
  }, [selectedAgent, toast]);

  const handleAgentChange = useCallback(async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setSelectedAgent(agentId);
    setSelectedAgentData(agent);
    
    // End current session when switching agents
    if (activeChat.session) {
      await activeChat.endSession();
    }
  }, [agents, activeChat]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    
    console.log('🚀 Production AI Chat - sending message:', {
      agent: selectedAgentData?.name,
      isHendrik: isHendrikAgent,
      messageLength: message.length,
      hasMemory: isHendrikAgent
    });
    
    await activeChat.sendMessage(message);
    setMessage('');
  }, [message, activeChat, selectedAgentData, isHendrikAgent]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  console.log('🔄 Production AI Chat State:', {
    selectedAgent: selectedAgentData?.name,
    isHendrik: isHendrikAgent,
    messagesCount: activeChat.messages.length,
    hasSession: !!activeChat.session,
    isLoading: activeChat.isLoading
  });

  return {
    agents,
    selectedAgent,
    selectedAgentData,
    session: activeChat.session,
    messages: activeChat.messages,
    message,
    agentsLoading,
    chatLoading: activeChat.isLoading,
    isInitializing: activeChat.isInitializing,
    handleSendMessage,
    handleKeyPress,
    handleAgentChange,
    handleRefreshAgents: loadAgents,
    setMessage,
    endSession: activeChat.endSession,
  };
};
