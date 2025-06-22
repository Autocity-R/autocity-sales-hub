
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

    // Get comprehensive CRM data for Hendrik
    const crmData = await getEnhancedCRMData(supabaseClient);
    
    // Get recent sales interactions for learning context
    const { data: recentInteractions } = await supabaseClient
      .from('ai_sales_interactions')
      .select('*')
      .eq('agent_name', 'hendrik')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get team feedback for learning
    const { data: teamFeedback } = await supabaseClient
      .from('ai_sales_interactions')
      .select('*')
      .eq('agent_name', 'hendrik')
      .not('team_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build enhanced context with new sales agent prompt
    const contextPrompt = buildEnhancedHendrikContext(crmData, recentInteractions || [], teamFeedback || []);
    
    console.log('🧠 Enhanced CRM context built:', {
      vehicles: crmData.vehicles?.length || 0,
      leads: crmData.leads?.length || 0,
      appointments: crmData.appointments?.length || 0,
      recentInteractions: recentInteractions?.length || 0,
      teamFeedback: teamFeedback?.length || 0
    });

    // Call OpenAI with enhanced context
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
        max_tokens: 1200,
        functions: [
          {
            name: 'create_showroom_appointment',
            description: 'Create a showroom appointment for the customer',
            parameters: {
              type: 'object',
              properties: {
                customer_name: { type: 'string', description: 'Customer full name' },
                customer_email: { type: 'string', description: 'Customer email' },
                customer_phone: { type: 'string', description: 'Customer phone number' },
                vehicle_interest: { type: 'string', description: 'Vehicle they are interested in' },
                preferred_date: { type: 'string', description: 'Preferred appointment date (YYYY-MM-DD)' },
                preferred_time: { type: 'string', description: 'Preferred time (HH:MM)' },
                notes: { type: 'string', description: 'Additional notes or requirements' }
              },
              required: ['customer_name', 'preferred_date', 'preferred_time']
            }
          },
          {
            name: 'update_lead_analysis',
            description: 'Update lead analysis with phase detection and sentiment',
            parameters: {
              type: 'object',
              properties: {
                lead_email: { type: 'string', description: 'Lead email address' },
                detected_phase: { type: 'string', enum: ['orientatie', 'interesse', 'overweging', 'beslissing', 'actie'] },
                sentiment_analysis: { type: 'string', enum: ['enthousiasme', 'twijfel', 'haast', 'prijs_bezorgd', 'angst'] },
                urgency_level: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                conversion_probability: { type: 'number', description: 'Conversion probability (0-100)' },
                next_action: { type: 'string', description: 'Recommended next action' }
              },
              required: ['lead_email', 'detected_phase', 'sentiment_analysis']
            }
          },
          {
            name: 'suggest_vehicle_match',
            description: 'Suggest matching vehicles based on customer requirements',
            parameters: {
              type: 'object',
              properties: {
                customer_requirements: { type: 'string', description: 'Customer requirements and preferences' },
                budget_range: { type: 'string', description: 'Budget range if mentioned' },
                vehicle_type: { type: 'string', description: 'Type of vehicle they are looking for' },
                urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
              },
              required: ['customer_requirements']
            }
          },
          {
            name: 'request_inruil_valuation',
            description: 'Request trade-in valuation for customer vehicle',
            parameters: {
              type: 'object',
              properties: {
                customer_email: { type: 'string', description: 'Customer email' },
                vehicle_brand: { type: 'string', description: 'Current vehicle brand' },
                vehicle_model: { type: 'string', description: 'Current vehicle model' },
                vehicle_year: { type: 'string', description: 'Vehicle year' },
                mileage: { type: 'string', description: 'Vehicle mileage' },
                condition_notes: { type: 'string', description: 'Any condition notes' }
              },
              required: ['customer_email', 'vehicle_brand', 'vehicle_model']
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

    // Handle function calls with enhanced actions
    if (choice.message.function_call) {
      console.log('🔧 Function call detected:', choice.message.function_call.name);
      functionResult = await handleEnhancedFunctionCall(
        supabaseClient,
        choice.message.function_call,
        agentId
      );
      
      if (functionResult.success) {
        responseMessage += `\n\n✅ ${functionResult.message}`;
      } else {
        responseMessage += `\n\n❌ ${functionResult.error}`;
      }
    }

    // Log interaction with enhanced data for learning
    await supabaseClient
      .from('ai_sales_interactions')
      .insert({
        interaction_type: 'enhanced_chat_response',
        input_data: { 
          message, 
          detected_phase: extractPhaseFromResponse(responseMessage),
          sentiment: extractSentimentFromResponse(responseMessage),
          crm_context_size: Object.keys(crmData).length 
        },
        ai_response: responseMessage,
        agent_name: 'hendrik',
        session_id: sessionId,
        function_called: choice.message.function_call?.name || null,
        function_result: functionResult
      });

    console.log('✅ Enhanced Hendrik response generated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      function_called: choice.message.function_call?.name,
      function_result: functionResult,
      context_used: {
        vehicles: crmData.vehicles?.length || 0,
        leads: crmData.leads?.length || 0,
        appointments: crmData.appointments?.length || 0,
        learning_data: {
          recent_interactions: recentInteractions?.length || 0,
          team_feedback_count: teamFeedback?.length || 0
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced Hendrik AI Chat Error:', error);
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

async function getEnhancedCRMData(supabase: any) {
  const data: any = {};

  try {
    // Get available vehicles with full details for Autocity context
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'voorraad')
      .order('created_at', { ascending: false })
      .limit(30);
    data.vehicles = vehicles || [];

    // Get active leads with enhanced analysis
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('status', ['new', 'contacted', 'qualified', 'proposal'])
      .order('lead_score', { ascending: false })
      .limit(50);
    data.leads = leads || [];

    // Get upcoming appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .gte('starttime', new Date().toISOString())
      .order('starttime', { ascending: true })
      .limit(20);
    data.appointments = appointments || [];

    // Get recent contracts for success context
    const { data: contracts } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    data.contracts = contracts || [];

    // Get B2C contacts for customer context
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('type', 'b2c')
      .order('created_at', { ascending: false })
      .limit(30);
    data.contacts = contacts || [];

    // Get recent email processing for sales intelligence
    const { data: emailProcessing } = await supabase
      .from('ai_email_processing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    data.emailProcessing = emailProcessing || [];

    console.log('📊 Enhanced CRM data loaded:', {
      vehicles: data.vehicles.length,
      leads: data.leads.length,
      appointments: data.appointments.length,
      contracts: data.contracts.length,
      contacts: data.contacts.length,
      emailProcessing: data.emailProcessing.length
    });

  } catch (error) {
    console.error('Error fetching enhanced CRM data:', error);
  }

  return data;
}

function buildEnhancedHendrikContext(crmData: any, recentInteractions: any[], teamFeedback: any[]) {
  const today = new Date().toLocaleDateString('nl-NL');
  
  return `# AUTOCITY SALES AGENT - HENDRIK
## Professional Automotive Lead Specialist

<identity>
Je bent Hendrik, Autocity's expert automotive lead specialist.
Je combineert 55 jaar familiebedrijf ervaring met moderne sales intelligence.
Je helpt particuliere klanten (B2C) de perfecte jong gebruikte premium auto vinden.
</identity>

<company_context>
**Autocity Profiel:**
- Website: www.auto-city.nl
- 55 jaar familiebedrijf gespecialiseerd in jong gebruikte premium auto's
- BOVAG gecertificeerd voor kwaliteit en betrouwbaarheid
- Alle auto's ongevalvrij met volledige onderhoudshistorie
- Zeer scherp geprijsd in de Nederlandse markt
- Transparant en betrouwbaar in alle transacties
</company_context>

<core_mission>
**Primair Doel:** Elke lead omzetten naar showroom afspraak
**Secundair Doel:** Remote closing bij hoge urgentie/interesse
**Filosofie:** Help eerst, verkoop daarna - bouw levenslange relaties
</core_mission>

<live_crm_data>
**BESCHIKBARE VOERTUIGEN (${crmData.vehicles?.length || 0} stuks):**
${crmData.vehicles ? crmData.vehicles.slice(0, 15).map((vehicle: any) => 
  `- ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - €${vehicle.selling_price || 'Prijs op aanvraag'} - ${vehicle.license_number || 'Nieuw'} - Status: ${vehicle.status}`
).join('\n') : 'Geen voertuigen beschikbaar'}

**ACTIEVE LEADS (${crmData.leads?.length || 0} stuks):**
${crmData.leads ? crmData.leads.slice(0, 10).map((lead: any) => 
  `- ${lead.first_name} ${lead.last_name} (${lead.email}) - Status: ${lead.status} - Score: ${lead.lead_score || 'NVT'} - Urgentie: ${lead.urgency_level || 'medium'}`
).join('\n') : 'Geen actieve leads'}

**KOMENDE AFSPRAKEN:**
${crmData.appointments ? crmData.appointments.slice(0, 5).map((apt: any) => 
  `- ${new Date(apt.starttime).toLocaleDateString('nl-NL')} ${new Date(apt.starttime).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'})} - ${apt.title} - ${apt.customername || 'Geen naam'}`
).join('\n') : 'Geen afspraken gepland'}

**RECENTE VERKOPEN:**
${crmData.contracts ? crmData.contracts.slice(0, 5).map((contract: any) => 
  `- Contract ${contract.contract_number} - €${contract.contract_amount} - Status: ${contract.status}`
).join('\n') : 'Geen recente contracten'}
</live_crm_data>

<learning_context>
**TEAM FEEDBACK VOOR VERBETERING:**
${teamFeedback.length > 0 ? teamFeedback.map((feedback: any) => 
  `- ${feedback.interaction_type}: "${feedback.team_feedback}" (Rating: ${feedback.team_rating || 'NVT'})`
).join('\n') : 'Nog geen team feedback beschikbaar'}

**RECENTE PERFORMANCE:**
${recentInteractions.length > 0 ? `Laatste ${recentInteractions.length} interacties gelogd voor continue verbetering` : 'Eerste sessie - leer van deze interactie'}
</learning_context>

<lead_analysis_framework>
**Fase Herkenning (Automatisch detecteren):**

FASE 1 - ORIENTATIE
- Indicators: Algemene vragen, "kijk rond", geen specifieke auto
- Response: Expertise tonen, vertrouwen bouwen, behoeften identificeren

FASE 2 - INTERESSE  
- Indicators: Specifieke auto vragen, prijzen, specificaties
- Response: Vragen beantwoorden, waarde tonen, urgentie creëren

FASE 3 - OVERWEGING
- Indicators: Vergelijkingen, twijfel uitingen, objecties
- Response: Objecties handlen, Autocity voordelen, push naar afspraak

FASE 4 - BESLISSING
- Indicators: Koopintentie, "wil deze auto", timing vragen
- Response: Direct faciliteren, afspraak maken, remote closing overwegen

FASE 5 - ACTIE
- Indicators: Reservering willen, proces vragen, concrete stappen
- Response: Directe actie, proces uitleggen, transactie afronden
</lead_analysis_framework>

<sentiment_intelligence>
**Emotionele Herkenning Patterns:**

ENTHOUSIASME
- Patterns: Uitroeptekens, positieve bijvoeglijke naamwoorden, "prachtig/mooi/perfect"
- Response: Match energie niveau, push naar afspraak, faciliteer snelle actie

TWIJFEL/ONZEKERHEID
- Patterns: "misschien", "weet niet zeker", "twijfel tussen", vragende zinnen
- Response: Zekerheid creëren, expertise tonen, BOVAG garanties benadrukken

HAAST/URGENTIE
- Patterns: "snel nodig", "zo spoedig mogelijk", "huidige auto kapot"
- Response: Urgentie faciliteren, snelle oplossing bieden, directe actie

PRIJS BEZORGDHEID
- Patterns: Prijsfocus, "goedkoop", "budget", vergelijkingen
- Response: Waarde demonstratie, scherpe prijzen benadrukken, total cost ownership

ANGST/RISICO AVERSIE
- Patterns: "wat als", "bang voor", "zeker weten", garantie vragen
- Response: Geruststelling, BOVAG voordelen, 55 jaar ervaring, transparantie
</sentiment_intelligence>

<objection_mastery>
**Objectie Handling met CRM Data:**

PRIJS OBJECTIES
- Gebruik: Actuele voorraadprijzen uit CRM
- Positioning: "Deze ${crmData.vehicles?.[0]?.brand || 'auto'} is zeer scherp geprijsd voor €${crmData.vehicles?.[0]?.selling_price || 'XXX'}"
- Waarde: BOVAG + Ongevalvrij + 55 jaar ervaring

VOORRAAD URGENTIE
- Gebruik: Echte voorraadstatus
- Positioning: "We hebben momenteel ${crmData.vehicles?.length || 0} voertuigen op voorraad"
- Actie: Directe reservering mogelijk

VERGELIJKING OBJECTIES
- Gebruik: Autocity unieke voordelen
- Differentiatie: BOVAG + Familiebedrijf + Transparantie
</objection_mastery>

<closing_protocols>
**Strategic Closing met CRM Integratie:**

PRIMARY: SHOWROOM APPOINTMENT
- Gebruik: create_showroom_appointment functie
- Data: Klantgegevens + voertuig interesse uit gesprek
- Timing: Alle fasen, primaire focus

SECONDARY: LEAD ANALYSIS UPDATE
- Gebruik: update_lead_analysis functie
- Data: Gedetecteerde fase + sentiment + urgentie
- Doel: CRM data verrijken voor team

TERTIARY: VEHICLE MATCHING
- Gebruik: suggest_vehicle_match functie
- Data: Klant requirements + budget + voorraad
- Actie: Perfecte match voorstellen
</closing_protocols>

<performance_guidelines>
**Response Optimization met Data:**

RESPONSE STRUCTURE
- Eerste zin: Direct antwoord met CRM data
- Tweede element: Relevante Autocity voordeel + voorraad status
- Derde element: Showroom closing met concrete actie

COMMUNICATION PRINCIPLES
- Gebruik echte voorraad data in gesprek
- Refereer naar actuele prijzen en beschikbaarheid
- Geen onnodige promotie, focus op relevante data
- Leer van team feedback voor betere responses
</performance_guidelines>

<mission_statement>
**ENHANCED HENDRIK MISSIE:** Elke lead omzetten naar een tevreden klant door data-driven expertise, authentieke service en continue learning van team feedback.

Het is vandaag ${today}. Gebruik de live CRM data om klanten de best mogelijke service te bieden en leer van elke interactie om steeds beter te worden.
</mission_statement>`;
}

async function handleEnhancedFunctionCall(supabase: any, functionCall: any, agentId: string) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  try {
    switch (name) {
      case 'create_showroom_appointment':
        const appointmentData = {
          title: `Showroom afspraak - ${parsedArgs.vehicle_interest || 'Voertuig interesse'}`,
          description: `Klant: ${parsedArgs.customer_name}\nEmail: ${parsedArgs.customer_email || 'NVT'}\nTelefoon: ${parsedArgs.customer_phone || 'NVT'}\nInteresse: ${parsedArgs.vehicle_interest || 'Algemeen'}\nNotities: ${parsedArgs.notes || 'Geen extra notities'}`,
          starttime: `${parsedArgs.preferred_date}T${parsedArgs.preferred_time}:00+01:00`,
          endtime: `${parsedArgs.preferred_date}T${String(parseInt(parsedArgs.preferred_time.split(':')[0]) + 1).padStart(2, '0')}:${parsedArgs.preferred_time.split(':')[1]}:00+01:00`,
          type: 'showroom_appointment',
          status: 'gepland',
          customername: parsedArgs.customer_name,
          customeremail: parsedArgs.customer_email || null,
          customerphone: parsedArgs.customer_phone || null,
          createdby: 'Hendrik AI Assistant',
          created_by_ai: true,
          ai_agent_id: agentId
        };

        const { data: newAppointment, error: aptError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (aptError) throw aptError;
        return { 
          success: true, 
          message: `Showroom afspraak gepland voor ${parsedArgs.customer_name} op ${parsedArgs.preferred_date} om ${parsedArgs.preferred_time}`, 
          data: newAppointment 
        };

      case 'update_lead_analysis':
        // Find lead by email
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('email', parsedArgs.lead_email)
          .single();

        if (existingLead) {
          const { data: updatedLead, error: leadError } = await supabase
            .from('leads')
            .update({
              lead_score: parsedArgs.conversion_probability || existingLead.lead_score,
              urgency_level: parsedArgs.urgency_level || existingLead.urgency_level,
              intent_classification: parsedArgs.detected_phase || existingLead.intent_classification,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLead.id)
            .select()
            .single();

          if (leadError) throw leadError;

          // Log the analysis
          await supabase
            .from('ai_sales_interactions')
            .insert({
              interaction_type: 'lead_phase_detection',
              input_data: parsedArgs,
              ai_response: `Lead fase gedetecteerd: ${parsedArgs.detected_phase}, Sentiment: ${parsedArgs.sentiment_analysis}`,
              agent_name: 'hendrik'
            });

          return { 
            success: true, 
            message: `Lead analyse bijgewerkt: ${parsedArgs.detected_phase} fase met ${parsedArgs.sentiment_analysis} sentiment`, 
            data: updatedLead 
          };
        }
        return { success: false, error: 'Lead niet gevonden in CRM' };

      case 'suggest_vehicle_match':
        // Log the vehicle matching request
        await supabase
          .from('ai_sales_interactions')
          .insert({
            interaction_type: 'vehicle_matching',
            input_data: parsedArgs,
            ai_response: `Voertuig matching uitgevoerd voor: ${parsedArgs.customer_requirements}`,
            agent_name: 'hendrik'
          });

        return { 
          success: true, 
          message: `Voertuig matching geanalyseerd voor klant requirements`, 
          data: parsedArgs 
        };

      case 'request_inruil_valuation':
        // Log inruil request
        await supabase
          .from('ai_sales_interactions')
          .insert({
            interaction_type: 'inruil_request',
            input_data: parsedArgs,
            ai_response: `Inruil waardering aangevraagd voor ${parsedArgs.vehicle_brand} ${parsedArgs.vehicle_model}`,
            agent_name: 'hendrik'
          });

        return { 
          success: true, 
          message: `Inruil waardering aangevraagd voor ${parsedArgs.vehicle_brand} ${parsedArgs.vehicle_model}. Ons team neemt contact op voor een transparante waardering.`, 
          data: parsedArgs 
        };

      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  } catch (error) {
    console.error(`Enhanced function call error (${name}):`, error);
    return { success: false, error: error.message };
  }
}

function extractPhaseFromResponse(response: string): string {
  const phases = ['orientatie', 'interesse', 'overweging', 'beslissing', 'actie'];
  for (const phase of phases) {
    if (response.toLowerCase().includes(phase)) return phase;
  }
  return 'onbekend';
}

function extractSentimentFromResponse(response: string): string {
  const sentiments = ['enthousiasme', 'twijfel', 'haast', 'prijs_bezorgd', 'angst'];
  for (const sentiment of sentiments) {
    if (response.toLowerCase().includes(sentiment.replace('_', ' '))) return sentiment;
  }
  return 'neutraal';
}
