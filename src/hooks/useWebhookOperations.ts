
import { useState } from "react";
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

const fetchAgents = async (): Promise<Agent[]> => {
  console.log('🔄 Fetching agents with webhook status...');
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, webhook_url, is_webhook_enabled, webhook_config')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching agents:', error);
    throw error;
  }
  
  console.log('✅ Fetched agents:', data?.map(a => ({
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
      console.log('💾 Saving webhook configuration via mutation:', data);
      return await saveWebhookConfiguration(data);
    },
    onSuccess: async (result, variables) => {
      console.log('✅ Webhook save mutation successful:', result);
      
      toast({
        title: "✅ Webhook Configuratie Opgeslagen",
        description: "Webhook is succesvol geconfigureerd en actief voor alle gebruikers.",
      });
      
      // Force immediate cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      await queryClient.invalidateQueries({ queryKey: ['agent-webhooks'] });
      
      // Force multiple refetches with proper timing
      console.log('🔄 Forcing immediate agent refetch after webhook save...');
      setTimeout(async () => {
        await refetchAgents();
        
        // Additional verification refetch
        setTimeout(async () => {
          console.log('🔄 Verification refetch to ensure data consistency...');
          await refetchAgents();
        }, 2000);
      }, 500);
    },
    onError: (error: any) => {
      console.error('❌ Save webhook error:', error);
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

  // Function to manually refresh agents data
  const forceRefreshAgents = async () => {
    console.log('🔄 Force refreshing agents data...');
    await queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    await refetchAgents();
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
