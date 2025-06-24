
import { supabase } from "@/integrations/supabase/client";

export interface LeadMemory {
  id: string;
  leadId: string;
  contextType: 'preference' | 'conversation_summary' | 'sales_phase' | 'objection_history' | 'vehicle_interest' | 'budget_info';
  contextData: any;
  importanceScore: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadContext {
  lead: any;
  memories: LeadMemory[];
  conversationHistory: any[];
  sessionCount: number;
  lastContact?: string;
  salesPhase?: string;
  preferences?: any;
}

export const detectLeadFromMessage = async (message: string, sessionId: string): Promise<string | null> => {
  try {
    // Extract email pattern from message
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    
    // Extract phone pattern from message  
    const phoneMatch = message.match(/(?:\+31|0)[0-9]{1,3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{3,4}/);
    
    let leadId = null;

    if (emailMatch) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', emailMatch[0])
        .single();
      
      if (lead) leadId = lead.id;
    }

    if (!leadId && phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/[-.\s]/g, '');
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.${phoneMatch[0]}`)
        .single();
      
      if (lead) leadId = lead.id;
    }

    // Update session with lead_id if found
    if (leadId) {
      await supabase
        .from('ai_chat_sessions')
        .update({ lead_id: leadId })
        .eq('id', sessionId);
    }

    return leadId;
  } catch (error) {
    console.error('Error detecting lead from message:', error);
    return null;
  }
};

export const getLeadContext = async (leadId: string): Promise<LeadContext | null> => {
  try {
    // Get lead basic info
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return null;

    // Get lead memories
    const { data: memories } = await supabase
      .from('ai_lead_memory')
      .select('*')
      .eq('lead_id', leadId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('importance_score', { ascending: false })
      .limit(20);

    // Get conversation history from all sessions for this lead
    const { data: sessions } = await supabase
      .from('ai_chat_sessions')
      .select(`
        id,
        created_at,
        context_summary,
        ai_chat_messages(*)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Flatten conversation history
    const conversationHistory = sessions?.flatMap(session => 
      session.ai_chat_messages?.map(msg => ({
        ...msg,
        session_date: session.created_at
      })) || []
    ) || [];

    // Extract key context from memories
    const preferences = memories?.find(m => m.context_type === 'preference')?.context_data;
    const salesPhase = memories?.find(m => m.context_type === 'sales_phase')?.context_data?.current_phase;

    return {
      lead,
      memories: memories || [],
      conversationHistory,
      sessionCount: sessions?.length || 0,
      lastContact: sessions?.[0]?.created_at,
      salesPhase,
      preferences
    };
  } catch (error) {
    console.error('Error getting lead context:', error);
    return null;
  }
};

export const saveLeadMemory = async (
  leadId: string,
  contextType: LeadMemory['contextType'],
  contextData: any,
  importanceScore: number = 5,
  expiresAt?: string
): Promise<void> => {
  try {
    await supabase
      .from('ai_lead_memory')
      .insert({
        lead_id: leadId,
        context_type: contextType,
        context_data: contextData,
        importance_score: importanceScore,
        expires_at: expiresAt
      });
  } catch (error) {
    console.error('Error saving lead memory:', error);
  }
};

export const updateLeadMemory = async (
  leadId: string,
  contextType: LeadMemory['contextType'],
  contextData: any,
  importanceScore?: number
): Promise<void> => {
  try {
    const updateData: any = {
      context_data: contextData,
      updated_at: new Date().toISOString()
    };
    
    if (importanceScore !== undefined) {
      updateData.importance_score = importanceScore;
    }

    const { data: existing } = await supabase
      .from('ai_lead_memory')
      .select('id')
      .eq('lead_id', leadId)
      .eq('context_type', contextType)
      .single();

    if (existing) {
      await supabase
        .from('ai_lead_memory')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      await saveLeadMemory(leadId, contextType, contextData, importanceScore);
    }
  } catch (error) {
    console.error('Error updating lead memory:', error);
  }
};

export const buildMemoryContext = (leadContext: LeadContext): string => {
  let contextString = `\n\n<LEAD_MEMORY_CONTEXT>\n`;
  
  contextString += `**Lead Informatie:**\n`;
  contextString += `- Naam: ${leadContext.lead.first_name} ${leadContext.lead.last_name}\n`;
  contextString += `- Email: ${leadContext.lead.email}\n`;
  contextString += `- Status: ${leadContext.lead.status}\n`;
  contextString += `- Sessies: ${leadContext.sessionCount} eerdere gesprekken\n`;
  
  if (leadContext.lastContact) {
    const daysSince = Math.floor((new Date().getTime() - new Date(leadContext.lastContact).getTime()) / (1000 * 60 * 60 * 24));
    contextString += `- Laatste contact: ${daysSince} dagen geleden\n`;
  }

  if (leadContext.salesPhase) {
    contextString += `- Sales Fase: ${leadContext.salesPhase}\n`;
  }

  // Add important memories
  if (leadContext.memories.length > 0) {
    contextString += `\n**Belangrijke Context:**\n`;
    leadContext.memories.slice(0, 8).forEach(memory => {
      if (memory.context_type === 'preference') {
        contextString += `- Voorkeuren: ${JSON.stringify(memory.context_data)}\n`;
      } else if (memory.context_type === 'objection_history') {
        contextString += `- Eerdere objecties: ${JSON.stringify(memory.context_data)}\n`;
      } else if (memory.context_type === 'vehicle_interest') {
        contextString += `- Voertuig interesse: ${JSON.stringify(memory.context_data)}\n`;
      } else if (memory.context_type === 'budget_info') {
        contextString += `- Budget informatie: ${JSON.stringify(memory.context_data)}\n`;
      }
    });
  }

  // Add recent conversation highlights
  if (leadContext.conversationHistory.length > 0) {
    contextString += `\n**Recente Gesprekken (laatste 5 berichten):**\n`;
    leadContext.conversationHistory
      .filter(msg => msg.message_type === 'user')
      .slice(0, 5)
      .forEach(msg => {
        contextString += `- "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"\n`;
      });
  }

  contextString += `</LEAD_MEMORY_CONTEXT>\n`;
  
  return contextString;
};
