
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgents } from "@/services/webhookOperationsService";

export const useWebhookAgents = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for ai_agents table changes
  useEffect(() => {
    console.log('🔄 Setting up unified real-time subscription...');
    
    const channel = supabase
      .channel('unified_webhook_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agents'
        },
        (payload) => {
          console.log('🔄 Real-time update for ai_agents (unified):', payload);
          queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
          queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agent_webhooks'
        },
        (payload) => {
          console.log('🔄 Real-time update for ai_agent_webhooks:', payload);
          queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] });
          // Also refresh agents since webhooks can affect agent status
          queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up unified real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: agents = [], refetch: refetchAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: fetchAgents,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Enhanced refresh with verification
  const forceRefreshAgents = async () => {
    console.log('🔄 Force refreshing with unified approach...');
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] }),
      queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] }),
      queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] }),
    ]);
    
    await refetchAgents();
    
    // Verify synchronization for all agents
    const { performWebhookSyncVerification } = await import('@/services/webhookOperationsService');
    await performWebhookSyncVerification();
  };

  return {
    agents,
    refetchAgents,
    agentsLoading,
    forceRefreshAgents,
  };
};
