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

// Alert thresholds
const THRESHOLDS = {
  IMPORT_STATUS_DAYS: 9,
  TRANSPORT_DAYS: 20,
  PAPERS_DAYS: 14,
  SLOW_MOVER_DAYS: 50,
  WORKSHOP_DAYS: 14,
};

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
    
    console.log('🧠 Hendrik CEO AI Chat:', { sessionId, agentId, message: message.substring(0, 100), mode: userContext?.mode });

    // Get CEO briefing data
    const ceoData = await getCEOBriefingData(supabaseClient);
    
    // Get conversation history
    const { data: conversationHistory } = await supabaseClient
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    console.log('📊 CEO Data loaded:', {
      alerts: ceoData.alerts.length,
      vehiclesOnStock: ceoData.dailyStats.vehiclesOnStock,
      vehiclesInTransit: ceoData.dailyStats.vehiclesInTransit,
    });

    // Build CEO context prompt
    const contextPrompt = buildCEOContextPrompt(ceoData);
    
    // Build conversation messages
    const conversationMessages = buildConversationMessages(
      contextPrompt, 
      conversationHistory || [], 
      message
    );

    // Call OpenAI with CEO functions
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
        max_tokens: 1500,
        functions: getCEOFunctions(),
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
      console.log('🔧 CEO Function call:', choice.message.function_call.name);
      functionResult = await handleCEOFunctionCall(
        supabaseClient,
        choice.message.function_call,
        ceoData
      );
      
      if (functionResult.success) {
        responseMessage += `\n\n${functionResult.message}`;
      }
    }

    // Log interaction
    await supabaseClient
      .from('ai_sales_interactions')
      .insert({
        interaction_type: 'ceo_chat',
        input_data: { 
          message, 
          mode: userContext?.mode,
          alerts_count: ceoData.alerts.length,
        },
        ai_response: responseMessage,
        agent_name: 'hendrik_ceo',
      });

    console.log('✅ CEO response generated');

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      function_called: choice.message.function_call?.name,
      function_result: functionResult,
      context_used: {
        alerts: ceoData.alerts.length,
        vehicles_on_stock: ceoData.dailyStats.vehiclesOnStock,
        vehicles_in_transit: ceoData.dailyStats.vehiclesInTransit,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ CEO AI Chat Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Sorry, er ging iets mis. Probeer het opnieuw.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getCEOBriefingData(supabase: any) {
  const alerts: any[] = [];
  
  // Import status alerts (>9 days)
  const thresholdImport = new Date();
  thresholdImport.setDate(thresholdImport.getDate() - THRESHOLDS.IMPORT_STATUS_DAYS);
  
  const { data: importAlerts } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, import_status, import_updated_at')
    .in('import_status', ['aangemeld', 'goedgekeurd', 'bpm_betaald'])
    .lt('import_updated_at', thresholdImport.toISOString());

  if (importAlerts?.length > 0) {
    alerts.push({
      type: 'import_status',
      severity: 'critical',
      count: importAlerts.length,
      vehicles: importAlerts.map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number,
        status: v.import_status,
        days: Math.floor((Date.now() - new Date(v.import_updated_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      message: `${importAlerts.length} voertuig(en) >9 dagen in import status`
    });
  }

  // Transport alerts (>20 days)
  const thresholdTransport = new Date();
  thresholdTransport.setDate(thresholdTransport.getDate() - THRESHOLDS.TRANSPORT_DAYS);
  
  const { data: transportAlerts } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, purchase_date')
    .eq('location', 'in_transport')
    .lt('purchase_date', thresholdTransport.toISOString());

  if (transportAlerts?.length > 0) {
    alerts.push({
      type: 'transport',
      severity: 'critical',
      count: transportAlerts.length,
      vehicles: transportAlerts.map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number,
        days: Math.floor((Date.now() - new Date(v.purchase_date).getTime()) / (1000 * 60 * 60 * 24))
      })),
      message: `${transportAlerts.length} voertuig(en) >20 dagen onderweg`
    });
  }

  // Papers not received (>14 days, excl trade-in and delivered)
  const thresholdPapers = new Date();
  thresholdPapers.setDate(thresholdPapers.getDate() - THRESHOLDS.PAPERS_DAYS);
  
  const { data: papersAlerts } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, details, created_at')
    .in('status', ['voorraad', 'verkocht_b2b', 'verkocht_b2c'])
    .eq('location', 'autocity')
    .lt('created_at', thresholdPapers.toISOString());

  const filteredPapers = papersAlerts?.filter((v: any) => {
    const details = v.details || {};
    return details.papersReceived !== true && details.isTradeIn !== true;
  }) || [];

  if (filteredPapers.length > 0) {
    alerts.push({
      type: 'papers',
      severity: 'warning',
      count: filteredPapers.length,
      vehicles: filteredPapers.map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number,
        days: Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      message: `${filteredPapers.length} voertuig(en) >14 dagen geen papieren`
    });
  }

  // Not online alerts
  const { data: stockVehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, details')
    .eq('status', 'voorraad');

  const notOnline = stockVehicles?.filter((v: any) => {
    const details = v.details || {};
    return details.showroomOnline !== true;
  }) || [];

  if (notOnline.length > 0) {
    alerts.push({
      type: 'not_online',
      severity: 'warning',
      count: notOnline.length,
      vehicles: notOnline.slice(0, 10).map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number
      })),
      message: `${notOnline.length} voertuig(en) op voorraad maar NIET online`
    });
  }

  // Slow movers (>50 days)
  const thresholdSlow = new Date();
  thresholdSlow.setDate(thresholdSlow.getDate() - THRESHOLDS.SLOW_MOVER_DAYS);
  
  const { data: slowMovers } = await supabase
    .from('vehicles')
    .select('id, brand, model, license_number, created_at, selling_price')
    .eq('status', 'voorraad')
    .lt('created_at', thresholdSlow.toISOString());

  if (slowMovers?.length > 0) {
    alerts.push({
      type: 'slow_mover',
      severity: 'warning',
      count: slowMovers.length,
      vehicles: slowMovers.map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number,
        days: Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        price: v.selling_price
      })),
      message: `${slowMovers.length} voertuig(en) >50 dagen op voorraad`
    });
  }

  // Daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: soldToday } = await supabase
    .from('vehicles')
    .select('id')
    .in('status', ['verkocht_b2b', 'verkocht_b2c'])
    .gte('sold_date', today.toISOString());

  const { data: inTransit } = await supabase
    .from('vehicles')
    .select('id')
    .eq('location', 'in_transport');

  // Get team sales data
  const { data: weeklySales } = await supabase
    .from('weekly_sales')
    .select('*')
    .order('week_start_date', { ascending: false })
    .limit(20);

  // Get lease suppliers
  const { data: suppliers } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company_name')
    .eq('type', 'supplier');

  const leaseKeywords = ['arval', 'ayvens', 'alphabet', 'athlon', 'leaseplan', 'terberg'];
  const leaseSuppliers = suppliers?.filter((s: any) => {
    const name = `${s.first_name} ${s.last_name} ${s.company_name || ''}`.toLowerCase();
    return leaseKeywords.some(kw => name.includes(kw));
  }) || [];

  return {
    alerts,
    dailyStats: {
      vehiclesSoldToday: soldToday?.length || 0,
      vehiclesInTransit: inTransit?.length || 0,
      vehiclesOnStock: stockVehicles?.length || 0,
      vehiclesNotOnline: notOnline.length,
    },
    teamSales: weeklySales || [],
    leaseSuppliers,
  };
}

