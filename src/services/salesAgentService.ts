
import { supabase } from "@/integrations/supabase/client";

export interface SalesEmailAnalysis {
  emailId: string;
  senderEmail: string;
  subject: string;
  contentSummary: string;
  leadScore: number;
  intentClassification: string;
  sentimentScore: number;
  urgencyLevel: string;
  suggestedResponse: string;
  competitiveMentions: string[];
  keyInsights: Record<string, any>;
}

export interface LeadScoringUpdate {
  leadId: string;
  previousScore: number;
  newScore: number;
  scoringFactors: Record<string, any>;
  scoringReason: string;
}

export interface ResponseSuggestion {
  emailProcessingId: string;
  leadId: string;
  suggestedResponse: string;
  responseType: string;
  priorityLevel: string;
  personalizationFactors: Record<string, any>;
}

// Initialize Hendrik Sales Agent
export const initializeHendrikAgent = async () => {
  try {
    // Check if Hendrik already exists
    const { data: existingAgent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('name', 'Hendrik - Sales AI Agent')
      .single();

    if (existingAgent) {
      console.log('✅ Hendrik Sales Agent already exists');
      return existingAgent;
    }

    // Create Hendrik Sales Agent
    const { data: newAgent, error } = await supabase
      .from('ai_agents')
      .insert({
        name: 'Hendrik - Sales AI Agent',
        persona: 'Ik ben Hendrik, jouw Sales AI Assistent. Ik help het sales team met email analyse, lead scoring, en het voorstellen van gepersonaliseerde responses. Ik leer van jullie feedback om steeds beter te worden in het identificeren van koopintentie en het ondersteunen van het sales proces.',
        capabilities: [
          'email-processing',
          'lead-scoring', 
          'intent-recognition',
          'response-suggestions',
          'competitive-analysis',
          'sales-analytics',
          'team-learning'
        ],
        system_prompt: 'Je bent Hendrik, een Sales AI Agent voor Auto City. Je analyseert inkomende emails op verkoop@auto-city.nl, scoort leads, detecteert koopintentie, en stelt gepersonaliseerde responses voor aan het sales team. Je leert van team feedback om je suggesties te verbeteren. Focus op: lead kwalificatie, urgentie detectie, competitive intelligence, en sales opportunities.',
        data_access_permissions: {
          leads: true,
          customers: true,
          vehicles: true,
          appointments: true,
          contracts: true,
          contacts: true,
          warranty: false,
          loan_cars: false
        },
        context_settings: {
          max_context_items: 15,
          preferred_data_sources: ['leads', 'customers', 'vehicles', 'appointments'],
          include_recent_activity: true,
          sales_focus: true,
          email_processing: true
        },
        is_active: true,
        is_webhook_enabled: false, // Will be enabled when N8N URL is provided
        webhook_config: {
          retries: 3,
          timeout: 45,
          headers: {},
          rate_limit: 100
        }
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Hendrik Sales Agent created successfully');
    return newAgent;
  } catch (error) {
    console.error('❌ Failed to initialize Hendrik:', error);
    throw error;
  }
};

// Process email analysis
export const processEmailAnalysis = async (analysis: SalesEmailAnalysis) => {
  try {
    const { data, error } = await supabase
      .from('ai_email_processing')
      .insert({
        email_id: analysis.emailId,
        sender_email: analysis.senderEmail,
        subject: analysis.subject,
        content_summary: analysis.contentSummary,
        lead_score: analysis.leadScore,
        intent_classification: analysis.intentClassification,
        sentiment_score: analysis.sentimentScore,
        urgency_level: analysis.urgencyLevel,
        suggested_response: analysis.suggestedResponse,
        competitive_mentions: analysis.competitiveMentions,
        key_insights: analysis.keyInsights,
        processing_agent: 'hendrik'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to process email analysis:', error);
    throw error;
  }
};

// Update lead scoring
export const updateLeadScoring = async (scoringUpdate: LeadScoringUpdate) => {
  try {
    // Update lead score
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({ 
        lead_score: scoringUpdate.newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', scoringUpdate.leadId);

    if (leadUpdateError) throw leadUpdateError;

    // Log scoring history
    const { data, error } = await supabase
      .from('lead_scoring_history')
      .insert({
        lead_id: scoringUpdate.leadId,
        previous_score: scoringUpdate.previousScore,
        new_score: scoringUpdate.newScore,
        scoring_factors: scoringUpdate.scoringFactors,
        scoring_reason: scoringUpdate.scoringReason,
        scored_by_agent: 'hendrik'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to update lead scoring:', error);
    throw error;
  }
};

// Create response suggestion
export const createResponseSuggestion = async (suggestion: ResponseSuggestion) => {
  try {
    const { data, error } = await supabase
      .from('email_response_suggestions')
      .insert({
        email_processing_id: suggestion.emailProcessingId,
        lead_id: suggestion.leadId,
        suggested_response: suggestion.suggestedResponse,
        response_type: suggestion.responseType,
        priority_level: suggestion.priorityLevel,
        personalization_factors: suggestion.personalizationFactors,
        team_action: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to create response suggestion:', error);
    throw error;
  }
};

// Log sales interaction for learning
export const logSalesInteraction = async (
  interactionType: string,
  inputData: any,
  aiResponse: string,
  userId?: string
) => {
  try {
    const { data, error } = await supabase
      .from('ai_sales_interactions')
      .insert({
        interaction_type: interactionType,
        input_data: inputData,
        ai_response: aiResponse,
        agent_name: 'hendrik',
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to log sales interaction:', error);
    throw error;
  }
};

// Get recent email analyses
export const getRecentEmailAnalyses = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('ai_email_processing')
      .select(`
        *,
        leads(first_name, last_name, email, status, priority)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Failed to get recent email analyses:', error);
    return [];
  }
};

// Get pending response suggestions
export const getPendingResponseSuggestions = async () => {
  try {
    const { data, error } = await supabase
      .from('email_response_suggestions')
      .select(`
        *,
        leads(first_name, last_name, email, status, priority),
        ai_email_processing(sender_email, subject, urgency_level)
      `)
      .eq('team_action', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Failed to get pending response suggestions:', error);
    return [];
  }
};

// Update response suggestion status
export const updateResponseSuggestionStatus = async (
  suggestionId: string,
  teamAction: string,
  teamModifications?: string,
  teamRating?: number
) => {
  try {
    const updateData: any = {
      team_action: teamAction,
      updated_at: new Date().toISOString()
    };

    if (teamModifications) updateData.team_modifications = teamModifications;
    if (teamAction === 'sent_as_suggested' || teamAction === 'modified_and_sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('email_response_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;

    // Log interaction for learning if rating provided
    if (teamRating) {
      await supabase
        .from('ai_sales_interactions')
        .insert({
          interaction_type: 'response_feedback',
          input_data: { suggestion_id: suggestionId, action: teamAction },
          ai_response: 'Response suggestion processed',
          team_feedback: teamModifications || '',
          team_rating: teamRating,
          outcome: teamAction,
          agent_name: 'hendrik'
        });
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to update response suggestion status:', error);
    throw error;
  }
};
