
import { supabase } from "@/integrations/supabase/client";

export interface Agent {
  id: string;
  name: string;
  webhook_url?: string;
  is_webhook_enabled: boolean;
  webhook_config?: any;
}

export interface Webhook {
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
export const fetchAgents = async (): Promise<Agent[]> => {
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

export const fetchWebhooks = async (agentId: string): Promise<Webhook[]> => {
  if (!agentId) return [];
  
  const { data, error } = await supabase
    .from('ai_agent_webhooks')
    .select('*')
    .eq('agent_id', agentId);

  if (error) throw error;
  return data || [];
};

// Enhanced refresh with verification
export const performWebhookSyncVerification = async (agentId?: string) => {
  console.log('🔍 Performing webhook synchronization verification...');
  
  const { data: syncData } = await supabase.rpc('verify_webhook_sync', { 
    agent_uuid: agentId || null 
  });
  
  if (syncData) {
    const unsyncedAgents = syncData.filter(agent => !agent.is_synchronized);
    if (unsyncedAgents.length > 0) {
      console.warn('⚠️ Found unsynchronized agents:', unsyncedAgents);
    }
  }
  
  return syncData;
};
