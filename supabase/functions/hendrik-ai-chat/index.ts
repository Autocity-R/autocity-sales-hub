
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  sessionId: string;
  message: string;
  agentId: string;
  userContext?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { sessionId, message, agentId, userContext }: ChatRequest = await req.json();
    
    console.log('🤖 Hendrik AI Chat Request:', { sessionId, agentId, message: message.substring(0, 100) });

    // Get agent details and permissions
    const { data: agent, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get comprehensive CRM data based on agent permissions
    const permissions = typeof agent.data_access_permissions === 'string'
      ? JSON.parse(agent.data_access_permissions)
      : agent.data_access_permissions || {};

    console.log('📊 Getting CRM data with permissions:', permissions);

    // Fetch CRM data
    const crmData = await getCRMData(supabaseClient, permissions);
    
    // Get recent sales interactions for learning context
    const { data: recentInteractions } = await supabaseClient
      .from('ai_sales_interactions')
      .select('*')
      .eq('agent_name', 'hendrik')
      .order('created_at', { ascending: false })
      .limit(5);

    // Prepare context for Hendrik
    const contextPrompt = buildHendrikContext(agent, crmData, recentInteractions || []);
    
    console.log('🧠 Built context for Hendrik:', {
      appointments: crmData.appointments?.length || 0,
      leads: crmData.leads?.length || 0,
      contacts: crmData.contacts?.length || 0,
      vehicles: crmData.vehicles?.length || 0
    });

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        functions: [
          {
            name: 'create_appointment',
            description: 'Create a new appointment in the CRM',
            parameters: {
              type: 'object',
              properties: {
                contact_id: { type: 'string', description: 'Contact ID' },
                title: { type: 'string', description: 'Appointment title' },
                starttime: { type: 'string', description: 'Start time (ISO format)' },
                endtime: { type: 'string', description: 'End time (ISO format)' },
                description: { type: 'string', description: 'Appointment description' }
              },
              required: ['title', 'starttime', 'endtime']
            }
          },
          {
            name: 'update_lead_score',
            description: 'Update lead score based on analysis',
            parameters: {
              type: 'object',
              properties: {
                lead_id: { type: 'string', description: 'Lead ID' },
                new_score: { type: 'number', description: 'New lead score (1-100)' },
                reason: { type: 'string', description: 'Reason for score change' }
              },
              required: ['lead_id', 'new_score', 'reason']
            }
          },
          {
            name: 'suggest_follow_up',
            description: 'Suggest follow-up actions for leads',
            parameters: {
              type: 'object',
              properties: {
                lead_id: { type: 'string', description: 'Lead ID' },
                action_type: { type: 'string', enum: ['call', 'email', 'meeting', 'proposal'] },
                suggested_message: { type: 'string', description: 'Suggested message content' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
              },
              required: ['lead_id', 'action_type', 'priority']
            }
          }
        ],
        function_call: 'auto'
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const choice = openAIData.choices[0];
    
    let responseMessage = choice.message.content;
    let functionResult = null;

    // Handle function calls
    if (choice.message.function_call) {
      console.log('🔧 Function call detected:', choice.message.function_call.name);
      functionResult = await handleFunctionCall(
        supabaseClient,
        choice.message.function_call,
        agentId
      );
      
      // Add function result to response
      if (functionResult.success) {
        responseMessage += `\n\n✅ ${functionResult.message}`;
      } else {
        responseMessage += `\n\n❌ ${functionResult.error}`;
      }
    }

    // Log the interaction for learning
    await supabaseClient
      .from('ai_sales_interactions')
      .insert({
        interaction_type: 'chat_response',
        input_data: { message, context_size: Object.keys(crmData).length },
        ai_response: responseMessage,
        agent_name: 'hendrik',
        session_id: sessionId,
        function_called: choice.message.function_call?.name || null,
        function_result: functionResult
      });

    console.log('✅ Hendrik response generated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      function_called: choice.message.function_call?.name,
      function_result: functionResult,
      context_used: {
        appointments: crmData.appointments?.length || 0,
        leads: crmData.leads?.length || 0,
        contacts: crmData.contacts?.length || 0,
        vehicles: crmData.vehicles?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Hendrik AI Chat Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Sorry, er ging iets mis. Probeer het opnieuw.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getCRMData(supabase: any, permissions: any) {
  const data: any = {};

  try {
    // Get appointments if permitted
    if (permissions.appointments) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('starttime', new Date().toISOString())
        .order('starttime', { ascending: true })
        .limit(20);
      data.appointments = appointments || [];
    }

    // Get leads if permitted
    if (permissions.leads) {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      data.leads = leads || [];
    }

    // Get contacts if permitted
    if (permissions.contacts) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      data.contacts = contacts || [];
    }

    // Get vehicles if permitted
    if (permissions.vehicles) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'voorraad')
        .limit(20);
      data.vehicles = vehicles || [];
    }

    // Get contracts if permitted
    if (permissions.contracts) {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      data.contracts = contracts || [];
    }

  } catch (error) {
    console.error('Error fetching CRM data:', error);
  }

  return data;
}

