
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  provider: "openai" | "anthropic" | "google" | "custom";
  model: string;
  apiKey: string;
  systemPrompt: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
  webhook_url?: string;
  is_webhook_enabled: boolean;
  webhook_config?: any;
}

const fetchAIAgents = async (): Promise<AIAgent[]> => {
  console.log('🔄 Fetching AI agents from database...');
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching AI agents:', error);
    throw error;
  }
  
  console.log('✅ Fetched AI agents from database:', data?.map(a => ({
    id: a.id,
    name: a.name,
    webhook_url: a.webhook_url,
    is_webhook_enabled: a.is_webhook_enabled
  })));
  
  // Transform database data to match AIAgent interface
  return (data || []).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.persona || '',
    provider: 'openai' as const,
    model: 'gpt-4',
    apiKey: '***hidden***',
    systemPrompt: agent.system_prompt || '',
    isActive: agent.is_active,
    permissions: agent.permissions ? Object.keys(agent.permissions) : [],
    createdAt: new Date(agent.created_at),
    webhook_url: agent.webhook_url,
    is_webhook_enabled: agent.is_webhook_enabled,
    webhook_config: agent.webhook_config
  }));
};

const createAIAgent = async (agentData: Partial<AIAgent>) => {
  console.log('💾 Creating new AI agent:', agentData);
  
  const { data, error } = await supabase
    .from('ai_agents')
    .insert({
      name: agentData.name,
      persona: agentData.description,
      capabilities: ['chat', 'webhook'],
      system_prompt: agentData.systemPrompt || '',
      is_active: agentData.isActive ?? true,
      permissions: agentData.permissions?.reduce((acc, perm) => ({
        ...acc,
        [perm]: true
      }), {}) || {},
      webhook_url: null,
      is_webhook_enabled: false
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating AI agent:', error);
    throw error;
  }

  console.log('✅ AI agent created successfully:', data);
  return data;
};

const updateAIAgent = async (id: string, updates: Partial<AIAgent>) => {
  console.log('🔄 Updating AI agent:', id, updates);
  
  const { data, error } = await supabase
    .from('ai_agents')
    .update({
      name: updates.name,
      persona: updates.description,
      system_prompt: updates.systemPrompt,
      is_active: updates.isActive,
      permissions: updates.permissions?.reduce((acc, perm) => ({
        ...acc,
        [perm]: true
      }), {}) || {}
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating AI agent:', error);
    throw error;
  }

  console.log('✅ AI agent updated successfully:', data);
  return data;
};

const deleteAIAgent = async (id: string) => {
  console.log('🗑️ Deleting AI agent:', id);
  
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting AI agent:', error);
    throw error;
  }

  console.log('✅ AI agent deleted successfully');
};

export const useAIAgents = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['ai-agents-management'],
    queryFn: fetchAIAgents,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const createMutation = useMutation({
    mutationFn: createAIAgent,
    onSuccess: () => {
      toast({
        title: "✅ AI Agent Aangemaakt",
        description: "De AI agent is succesvol aangemaakt.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Fout",
        description: `Kon AI agent niet aanmaken: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<AIAgent> }) => 
      updateAIAgent(id, updates),
    onSuccess: () => {
      toast({
        title: "✅ AI Agent Bijgewerkt",
        description: "De AI agent is succesvol bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Fout",
        description: `Kon AI agent niet bijwerken: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAIAgent,
    onSuccess: () => {
      toast({
        title: "✅ AI Agent Verwijderd",
        description: "De AI agent is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ['ai-agents-management'] });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Fout",
        description: `Kon AI agent niet verwijderen: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    agents,
    isLoading,
    refetch,
    createAgent: createMutation.mutate,
    updateAgent: updateMutation.mutate,
    deleteAgent: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
