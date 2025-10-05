import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Get email thread data
    const { data: thread } = await supabase
      .from('email_threads')
      .select('*, email_messages(count)')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get AI processing data
    const { data: aiProcessing } = await supabase
      .from('ai_email_processing')
      .select('*')
      .eq('lead_id', leadId)
      .order('processed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate multi-factor score
    let totalScore = 50; // Base score
    let engagementScore = 0;
    let sentimentScore = 0;
    let urgencyScore = 0;
    let matchScore = 0;

    // 1. Email Engagement (max +20)
    if (thread) {
      const messageCount = thread.message_count || 0;
      engagementScore = Math.min(20, messageCount * 4);
      
      // Quick response bonus
      if (thread.last_message_date) {
        const hoursSinceLastMessage = (Date.now() - new Date(thread.last_message_date).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastMessage < 24) engagementScore += 5;
      }
    }

    // 2. Lead Temperature (+/- 15)
    const temperatureScores = {
      'hot': 15,
      'warm': 10,
      'cold': -5,
      'ice': -15
    };
    const tempScore = temperatureScores[lead.lead_temperature as keyof typeof temperatureScores] || 0;

    // 3. AI Sentiment Analysis (+/- 10)
    if (aiProcessing?.sentiment_score !== null && aiProcessing?.sentiment_score !== undefined) {
      sentimentScore = Math.round(aiProcessing.sentiment_score * 10);
    }

    // 4. Urgency Level (+15)
    const urgencyScores = {
      'urgent': 15,
      'high': 10,
      'medium': 5,
      'low': 0
    };
    urgencyScore = urgencyScores[lead.urgency_level as keyof typeof urgencyScores] || 5;

    // 5. Intent Classification (+10)
    const intentScores = {
      'proefrit': 10,
      'offerte': 8,
      'inruil': 7,
      'vraag': 5,
      'klacht': -5,
      'general': 3
    };
    const intentScore = intentScores[lead.intent_classification as keyof typeof intentScores] || 0;

    // 6. Vehicle Interest Match (+10)
    if (lead.interested_vehicle) {
      matchScore = 10;
    }

    // 7. Priority Override
    const priorityBonus = {
      'urgent': 10,
      'high': 5,
      'medium': 0,
      'low': -5
    };
    const priBonus = priorityBonus[lead.priority as keyof typeof priorityBonus] || 0;

    // Calculate final score
    totalScore = Math.min(100, Math.max(0, 
      totalScore + 
      engagementScore + 
      tempScore + 
      sentimentScore + 
      urgencyScore + 
      intentScore + 
      matchScore + 
      priBonus
    ));

    const previousScore = lead.lead_score || 50;

    // Update lead with new score
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        lead_score: totalScore,
        last_ai_analysis: new Date().toISOString(),
        response_required: totalScore >= 70 || lead.urgency_level === 'urgent'
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    // Log scoring history
    const { error: historyError } = await supabase
      .from('lead_scoring_history')
      .insert({
        lead_id: leadId,
        previous_score: previousScore,
        new_score: totalScore,
        engagement_score: engagementScore,
        sentiment_score: sentimentScore,
        urgency_score: urgencyScore,
        match_score: matchScore,
        scoring_factors: {
          temperature_score: tempScore,
          intent_score: intentScore,
          priority_bonus: priBonus,
          message_count: thread?.message_count || 0
        },
        scoring_reason: `Multi-factor scoring: Engagement(${engagementScore}) + Temp(${tempScore}) + Sentiment(${sentimentScore}) + Urgency(${urgencyScore}) + Intent(${intentScore}) + Match(${matchScore}) + Priority(${priBonus})`
      });

    if (historyError) console.error('History error:', historyError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId,
        previousScore,
        newScore: totalScore,
        breakdown: {
          engagement: engagementScore,
          temperature: tempScore,
          sentiment: sentimentScore,
          urgency: urgencyScore,
          intent: intentScore,
          match: matchScore,
          priority: priBonus
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lead scoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