function buildCEOContextPrompt(ceoData: any): string {
  let prompt = `# AUTOCITY CEO AI - HENDRIK
## Virtuele CEO & Bedrijfsleider

Je bent Hendrik, de virtuele CEO en bedrijfsleider van Autocity.
Je hebt volledig overzicht over ALLE bedrijfsoperaties: voorraad, transport, inkoop, verkoop, leveranciers, en team performance.
Je denkt in 10x groei en signaleert proactief problemen voordat ze escaleren.

## BEDRIJFSCONTEXT
- Autocity: 55 jaar familiebedrijf, jong gebruikte premium auto's (0-5 jaar)
- BOVAG gecertificeerd
- Doel: 10x groei in 5 jaar

## JOUW TEAM
- DAAN: Verkoper B2B & B2C
- MARTIJN: Verkoper B2C  
- ALEX: Inkoper & B2B Verkoper
- HENDRIK (jij): Inkoper & Verkoper B2B/B2C

## KRITIEKE ALERT THRESHOLDS
- Import status: max 9 dagen per status
- Transport: max 20 dagen (doel <14 dagen)
- Papieren: max 14 dagen na aankomst (excl. inruil voertuigen)
- Slow movers: >50 dagen op voorraad
- Werkplaats: max 14 dagen

## HUIDIGE STATUS
`;

  // Add alerts
  if (ceoData.alerts.length > 0) {
    prompt += `\n🚨 KRITIEKE ALERTS:\n`;
    ceoData.alerts.forEach((alert: any) => {
      const icon = alert.severity === 'critical' ? '🔴' : '🟡';
      prompt += `${icon} ${alert.message}\n`;
      if (alert.vehicles?.length > 0) {
        alert.vehicles.slice(0, 5).forEach((v: any) => {
          prompt += `   - ${v.brand} ${v.model} (${v.license || 'geen kenteken'})${v.days ? ` - ${v.days} dagen` : ''}\n`;
        });
      }
    });
  } else {
    prompt += `\n✅ Geen kritieke alerts\n`;
  }

  // Add daily stats
  prompt += `\n📊 DAGELIJKSE STATUS:
- Verkocht vandaag: ${ceoData.dailyStats.vehiclesSoldToday}
- In transport: ${ceoData.dailyStats.vehiclesInTransit}
- Op voorraad: ${ceoData.dailyStats.vehiclesOnStock}
- Niet online: ${ceoData.dailyStats.vehiclesNotOnline}
`;

  // Add lease suppliers info
  if (ceoData.leaseSuppliers?.length > 0) {
    prompt += `\n🏢 LEASE MAATSCHAPPIJEN:
${ceoData.leaseSuppliers.map((s: any) => `- ${s.company_name || `${s.first_name} ${s.last_name}`}`).join('\n')}
`;
  }

  prompt += `
## COMMUNICATIE STIJL
- Direct en to-the-point
- Data-gedreven
- Proactief problemen signaleren
- 10x groei mindset

## BELANGRIJKE REGELS
- Geen leads/CRM functionaliteit - dit systeem is voor operationele CEO taken
- Focus op voorraad, transport, import, team performance
- Volg lease maatschappij trends
- Denk altijd in schaalbaarheid en groei
`;

  return prompt;
}