function buildHendrikContext(agent: any, crmData: any, recentInteractions: any[]) {
  const today = new Date().toLocaleDateString('nl-NL');
  
  return `Je bent Hendrik, de Sales AI Assistent van Auto City. Het is vandaag ${today}.

JOUW ROL:
${agent.persona}

BESCHIKBARE CRM DATA (LIVE):
- Afspraken: ${crmData.appointments?.length || 0} komende afspraken
- Leads: ${crmData.leads?.length || 0} actieve leads  
- Contacten: ${crmData.contacts?.length || 0} contacten in database
- Voertuigen: ${crmData.vehicles?.length || 0} beschikbare voertuigen
- Contracten: ${crmData.contracts?.length || 0} recente contracten

SALES CONTEXT:
${crmData.leads ? `
Recente leads (top 10):
${crmData.leads.slice(0, 10).map((lead: any) => 
  `- ${lead.first_name} ${lead.last_name} (${lead.email}) - Status: ${lead.status} - Score: ${lead.lead_score || 'N/A'} - Interesse: ${lead.interest_type || 'N/A'}`
).join('\n')}` : ''}

${crmData.appointments ? `
Komende afspraken:
${crmData.appointments.slice(0, 5).map((apt: any) => 
  `- ${new Date(apt.starttime).toLocaleDateString('nl-NL')} ${new Date(apt.starttime).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})} - ${apt.title}`
).join('\n')}` : ''}

${crmData.vehicles ? `
Beschikbare voertuigen (top 10):
${crmData.vehicles.slice(0, 10).map((vehicle: any) => 
  `- ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - €${vehicle.price} - ${vehicle.license_number || 'Geen kenteken'}`
).join('\n')}` : ''}

RECENTE TEAM FEEDBACK:
${recentInteractions.length > 0 ? recentInteractions.map((interaction: any) => 
  `- ${interaction.interaction_type}: ${interaction.team_feedback || 'Geen feedback'} (Rating: ${interaction.team_rating || 'N/A'})`
).join('\n') : 'Nog geen team feedback beschikbaar'}

INSTRUCTIES:
1. Gebruik ALTIJD de live CRM data in je antwoorden
2. Geef concrete, actionable advice gebaseerd op echte data
3. Wees proactief met follow-up suggesties
4. Gebruik function calls voor CRM acties wanneer gevraagd
5. Leer van team feedback om je responses te verbeteren
6. Spreek Nederlands en wees vriendelijk maar professioneel
7. Focus op sales opportunities en customer success

Als je gevraagd wordt om iets te doen wat een CRM actie vereist (afspraak maken, lead score updaten, etc.), gebruik dan de beschikbare functions.`;
}

async function handleFunctionCall(supabase: any, functionCall: any, agentId: string) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  try {
    switch (name) {
      case 'create_appointment':
        const { data: newAppointment, error: aptError } = await supabase
          .from('appointments')
          .insert({
            ...parsedArgs,
            created_by_ai: true,
            ai_agent_id: agentId,
            createdby: 'Hendrik AI Assistant'
          })
          .select()
          .single();

        if (aptError) throw aptError;
        return { success: true, message: `Afspraak aangemaakt: ${newAppointment.title}`, data: newAppointment };

      case 'update_lead_score':
        const { data: updatedLead, error: leadError } = await supabase
          .from('leads')
          .update({ lead_score: parsedArgs.new_score })
          .eq('id', parsedArgs.lead_id)
          .select()
          .single();

        if (leadError) throw leadError;

        // Log scoring history
        await supabase
          .from('lead_scoring_history')
          .insert({
            lead_id: parsedArgs.lead_id,
            new_score: parsedArgs.new_score,
            scoring_reason: parsedArgs.reason,
            scored_by_agent: 'hendrik'
          });

        return { success: true, message: `Lead score bijgewerkt naar ${parsedArgs.new_score}`, data: updatedLead };

      case 'suggest_follow_up':
        const { data: suggestion, error: suggestionError } = await supabase
          .from('ai_sales_interactions')
          .insert({
            interaction_type: 'follow_up_suggestion',
            input_data: parsedArgs,
            ai_response: `Suggestie: ${parsedArgs.action_type} voor lead ${parsedArgs.lead_id}`,
            agent_name: 'hendrik'
          })
          .select()
          .single();

        if (suggestionError) throw suggestionError;
        return { success: true, message: `Follow-up suggestie opgeslagen: ${parsedArgs.action_type}`, data: suggestion };

      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  } catch (error) {
    console.error(`Function call error (${name}):`, error);
    return { success: false, error: error.message };
  }
}
