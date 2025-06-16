
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { saveWebhookConfiguration } from "@/services/webhookService";

interface Agent {
  id: string;
  name: string;
  webhook_url?: string;
  is_webhook_enabled: boolean;
  webhook_config?: any;
}

interface Webhook {
  id: string;
  agent_id: string;
  webhook_name: string;
  webhook_url: string;
  workflow_type: string;
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  headers: any;
}

// Unified agent fetching - use ai_agents as single source of truth
const fetchAgents = async (): Promise<Agent[]> => {
  console.log('🔄 Fetching agents from ai_agents table (unified approach)...');
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, webhook_url, is_webhook_enabled, webhook_config')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching agents:', error);
    throw error;
  }
  
  console.log('✅ Fetched agents (unified):', data?.map(a => ({
    id: a.id,
    name: a.name,
    webhook_url: a.webhook_url,
    is_webhook_enabled: a.is_webhook_enabled
  })));
  
  return data || [];
};

const fetchWebhooks = async (agentId: string): Promise<Webhook[]> => {
  if (!agentId) return [];
  
  const { data, error } = await supabase
    .from('ai_agent_webhooks')
    .select('*')
    .eq('agent_id', agentId);

  if (error) throw error;
  return data || [];
};

export const useWebhookOperations = () => {
  const { toast } = useToast();
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

  const saveWebhookMutation = useMutation({
    mutationFn: async (data: {
      agentId: string;
      webhookUrl: string;
      enabled: boolean;
      config: any;
      webhookName: string;
      workflowType: string;
      retryCount: number;
      timeoutSeconds: number;
      headers: any;
    }) => {
      console.log('💾 Saving webhook via unified approach:', data);
      return await saveWebhookConfiguration(data);
    },
    onSuccess: async (result, variables) => {
      console.log('✅ Unified webhook save successful:', result);
      
      toast({
        title: "✅ Webhook Configuratie Opgeslagen",
        description: "Webhook is succesvol geconfigureerd met database synchronisatie.",
      });
      
      // Force refresh all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-agents'] }),
        queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] }),
      ]);
      
      // Additional verification
      setTimeout(async () => {
        console.log('🔍 Performing post-save verification...');
        await refetchAgents();
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ Unified webhook save error:', error);
      toast({
        title: "❌ Opslaan Mislukt",
        description: `Kon webhook niet opslaan: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          webhookUrl: url,
          testData: {
            agentId: "test",
            agentName: "Test Agent",
            message: "Test bericht vanuit CRM systeem",
            systemData: {
              currentTime: new Date().toISOString(),
              testMode: true
            }
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✅ Webhook Test Succesvol",
          description: `Webhook getest met status ${data.status}. Response ontvangen.`,
        });
      } else {
        toast({
          title: "⚠️ Webhook Test Gefaald",
          description: `Status: ${data.status} - ${data.error || 'Onbekende fout'}`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "❌ Test Fout",
        description: `Webhook test gefaald: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getWebhooks = (agentId: string) => {
    return useQuery({
      queryKey: ['agent-webhooks', agentId],
      queryFn: () => fetchWebhooks(agentId),
      enabled: !!agentId,
    });
  };

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
    const { data: allSyncData } = await supabase.rpc('verify_webhook_sync', { agent_uuid: null });
    if (allSyncData) {
      const unsyncedAgents = allSyncData.filter(agent => !agent.is_synchronized);
      if (unsyncedAgents.length > 0) {
        console.warn('⚠️ Found unsynchronized agents:', unsyncedAgents);
      }
    }
  };

  return {
    agents,
    refetchAgents,
    agentsLoading,
    saveWebhookMutation,
    testWebhookMutation,
    getWebhooks,
    forceRefreshAgents,
  };
};
