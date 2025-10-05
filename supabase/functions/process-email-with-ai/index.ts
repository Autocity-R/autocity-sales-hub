import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { emailMessageId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email message
    const { data: emailMessage, error: emailError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', emailMessageId)
      .single();

    if (emailError) throw emailError;

    // Analyze email with OpenAI
    const prompt = `Analyseer deze automotive lead email en geef een gestructureerde analyse:

Email van: ${emailMessage.sender}
Onderwerp: ${emailMessage.subject || 'Geen onderwerp'}
Bericht: ${emailMessage.body || emailMessage.html_body}

Geef de volgende informatie terug in JSON formaat:
1. sentiment_score: nummer tussen -1 (negatief) en 1 (positief)
2. intent_classification: 'vraag', 'proefrit', 'offerte', 'klacht', 'inruil', 'general'
3. urgency_level: 'low', 'medium', 'high', 'urgent'
4. competitive_mentions: array van concurrent merken/dealers genoemd
5. key_insights: array van belangrijke punten (max 5)
6. lead_score_adjustment: nummer tussen -20 en 20 (impact op lead score)
7. suggested_response: een professionele, gepersonaliseerde response suggestie
8. response_tone: 'formal', 'friendly', 'professional'`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Je bent een automotive sales AI die emails analyseert voor een autobedrijf. Antwoord altijd in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    // Save AI processing results
    const { data: aiProcessing, error: aiError } = await supabase
      .from('ai_email_processing')
      .insert({
        email_message_id: emailMessageId,
        email_id: emailMessage.message_id,
        sender_email: emailMessage.sender,
        subject: emailMessage.subject,
        lead_id: emailMessage.lead_id,
        content_summary: analysis.key_insights?.join('; '),
        intent_classification: analysis.intent_classification,
        urgency_level: analysis.urgency_level,
        sentiment_score: analysis.sentiment_score,
        competitive_mentions: analysis.competitive_mentions || [],
        key_insights: { insights: analysis.key_insights || [], tone: analysis.response_tone },
        lead_score: 50 + (analysis.lead_score_adjustment || 0),
        suggested_response: analysis.suggested_response,
        response_generated: true,
        processing_agent: 'openai-gpt4o-mini'
      })
      .select()
      .single();

    if (aiError) throw aiError;

    // Create response suggestion
    const { error: suggestionError } = await supabase
      .from('email_response_suggestions')
      .insert({
        email_processing_id: aiProcessing.id,
        lead_id: emailMessage.lead_id,
        suggested_response: analysis.suggested_response,
        response_type: analysis.response_tone,
        priority_level: analysis.urgency_level,
        personalization_factors: {
          sentiment: analysis.sentiment_score,
          intent: analysis.intent_classification,
          competitive_context: analysis.competitive_mentions
        }
      });

    if (suggestionError) throw suggestionError;

    // Update lead score and analysis timestamp
    if (emailMessage.lead_id) {
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          lead_score: 50 + (analysis.lead_score_adjustment || 0),
          last_ai_analysis: new Date().toISOString(),
          urgency_level: analysis.urgency_level,
          intent_classification: analysis.intent_classification
        })
        .eq('id', emailMessage.lead_id);

      if (leadUpdateError) console.error('Lead update error:', leadUpdateError);
    }

    return new Response(
      JSON.stringify({ success: true, analysis: aiProcessing }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI email processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
