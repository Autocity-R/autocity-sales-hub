
import { supabase } from "@/integrations/supabase/client";
import { detectLeadFromMessage, getLeadContext, buildMemoryContext } from "./leadMemoryService";

export interface EnhancedChatSession {
  id: string;
  agentId: string;
  sessionToken: string;
  status: 'active' | 'ended' | 'error';
  context: any;
  memoryContext: any;
  contextSummary?: string;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export const createEnhancedChatSession = async (agentId: string): Promise<EnhancedChatSession> => {
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
      memory_context: {},
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
    memoryContext: data.memory_context,
    contextSummary: data.context_summary,
    leadId: data.lead_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    endedAt: data.ended_at,
  };
};

export const processMessageWithMemory = async (
  sessionId: string,
  message: string
): Promise<{ leadId?: string; memoryContext?: string }> => {
  try {
    // Try to detect lead from message
    const leadId = await detectLeadFromMessage(message, sessionId);
    
    let memoryContext = '';
    
    if (leadId) {
      // Get full lead context including memories
      const leadContext = await getLeadContext(leadId);
      
      if (leadContext) {
        memoryContext = buildMemoryContext(leadContext);
        
        // Update session with memory context
        await supabase
          .from('ai_chat_sessions')
          .update({
            lead_id: leadId,
            memory_context: {
              leadId,
              sessionCount: leadContext.sessionCount,
              lastContact: leadContext.lastContact,
              salesPhase: leadContext.salesPhase,
              memoriesCount: leadContext.memories.length
            },
            context_summary: `Lead: ${leadContext.lead.first_name} ${leadContext.lead.last_name} (${leadContext.sessionCount} sessies)`
          })
          .eq('id', sessionId);
      }
    }
    
    return { leadId, memoryContext };
  } catch (error) {
    console.error('Error processing message with memory:', error);
    return {};
  }
};

export const addEnhancedChatMessage = async (
  sessionId: string,
  messageType: 'user' | 'assistant' | 'system',
  content: string,
  webhookTriggered = false,
  webhookResponse?: any,
  processingTime?: number,
  contextItemsUsed: string[] = [],
  memoryReferences: any = {}
): Promise<any> => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      message_type: messageType,
      content,
      webhook_triggered: webhookTriggered,
      webhook_response: webhookResponse,
      processing_time_ms: processingTime,
      context_items_used: contextItemsUsed,
      memory_references: memoryReferences,
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
    contextItemsUsed: data.context_items_used,
    memoryReferences: data.memory_references,
    createdAt: data.created_at,
  };
};

export const getSessionWithMemoryContext = async (sessionId: string): Promise<EnhancedChatSession | null> => {
  try {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      agentId: data.agent_id,
      sessionToken: data.session_token,
      status: data.status,
      context: data.context,
      memoryContext: data.memory_context,
      contextSummary: data.context_summary,
      leadId: data.lead_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      endedAt: data.ended_at,
    };
  } catch (error) {
    console.error('Error getting session with memory context:', error);
    return null;
  }
};

export const getEnhancedWelcomeMessage = async (sessionId: string, agentId: string): Promise<string> => {
  try {
    const session = await getSessionWithMemoryContext(sessionId);
    
    if (session?.leadId) {
      const leadContext = await getLeadContext(session.leadId);
      
      if (leadContext) {
        let welcomeMessage = `Hallo ${leadContext.lead.first_name}! `;
        
        if (leadContext.sessionCount > 1) {
          welcomeMessage += `Ik herinner me ons vorige gesprek${leadContext.sessionCount > 2 ? ' gesprekken' : ''}. `;
          
          if (leadContext.lastContact) {
            const daysSince = Math.floor((new Date().getTime() - new Date(leadContext.lastContact).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 0) {
              welcomeMessage += `Het is ${daysSince} dag${daysSince > 1 ? 'en' : ''} geleden dat we contact hadden. `;
            }
          }
        }
        
        if (leadContext.salesPhase) {
          welcomeMessage += `Je bent nu in de ${leadContext.salesPhase} fase. `;
        }
        
        welcomeMessage += `Hoe kan ik je vandaag helpen met je auto zoektocht?`;
        
        return welcomeMessage;
      }
    }
    
    // Default welcome message
    return `Hallo! Ik ben Hendrik, je automotive specialist van Auto City. Ik help je graag de perfecte auto te vinden. Vertel me over je wensen en ik zorg voor persoonlijk advies!`;
  } catch (error) {
    console.error('Error creating enhanced welcome message:', error);
    return `Hallo! Ik ben Hendrik van Auto City. Hoe kan ik je helpen?`;
  }
};
