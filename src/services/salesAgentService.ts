
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

export interface EnhancedSalesInteraction {
  interactionType: string;
  inputData: any;
  aiResponse: string;
  detectedPhase?: string;
  sentimentAnalysis?: string;
  urgencyLevel?: string;
  conversionProbability?: number;
  teamFeedback?: string;
  teamRating?: number;
  functionCalled?: string;
  functionResult?: any;
}

// Initialize Enhanced Hendrik Sales Agent - renamed from initializeEnhancedHendrikAgent
export const initializeHendrikAgent = async () => {
  try {
    const { data: existingAgent } = await supabase
      .from('ai_agents')
      .select('id, name, capabilities')
      .eq('name', 'Hendrik - Sales AI Agent')
      .single();

    if (existingAgent) {
      // Update existing agent with enhanced capabilities
      const { data: updatedAgent, error } = await supabase
        .from('ai_agents')
        .update({
          capabilities: [
            'email-processing',
            'lead-scoring', 
            'intent-recognition',
            'response-suggestions',
            'competitive-analysis',
            'sales-analytics',
            'team-learning',
            'appointment-scheduling',
            'crm-operations',
            'direct-ai-integration',
            'phase-detection',
            'sentiment-analysis',
            'vehicle-matching',
            'inruil-valuation',
            'enhanced-learning'
          ],
          system_prompt: 'Je bent Hendrik, een geavanceerde Sales AI Agent voor Auto City met directe OpenAI integratie en volledige CRM context. Je hebt real-time toegang tot voorraad, leads, afspraken en klantgegevens. Je kunt proactief sales opportunities identificeren, leads analyseren op fase en sentiment, afspraken inplannen, voertuig matching doen, en leren van team feedback voor continue verbetering.',
          context_settings: {
            max_context_items: 30,
            preferred_data_sources: ['vehicles', 'leads', 'appointments', 'contacts', 'contracts'],
            include_recent_activity: true,
            sales_focus: true,
            email_processing: true,
            direct_ai_integration: true,
            learning_enabled: true,
            phase_detection: true,
            sentiment_analysis: true,
            enhanced_crm_access: true
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Enhanced Hendrik Sales Agent updated');
      return updatedAgent;
    }

    // Create new enhanced agent if doesn't exist
    const { data: newAgent, error } = await supabase
      .from('ai_agents')
      .insert({
        name: 'Hendrik - Sales AI Agent',
        persona: 'Ik ben Hendrik, jouw enhanced Sales AI Assistent met volledige CRM integratie. Ik analyseer leads op fase en sentiment, help met voertuig matching, plan afspraken, en leer van team feedback om steeds beter te worden in het ondersteunen van het sales proces.',
        capabilities: [
          'email-processing',
          'lead-scoring', 
          'intent-recognition',
          'response-suggestions',
          'competitive-analysis',
          'sales-analytics',
          'team-learning',
          'appointment-scheduling',
          'crm-operations',
          'direct-ai-integration',
          'phase-detection',
          'sentiment-analysis',
          'vehicle-matching',
          'inruil-valuation',
          'enhanced-learning'
        ],
        system_prompt: 'Je bent Hendrik, een geavanceerde Sales AI Agent voor Auto City met directe OpenAI integratie en volledige CRM context. Je hebt real-time toegang tot voorraad, leads, afspraken en klantgegevens. Je kunt proactief sales opportunities identificeren, leads analyseren op fase en sentiment, afspraken inplannen, voertuig matching doen, en leren van team feedback voor continue verbetering.',
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
          max_context_items: 30,
          preferred_data_sources: ['vehicles', 'leads', 'appointments', 'contacts', 'contracts'],
          include_recent_activity: true,
          sales_focus: true,
          email_processing: true,
          direct_ai_integration: true,
          learning_enabled: true,
          phase_detection: true,
          sentiment_analysis: true,
          enhanced_crm_access: true
        },
        is_active: true,
        is_webhook_enabled: false,
        webhook_url: null,
        webhook_config: {
          direct_ai: true,
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 1200,
          functions_enabled: true,
          enhanced_context: true
        }
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Enhanced Hendrik Sales Agent created');
    return newAgent;
  } catch (error) {
    console.error('❌ Failed to initialize Enhanced Hendrik:', error);
    throw error;
  }
};

// Enhanced logging with learning capabilities
export const logEnhancedSalesInteraction = async (interaction: EnhancedSalesInteraction, userId?: string) => {
  try {
    const { data, error } = await supabase
      .from('ai_sales_interactions')
      .insert({
        interaction_type: interaction.interactionType,
        input_data: {
          ...interaction.inputData,
          detected_phase: interaction.detectedPhase,
          sentiment_analysis: interaction.sentimentAnalysis,
          urgency_level: interaction.urgencyLevel,
          conversion_probability: interaction.conversionProbability
        },
        ai_response: interaction.aiResponse,
        team_feedback: interaction.teamFeedback,
        team_rating: interaction.teamRating,
        agent_name: 'hendrik',
        user_id: userId,
        outcome: interaction.functionCalled || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to log enhanced sales interaction:', error);
    throw error;
  }
};

// Get learning analytics for Hendrik
export const getHendrikLearningAnalytics = async () => {
  try {
    const { data: interactions, error } = await supabase
      .from('ai_sales_interactions')
      .select('*')
      .eq('agent_name', 'hendrik')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const analytics = {
      totalInteractions: interactions?.length || 0,
      ratedInteractions: interactions?.filter(i => i.team_rating).length || 0,
      avgRating: 0,
      feedbackCount: interactions?.filter(i => i.team_feedback).length || 0,
      phaseDetections: {} as Record<string, number>,
      sentimentDistribution: {} as Record<string, number>,
      functionUsage: {} as Record<string, number>,
      improvementTrends: [] as any[]
    };

    if (interactions && interactions.length > 0) {
      // Calculate average rating
      const ratedInteractions = interactions.filter(i => i.team_rating);
      if (ratedInteractions.length > 0) {
        analytics.avgRating = ratedInteractions.reduce((sum, i) => sum + (i.team_rating || 0), 0) / ratedInteractions.length;
      }

      // Analyze phase detections - safely access input_data
      interactions.forEach(i => {
        if (i.input_data && typeof i.input_data === 'object') {
          const inputData = i.input_data as any;
          
          const phase = inputData.detected_phase;
          if (phase) {
            analytics.phaseDetections[phase] = (analytics.phaseDetections[phase] || 0) + 1;
          }

          const sentiment = inputData.sentiment_analysis;
          if (sentiment) {
            analytics.sentimentDistribution[sentiment] = (analytics.sentimentDistribution[sentiment] || 0) + 1;
          }
        }

        const func = i.outcome; // Use outcome field instead of function_called
        if (func) {
          analytics.functionUsage[func] = (analytics.functionUsage[func] || 0) + 1;
        }
      });

      // Calculate improvement trends (ratings over time)
      const weeklyRatings = interactions
        .filter(i => i.team_rating && i.created_at)
        .reduce((acc, i) => {
          const week = new Date(i.created_at).toISOString().slice(0, 10);
          if (!acc[week]) acc[week] = [];
          acc[week].push(i.team_rating!);
          return acc;
        }, {} as Record<string, number[]>);

      analytics.improvementTrends = Object.entries(weeklyRatings)
        .map(([week, ratings]) => ({
          week,
          avgRating: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
          count: ratings.length
        }))
        .sort((a, b) => a.week.localeCompare(b.week));
    }

    return analytics;
  } catch (error) {
    console.error('❌ Failed to get learning analytics:', error);
    throw error;
  }
};

// Get team feedback suggestions for improvement
export const getImprovementSuggestions = async () => {
  try {
    const { data: feedbackData, error } = await supabase
      .from('ai_sales_interactions')
      .select('team_feedback, team_rating, interaction_type, created_at')
      .eq('agent_name', 'hendrik')
      .not('team_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const suggestions = {
      commonFeedback: [] as any[],
      lowRatedAreas: [] as any[],
      improvementAreas: [] as string[],
      strengths: [] as string[]
    };

    if (feedbackData && feedbackData.length > 0) {
      // Analyze common feedback themes
      const feedbackWords = feedbackData
        .flatMap(f => f.team_feedback?.toLowerCase().split(' ') || [])
        .filter(word => word.length > 3);
      
      const wordCounts = feedbackWords.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      suggestions.commonFeedback = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      // Identify low-rated areas
      const lowRatedFeedback = feedbackData.filter(f => (f.team_rating || 0) < 3);
      suggestions.lowRatedAreas = lowRatedFeedback.map(f => ({
        feedback: f.team_feedback,
        rating: f.team_rating,
        type: f.interaction_type
      }));

      // Generate improvement suggestions based on feedback patterns
      const allFeedback = feedbackData.map(f => f.team_feedback).join(' ').toLowerCase();
      
      if (allFeedback.includes('te technisch') || allFeedback.includes('complex')) {
        suggestions.improvementAreas.push('Gebruik eenvoudigere taal en minder technische termen');
      }
      if (allFeedback.includes('te kort') || allFeedback.includes('meer uitleg')) {
        suggestions.improvementAreas.push('Geef meer uitgebreide antwoorden met voorbeelden');
      }
      if (allFeedback.includes('prijs') || allFeedback.includes('waarde')) {
        suggestions.improvementAreas.push('Focus meer op waarde-propositie dan alleen prijzen');
      }
      if (allFeedback.includes('bovag') || allFeedback.includes('garantie')) {
        suggestions.strengths.push('Goede nadruk op BOVAG certificering en garanties');
      }
      if (allFeedback.includes('afspraak') || allFeedback.includes('showroom')) {
        suggestions.strengths.push('Effectief in het leiden naar showroom afspraken');
      }
    }

    return suggestions;
  } catch (error) {
    console.error('❌ Failed to get improvement suggestions:', error);
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
