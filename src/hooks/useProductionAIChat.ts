
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAIChat } from "@/hooks/useAIChat";
import { supabase } from "@/integrations/supabase/client";

interface AIAgent {
  id: string;
  name: string;
  persona: string;
  is_active: boolean;
  is_webhook_enabled?: boolean;
  webhook_url?: string;
  webhook_config?: any;
  data_access_permissions?: any;
  capabilities?: string[];
}

const fetchAIAgents = async (): Promise<AIAgent[]> => {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const useProductionAIChat = () => {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [message, setMessage] = useState("");

  const { data: agents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: fetchAIAgents,
    refetchInterval: 10000, // Refresh every 10 seconds to sync status
  });

  const {
    session,
    messages,
    isLoading: chatLoading,
    isInitializing,
    sendMessage,
    endSession,
    reinitialize,
  } = useAIChat(selectedAgent);

  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent || chatLoading) return;
    
    await sendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAgentChange = (agentId: string) => {
    if (session) {
      endSession();
    }
    setSelectedAgent(agentId);
  };

  const handleRefreshAgents = () => {
    refetchAgents();
    toast({
      title: "Agents Bijgewerkt",
      description: "Agent status is opnieuw geladen",
    });
  };

  return {
    // Data
    agents,
    selectedAgent,
    selectedAgentData,
    session,
    messages,
    message,
    
    // Loading states
    agentsLoading,
    chatLoading,
    isInitializing,
    
    // Handlers
    handleSendMessage,
    handleKeyPress,
    handleAgentChange,
    handleRefreshAgents,
    setMessage,
    endSession,
  };
};
