
import { supabase } from "@/integrations/supabase/client";

export interface ChatSession {
  id: string;
  agentId: string;
  sessionToken: string;
  status: 'active' | 'ended' | 'error';
  context: any;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  messageType: 'user' | 'assistant' | 'system';
  content: string;
  webhookTriggered: boolean;
  webhookResponse?: any;
  processingTime?: number;
  createdAt: string;
}

export const createChatSession = async (agentId: string): Promise<ChatSession> => {
  const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      agent_id: agentId,
      session_token: sessionToken,
      user_id: user?.id,
      status: 'active',
      context: {},
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    agentId: data.agent_id,
    sessionToken: data.session_token,
    status: data.status as 'active' | 'ended' | 'error',
    context: data.context,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    endedAt: data.ended_at,
  };
};

export const addChatMessage = async (
  sessionId: string,
  messageType: 'user' | 'assistant' | 'system',
  content: string,
  webhookTriggered = false,
  webhookResponse?: any,
  processingTime?: number
): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      message_type: messageType,
      content,
      webhook_triggered: webhookTriggered,
      webhook_response: webhookResponse,
      processing_time_ms: processingTime,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    sessionId: data.session_id,
    messageType: data.message_type as 'user' | 'assistant' | 'system',
    content: data.content,
    webhookTriggered: data.webhook_triggered,
    webhookResponse: data.webhook_response,
    processingTime: data.processing_time_ms,
    createdAt: data.created_at,
  };
};

export const getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(msg => ({
    id: msg.id,
    sessionId: msg.session_id,
    messageType: msg.message_type as 'user' | 'assistant' | 'system',
    content: msg.content,
    webhookTriggered: msg.webhook_triggered,
    webhookResponse: msg.webhook_response,
    processingTime: msg.processing_time_ms,
    createdAt: msg.created_at,
  }));
};

export const endChatSession = async (sessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('ai_chat_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
};
