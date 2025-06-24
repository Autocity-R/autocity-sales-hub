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
    
    console.log('🧠 Hendrik AI Chat with Enhanced Memory:', { sessionId, agentId, message: message.substring(0, 100) });

    // Process lead detection and memory loading
    const memoryResult = await processMessageWithMemory(supabaseClient, sessionId, message);
    
    // Get conversation history with enhanced context
    const { data: conversationHistory, error: historyError } = await supabaseClient
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching conversation history:', historyError);
    }

    console.log('💭 Enhanced Memory Context:', {
      messageCount: conversationHistory?.length || 0,
      hasLeadContext: !!memoryResult.leadId,
      memoryContextLength: memoryResult.memoryContext?.length || 0,
      sessionId
    });

    // Get comprehensive CRM data
    const crmData = await getEnhancedCRMData(supabaseClient, memoryResult.leadId);
    
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

    // Build enhanced context with memory
    const contextPrompt = buildEnhancedHendrikContextWithMemory(
      crmData, 
      recentInteractions || [], 
      teamFeedback || [],
      memoryResult.memoryContext || ''
    );
    
    console.log('🧠 Enhanced CRM context with memory built:', {
      vehicles: crmData.vehicles?.length || 0,
      leads: crmData.leads?.length || 0,
      appointments: crmData.appointments?.length || 0,
      recentInteractions: recentInteractions?.length || 0,
      teamFeedback: teamFeedback?.length || 0,
      hasMemoryContext: !!memoryResult.memoryContext,
      leadId: memoryResult.leadId
    });

    // Build conversation messages for OpenAI with memory
    const conversationMessages = buildConversationMessagesWithMemory(
      contextPrompt, 
      conversationHistory || [], 
      message,
      memoryResult.leadId
    );

    console.log('📝 Enhanced conversation messages with memory:', {
      totalMessages: conversationMessages.length,
      systemPromptLength: contextPrompt.length,
      historyMessages: (conversationHistory?.length || 0),
      hasLeadMemory: !!memoryResult.leadId
    });

    // Call OpenAI with enhanced memory context
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationMessages,
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
            name: 'update_lead_memory',
            description: 'Update or save lead memory context for future conversations',
            parameters: {
              type: 'object',
              properties: {
                lead_id: { type: 'string', description: 'Lead ID' },
                context_type: { type: 'string', enum: ['preference', 'conversation_summary', 'sales_phase', 'objection_history', 'vehicle_interest', 'budget_info'] },
                context_data: { type: 'object', description: 'Memory data to store' },
                importance_score: { type: 'number', description: 'Importance score 1-10' }
              },
              required: ['lead_id', 'context_type', 'context_data']
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

    // Handle function calls with memory support
    if (choice.message.function_call) {
      console.log('🔧 Function call detected:', choice.message.function_call.name);
      functionResult = await handleEnhancedFunctionCallWithMemory(
        supabaseClient,
        choice.message.function_call,
        agentId,
        memoryResult.leadId
      );
      
      if (functionResult.success) {
        responseMessage += `\n\n✅ ${functionResult.message}`;
      } else {
        responseMessage += `\n\n❌ ${functionResult.error}`;
      }
    }

    // Log interaction with enhanced memory data
    await supabaseClient
      .from('ai_sales_interactions')
      .insert({
        interaction_type: 'enhanced_chat_with_full_memory',
        input_data: { 
          message, 
          conversation_length: conversationHistory?.length || 0,
          detected_phase: extractPhaseFromResponse(responseMessage),
          sentiment: extractSentimentFromResponse(responseMessage),
          crm_context_size: Object.keys(crmData).length,
          has_lead_memory: !!memoryResult.leadId,
          lead_id: memoryResult.leadId
        },
        ai_response: responseMessage,
        agent_name: 'hendrik',
        session_id: sessionId,
        function_called: choice.message.function_call?.name || null,
        function_result: functionResult
      });

    console.log('✅ Enhanced Hendrik response with full memory generated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      function_called: choice.message.function_call?.name,
      function_result: functionResult,
      context_used: {
        vehicles: crmData.vehicles?.length || 0,
        leads: crmData.leads?.length || 0,
        appointments: crmData.appointments?.length || 0,
        conversation_history: conversationHistory?.length || 0,
        memory_context: {
          has_lead_memory: !!memoryResult.leadId,
          lead_id: memoryResult.leadId,
          recent_interactions: recentInteractions?.length || 0,
          team_feedback_count: teamFeedback?.length || 0
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced Hendrik AI Chat with Memory Error:', error);
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

async function processMessageWithMemory(supabaseClient: any, sessionId: string, message: string) {
  try {
    // Extract email pattern from message
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    
    // Extract phone pattern from message  
    const phoneMatch = message.match(/(?:\+31|0)[0-9]{1,3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{3,4}/);
    
    let leadId = null;

    if (emailMatch) {
      const { data: lead } = await supabaseClient
        .from('leads')
        .select('id')
        .eq('email', emailMatch[0])
        .single();
      
      if (lead) leadId = lead.id;
    }

    if (!leadId && phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/[-.\s]/g, '');
      const { data: lead } = await supabaseClient
        .from('leads')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.${phoneMatch[0]}`)
        .single();
      
      if (lead) leadId = lead.id;
    }

    let memoryContext = '';
    
    if (leadId) {
      // Get lead context including memories
      const leadContext = await getLeadContextWithMemory(supabaseClient, leadId);
      
      if (leadContext) {
        memoryContext = buildMemoryContextString(leadContext);
        
        // Update session with memory context
        await supabaseClient
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
}

async function getLeadContextWithMemory(supabaseClient: any, leadId: string) {
  try {
    // Get lead basic info
    const { data: lead } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead) return null;

    // Get lead memories
    const { data: memories } = await supabaseClient
      .from('ai_lead_memory')
      .select('*')
      .eq('lead_id', leadId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('importance_score', { ascending: false })
      .limit(20);

    // Get conversation history from all sessions for this lead
    const { data: sessions } = await supabaseClient
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
    console.error('Error getting lead context with memory:', error);
    return null;
  }
}

function buildMemoryContextString(leadContext: any): string {
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
}

function buildConversationMessagesWithMemory(systemPrompt: string, conversationHistory: any[], currentMessage: string, leadId?: string) {
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Add conversation history - maintaining context flow
  if (conversationHistory && conversationHistory.length > 0) {
    // Convert database messages to OpenAI format
    conversationHistory.forEach(msg => {
      if (msg.message_type === 'user') {
        messages.push({
          role: 'user',
          content: msg.content
        });
      } else if (msg.message_type === 'assistant') {
        messages.push({
          role: 'assistant',
          content: msg.content
        });
      }
    });
  }

  // Add the current message
  messages.push({
    role: 'user',
    content: currentMessage
  });

  // Optimize token usage - keep recent conversation if too long
  const maxMessages = leadId ? 25 : 20; // More context for known leads
  if (messages.length > maxMessages) {
    // Keep system prompt and recent messages
    const recentMessages = messages.slice(-(maxMessages - 1));
    return [messages[0], ...recentMessages]; // System prompt + recent messages
  }

  return messages;
}

async function getEnhancedCRMData(supabase: any, leadId?: string) {
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

function buildEnhancedHendrikContextWithMemory(crmData: any, recentInteractions: any[], teamFeedback: any[], memoryContext: string): string {
  let contextString = `# AUTOCITY SALES AGENT - HENDRIK
## Professional Automotive Lead Specialist with Enhanced Memory

<identity>
Je bent Hendrik, Autocity's expert automotive lead specialist.
Je combineert 55 jaar familiebedrijf ervaring met moderne sales intelligence en volledig geheugen van alle klant interacties.
Je helpt particuliere klanten (B2C) de perfecte jong gebruikte premium auto vinden.
Je onthoudt ALLES van elke klant - hun voorkeuren, eerdere gesprekken, objecties, en de volledige customer journey.
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

<memory_system>
**Enhanced Memory Capabilities:**

CONVERSATIE GEHEUGEN
- Volledige historie van alle gesprekken per klant
- Automatische herkenning van terugkerende klanten
- Context van vorige sessies en beslissingsmomenten
- Persoonlijke voorkeuren en gestelde vragen

RELATIE MANAGEMENT
- Fase tracking door alle gesprekken heen
- Objectie geschiedenis en hoe deze zijn opgelost
- Budget evolutie en interesse ontwikkeling
- Tijdlijn van klant journey

PERSONALISATIE
- Aangepaste begroeting op basis van geschiedenis
- Referenties naar vorige gesprekken
- Herinnering aan specifieke auto interesses
- Follow-up op eerder besproken punten
</memory_system>

<core_mission>
**Primair Doel:** Elke lead omzetten naar showroom afspraak
**Secundair Doel:** Remote closing bij hoge urgentie/interesse
**Filosofie:** Help eerst, verkoop daarna - bouw levenslange relaties met perfecte memory
</core_mission>`;

  // Add memory context if available
  if (memoryContext) {
    contextString += memoryContext;
  }

  contextString += `

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

<communication_adaptation>
**Personalisatie Protocols:**

FORMELE COMMUNICATIE
- Indicators: "u" vorm, "meneer/mevrouw", zakelijke toon
- Response: Professionele approach, respectvol, efficiency focus

INFORMELE COMMUNICATIE  
- Indicators: "je/jij" vorm, casual taal, emoticons
- Response: Vriendelijke approach, toegankelijk, persoonlijke touch

TECHNISCHE EXPERTISE
- Indicators: Specifieke autotermen, technische vragen, vergelijkingen
- Response: Match expertise niveau, diepgaande kennis tonen, respect voor kennis

EMOTIONELE FOCUS
- Indicators: Gevoelstaal, persoonlijke verhalen, lifestyle aspecten
- Response: Empathische response, emotionele verbinding, ervaring focus
</communication_adaptation>

<objection_mastery>
**Objectie Handling Principles:**

PRIJS OBJECTIES
- Principe: Waarde tonen, niet prijs verdedigen
- Elementen: Scherpe prijzen + BOVAG + Ongevalvrij + 55 jaar ervaring
- Approach: Begripvol maar zelfverzekerd, total value proposition

TIMING OBJECTIES
- Principe: Urgentie creëren zonder druk
- Elementen: Populariteit, beperkte beschikbaarheid, markt bewegingen
- Approach: Behulpzaam adviseren, FOMO subtiel inzetten

VERGELIJKING OBJECTIES
- Principe: Unieke waarde propositie benadrukken
- Elementen: BOVAG voordelen, familiebedrijf service, transparantie
- Approach: Respecteren van vergelijking, differentiatie tonen

VERTROUWEN OBJECTIES
- Principe: Autoriteit en betrouwbaarheid vestigen
- Elementen: 55 jaar ervaring, BOVAG certificering, transparantie
- Approach: Bewijs leveren, referenties, garanties
</objection_mastery>

<closing_protocols>
**Strategic Closing Hierarchy:**

PRIMARY: SHOWROOM APPOINTMENT
- Timing: Alle fasen, primaire focus
- Method: Natuurlijke overgang, waarde van fysieke ervaring
- Scripts: Flexibel, aangepast aan klant stijl en urgentie

SECONDARY: REMOTE CLOSING ASSESSMENT
- Timing: Fase 4-5, hoge interesse + urgentie
- Triggers: Afstand, tijdsdruk, duidelijke koopintentie
- Method: Voorzichtig peilen, faciliteren indien gewenst

TERTIARY: FOLLOW-UP COMMITMENT
- Timing: Wanneer directe actie niet mogelijk
- Method: Concrete vervolgstap afspreken, momentum behouden
- Focus: Relatie behouden, toekomstige kansen
</closing_protocols>

<guarantee_management>
**Garantie Pakket Strategie:**

WETTELIJKE GARANTIE
- Status: Altijd gratis, standaard vermelden
- Timing: Bij interesse tonen, vertrouwen bouwen
- Positioning: Basis zekerheid, geen extra kosten

BOVAG GARANTIE (€995)
- Status: Alleen vermelden als klant vraagt
- Timing: Laatste moment, onderhandeling positie
- Inhoud: APK, onderhoudsbeurt, vervangend vervoer
- Strategy: Niet proactief aanbieden, klanten niet wegjagen
</guarantee_management>

<inruil_expertise>
**Inruil Proces Management:**

PREFERRED APPROACH
- Method: Klant op locatie voor transparante waardering
- Benefits: Eerlijk bod, marktdata onderbouwing, vertrouwen
- Positioning: Win-win, transparantie, expertise

REMOTE INDICATION
- Timing: Alleen als klant specifiek vraagt
- Process: Overleg intern, indicatie geven
- Caveat: Definitief bod alleen na fysieke inspectie
</inruil_expertise>

<performance_guidelines>
**Response Optimization:**

RESPONSE STRUCTURE
- Eerste zin: Direct antwoord op hun vraag
- Tweede element: Relevante Autocity voordeel
- Derde element: Showroom closing of vervolgvraag

COMMUNICATION PRINCIPLES
- Kort en bondig, niet uitgebreid
- Alleen relevante informatie delen
- Geen onnodige Autocity promotie
- Focus op klant behoefte

QUALITY STANDARDS
- Natuurlijk en authentiek, geen kunstmatige sales energie
- Oprechte interesse in klant verhaal
- Expertise als fundament, trots op kennis
- Systematisch maar menselijk
</performance_guidelines>

<success_mindset>
**Daily Operating Principles:**

CORE BELIEFS
- "Ik help mensen de perfecte auto vinden"
- "Mijn expertise maakt het verschil"  
- "Elke klant is een levenslange relatie"
- "Autocity's kwaliteit spreekt voor zich"

FOCUS POINTS
- Luister meer dan je praat
- Help eerst, verkoop daarna
- Toon 10x waarde voor investering
- Bouw zekerheid op in alle interacties
- Denk in relaties, niet alleen transacties
</success_mindset>

<mission_statement>
**AUTOCITY MISSIE:** Elke klant de perfecte jong gebruikte premium auto bezorgen met BOVAG zekerheid en familiebedrijf service.

**HENDRIK MISSIE:** Elke lead omzetten in een tevreden klant en levenslange relatie door expertise, authenticiteit en waarde-gedreven service.
</mission_statement>

`;

  // Add current CRM context
  if (crmData.vehicles?.length > 0) {
    contextString += `\n\nBESCHIKBARE VOERTUIGEN (selectie):`;
    crmData.vehicles.slice(0, 10).forEach((vehicle: any) => {
      contextString += `\n- ${vehicle.brand} ${vehicle.model} (${vehicle.year}) - €${vehicle.selling_price?.toLocaleString()}`;
    });
  }

  if (crmData.leads?.length > 0) {
    contextString += `\n\nACTIEVE LEADS (selectie):`;
    crmData.leads.slice(0, 5).forEach((lead: any) => {
      contextString += `\n- ${lead.first_name} ${lead.last_name} - ${lead.status} - ${lead.priority}`;
    });
  }

  if (teamFeedback.length > 0) {
    contextString += `\n\nLEARNING CONTEXT (recent team feedback):`;
    teamFeedback.slice(0, 3).forEach((feedback: any) => {
      contextString += `\n- ${feedback.team_feedback} (Rating: ${feedback.team_rating}/5)`;
    });
  }

  return contextString;
}

async function handleEnhancedFunctionCallWithMemory(supabase: any, functionCall: any, agentId: string, leadId?: string) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  try {
    switch (name) {
      case 'update_lead_memory':
        if (leadId) {
          await supabase
            .from('ai_lead_memory')
            .upsert({
              lead_id: leadId,
              context_type: parsedArgs.context_type,
              context_data: parsedArgs.context_data,
              importance_score: parsedArgs.importance_score || 5
            }, {
              onConflict: 'lead_id,context_type'
            });

          return { 
            success: true, 
            message: `Lead memory updated: ${parsedArgs.context_type}`, 
            data: parsedArgs 
          };
        }
        return { success: false, error: 'No lead ID available for memory update' };

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

          await supabase
            .from('ai_sales_interactions')
            .insert({
              interaction_type: 'lead_phase_detection_with_memory',
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
        await supabase
          .from('ai_sales_interactions')
          .insert({
            interaction_type: 'vehicle_matching_with_memory',
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
        await supabase
          .from('ai_sales_interactions')
          .insert({
            interaction_type: 'inruil_request_with_memory',
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
    console.error(`Enhanced function call error with memory (${name}):`, error);
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