function buildConversationMessages(systemPrompt: string, history: any[], currentMessage: string) {
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add history (last 20 messages)
  history.slice(-20).forEach(msg => {
    messages.push({
      role: msg.message_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  // Add current message
  messages.push({ role: 'user', content: currentMessage });

  return messages;
}

function getCEOFunctions() {
  return [
    {
      name: 'get_transport_details',
      description: 'Get detailed information about vehicles in transport',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'delayed', 'critical'] }
        }
      }
    },
    {
      name: 'get_import_status_details',
      description: 'Get detailed information about vehicles in import process',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['aangemeld', 'goedgekeurd', 'bpm_betaald', 'all'] }
        }
      }
    },
    {
      name: 'get_team_performance',
      description: 'Get performance metrics for team members',
      parameters: {
        type: 'object',
        properties: {
          member: { type: 'string', description: 'Team member name (Daan, Martijn, Alex, Hendrik) or "all"' }
        }
      }
    },
    {
      name: 'get_slow_movers',
      description: 'Get list of vehicles on stock for too long',
      parameters: {
        type: 'object',
        properties: {
          min_days: { type: 'number', description: 'Minimum days on stock' }
        }
      }
    },
    {
      name: 'get_vehicles_not_online',
      description: 'Get list of vehicles on stock that are not published online',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  ];
}

async function handleCEOFunctionCall(supabase: any, functionCall: any, ceoData: any) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args || '{}');

  try {
    switch (name) {
      case 'get_transport_details': {
        const transportAlert = ceoData.alerts.find((a: any) => a.type === 'transport');
        if (transportAlert) {
          return {
            success: true,
            message: `📦 **Transport Overzicht:**\n${transportAlert.vehicles.map((v: any) => 
              `• ${v.brand} ${v.model} (${v.license || 'n/a'}) - ${v.days} dagen onderweg`
            ).join('\n')}`
          };
        }
        return { success: true, message: '✅ Geen vertraagde transporten' };
      }

      case 'get_import_status_details': {
        const importAlert = ceoData.alerts.find((a: any) => a.type === 'import_status');
        if (importAlert) {
          return {
            success: true,
            message: `📋 **Import Status Overzicht:**\n${importAlert.vehicles.map((v: any) => 
              `• ${v.brand} ${v.model} (${v.license || 'n/a'}) - Status: ${v.status} - ${v.days} dagen`
            ).join('\n')}`
          };
        }
        return { success: true, message: '✅ Alle import statussen up-to-date' };
      }

      case 'get_team_performance': {
        const teamMembers = ['Daan', 'Martijn', 'Alex', 'Hendrik'];
        let report = '👥 **Team Performance:**\n';
        
        teamMembers.forEach(member => {
          const memberSales = ceoData.teamSales?.filter((s: any) => 
            s.salesperson_name?.toLowerCase().includes(member.toLowerCase())
          ) || [];
          const b2b = memberSales.reduce((sum: number, s: any) => sum + (s.b2b_sales || 0), 0);
          const b2c = memberSales.reduce((sum: number, s: any) => sum + (s.b2c_sales || 0), 0);
          report += `• ${member}: ${b2b} B2B, ${b2c} B2C (totaal: ${b2b + b2c})\n`;
        });
        
        return { success: true, message: report };
      }

      case 'get_slow_movers': {
        const slowAlert = ceoData.alerts.find((a: any) => a.type === 'slow_mover');
        if (slowAlert) {
          return {
            success: true,
            message: `🐌 **Slow Movers (>${parsedArgs.min_days || 50} dagen):**\n${slowAlert.vehicles.slice(0, 10).map((v: any) => 
              `• ${v.brand} ${v.model} (${v.license || 'n/a'}) - ${v.days} dagen - €${v.price?.toLocaleString() || 'n/a'}`
            ).join('\n')}`
          };
        }
        return { success: true, message: '✅ Geen slow movers' };
      }

      case 'get_vehicles_not_online': {
        const notOnlineAlert = ceoData.alerts.find((a: any) => a.type === 'not_online');
        if (notOnlineAlert) {
          return {
            success: true,
            message: `🌐 **Niet Online (${notOnlineAlert.count} voertuigen):**\n${notOnlineAlert.vehicles.slice(0, 10).map((v: any) => 
              `• ${v.brand} ${v.model} (${v.license || 'n/a'})`
            ).join('\n')}${notOnlineAlert.count > 10 ? `\n... en ${notOnlineAlert.count - 10} meer` : ''}`
          };
        }
        return { success: true, message: '✅ Alle voorraad is online' };
      }

      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  } catch (error) {
    console.error(`CEO function error (${name}):`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
