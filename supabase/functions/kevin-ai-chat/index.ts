import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { sessionId, message, agentId } = await req.json();
    console.log('🏷️ Kevin AI Chat:', { sessionId, message: message?.substring(0, 100) });

    // 1. Get Kevin's system prompt
    const { data: agentData } = await supabase
      .from('ai_agents')
      .select('system_prompt, name')
      .eq('id', agentId)
      .single();

    const systemPrompt = agentData?.system_prompt || 'Je bent Kevin, Head of Purchases.';

    // 2. Get JP Cars market data
    const { data: jpcarsData } = await supabase
      .from('jpcars_voorraad_monitor')
      .select('license_plate, make, model, rank_current, stock_days, stock_days_average, price_local, value, price_warning, apr, clicks, stat_leads, stat_sold_count, stat_stock_count, vvp_5, vvp_25, vvp_50, vvp_75, vvp_95, price_history_amount_1, price_history_date_1, price_history_amount_2, price_history_date_2, fuel, body, gear, build, model_year, hp, color, location_name');

    const vehicles = jpcarsData || [];

    // 3. Get CRM voorraad vehicles
    const { data: crmVehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, status, purchase_price, selling_price, created_at, import_status, details, supplier_id, location')
      .in('status', ['voorraad', 'onderweg']);

    const crm = crmVehicles || [];

    // 4. Calculate summary metrics
    const withRank = vehicles.filter((v: any) => v.rank_current != null);
    const avgRank = withRank.length > 0 ? Math.round((withRank.reduce((s: number, v: any) => s + v.rank_current, 0) / withRank.length) * 10) / 10 : 0;
    const avgStockDays = vehicles.length > 0 ? Math.round(vehicles.reduce((s: number, v: any) => s + (v.stock_days || 0), 0) / vehicles.length) : 0;

    const actieVereist = vehicles.filter((v: any) =>
      (v.rank_current != null && v.rank_current < 15) ||
      (v.stock_days > (v.stock_days_average || 999) * 1.3) ||
      (v.price_local > (v.price_warning || Infinity))
    );

    const letOp = vehicles.filter((v: any) =>
      v.rank_current != null && v.rank_current >= 15 && v.rank_current <= 30 &&
      !actieVereist.some((a: any) => a.license_plate === v.license_plate)
    );

    const goed = vehicles.filter((v: any) =>
      v.rank_current != null && v.rank_current > 30 &&
      !actieVereist.some((a: any) => a.license_plate === v.license_plate)
    );

    // Top 5 risks (highest stock_days vs average)
    const top5Risico = [...vehicles]
      .filter((v: any) => v.stock_days != null && v.stock_days_average != null)
      .sort((a: any, b: any) => (b.stock_days - b.stock_days_average) - (a.stock_days - a.stock_days_average))
      .slice(0, 5);

    // Top 5 best performers (highest rank)
    const top5Best = [...withRank]
      .sort((a: any, b: any) => b.rank_current - a.rank_current)
      .slice(0, 5);

    const summary = {
      totaal_online: vehicles.length,
      gem_rang: avgRank,
      gem_stagedagen: avgStockDays,
      actie_vereist: actieVereist.length,
      let_op: letOp.length,
      goed: goed.length,
      crm_voorraad: crm.length,
    };

    // 5. Build context for Claude
    const marketContext = `
## REAL-TIME MARKTDATA (JP Cars API)

### Samenvatting
- Totaal online: ${summary.totaal_online} voertuigen
- Gemiddelde rang: ${summary.gem_rang}
- Gemiddelde stagedagen: ${summary.gem_stagedagen}
- 🔴 Actie vereist: ${summary.actie_vereist} voertuigen
- 🟡 Let op: ${summary.let_op} voertuigen
- 🟢 Goed: ${summary.goed} voertuigen
- CRM voorraad/onderweg: ${summary.crm_voorraad} voertuigen

### Top 5 Risico Voertuigen (langst boven gemiddelde stagedagen)
${top5Risico.map((v: any) => `- ${v.make} ${v.model} (${v.license_plate}): rang ${v.rank_current}, ${v.stock_days} dagen (gem: ${v.stock_days_average}), prijs €${v.price_local?.toLocaleString()}`).join('\n')}

### Top 5 Best Presterende (hoogste rang)
${top5Best.map((v: any) => `- ${v.make} ${v.model} (${v.license_plate}): rang ${v.rank_current}, ${v.stock_days} dagen, prijs €${v.price_local?.toLocaleString()}`).join('\n')}

### Alle Online Voertuigen (beknopt)
${vehicles.map((v: any) => `${v.make} ${v.model}|${v.license_plate}|rang:${v.rank_current ?? '-'}|${v.stock_days ?? 0}d|€${v.price_local ?? 0}|waarde:€${v.value ?? 0}|leads:${v.stat_leads ?? 0}|clicks:${v.clicks ?? 0}`).join('\n')}
`;

    // 6. Get conversation history
    const { data: history } = await supabase
      .from('ai_chat_messages')
      .select('content, message_type')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const claudeMessages: any[] = [];
    (history || []).forEach((msg: any) => {
      claudeMessages.push({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
    claudeMessages.push({ role: 'user', content: message });

    // 7. Define Kevin-specific tools
    const kevinTools = [
      {
        name: 'get_vehicle_detail',
        description: 'Get detailed market data for a specific vehicle by license plate or make/model',
        input_schema: {
          type: 'object',
          properties: {
            license_plate: { type: 'string', description: 'License plate (kenteken)' },
            search: { type: 'string', description: 'Search by make/model if no plate known' },
          },
        },
      },
      {
        name: 'get_slow_movers',
        description: 'Get vehicles that have been on stock longer than average',
        input_schema: {
          type: 'object',
          properties: {
            min_days_over_average: { type: 'number', description: 'Min days above average stock time' },
          },
        },
      },
      {
        name: 'get_price_recommendation',
        description: 'Get pricing analysis and recommendation for a vehicle',
        input_schema: {
          type: 'object',
          properties: {
            license_plate: { type: 'string', description: 'License plate of the vehicle' },
          },
          required: ['license_plate'],
        },
      },
      {
        name: 'get_market_summary',
        description: 'Get overall market position summary with distribution',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    // 8. Call Claude API
    const fullSystemPrompt = `${systemPrompt}\n\n${marketContext}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        system: fullSystemPrompt,
        messages: claudeMessages,
        max_tokens: 2000,
        tools: kevinTools,
        tool_choice: { type: 'auto' },
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const textBlocks = claudeData.content?.filter((b: any) => b.type === 'text') || [];
    const toolBlocks = claudeData.content?.filter((b: any) => b.type === 'tool_use') || [];

    let responseMessage = textBlocks.map((b: any) => b.text).join('\n');

    // Handle tool calls
    if (toolBlocks.length > 0) {
      const toolCall = toolBlocks[0];
      console.log('🔧 Kevin tool call:', toolCall.name);

      const toolResult = handleKevinToolCall(toolCall.name, toolCall.input, vehicles, crm);

      if (!responseMessage) {
        // Follow-up with tool result
        const followUpMessages = [
          ...claudeMessages,
          { role: 'assistant', content: claudeData.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolCall.id, content: JSON.stringify(toolResult) }] },
        ];

        const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            system: fullSystemPrompt,
            messages: followUpMessages,
            max_tokens: 1500,
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          responseMessage = followUpData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || toolResult.message;
        } else {
          responseMessage = toolResult.message;
        }
      }
    }

    if (!responseMessage) {
      responseMessage = 'Ik kon geen antwoord genereren. Stel je vraag opnieuw.';
    }

    console.log('✅ Kevin response generated');

    return new Response(JSON.stringify({
      success: true,
      message: responseMessage,
      context_used: summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Kevin AI Chat Error:', err);
    return new Response(JSON.stringify({
      success: false,
      error: String(err),
      message: 'Sorry, er ging iets mis. Probeer het opnieuw.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// KEVIN TOOL HANDLERS
// ============================================================================

function handleKevinToolCall(name: string, input: any, vehicles: any[], crm: any[]): any {
  switch (name) {
    case 'get_vehicle_detail': {
      let vehicle = null;
      if (input.license_plate) {
        vehicle = vehicles.find((v: any) => v.license_plate?.toLowerCase() === input.license_plate.toLowerCase());
      } else if (input.search) {
        const s = input.search.toLowerCase();
        vehicle = vehicles.find((v: any) => `${v.make} ${v.model}`.toLowerCase().includes(s));
      }
      if (!vehicle) return { success: false, message: 'Voertuig niet gevonden in JP Cars data.' };

      return {
        success: true,
        data: vehicle,
        message: `**${vehicle.make} ${vehicle.model}** (${vehicle.license_plate})
- Rang: ${vehicle.rank_current ?? '-'} | Stagedagen: ${vehicle.stock_days ?? '-'} (gem: ${vehicle.stock_days_average ?? '-'})
- Prijs: €${vehicle.price_local?.toLocaleString()} | Marktwaarde: €${vehicle.value?.toLocaleString()}
- VVP: 5%=€${vehicle.vvp_5?.toLocaleString()} | 25%=€${vehicle.vvp_25?.toLocaleString()} | 50%=€${vehicle.vvp_50?.toLocaleString()} | 75%=€${vehicle.vvp_75?.toLocaleString()} | 95%=€${vehicle.vvp_95?.toLocaleString()}
- Clicks: ${vehicle.clicks ?? 0} | Leads: ${vehicle.stat_leads ?? 0} | APR: ${vehicle.apr ?? '-'}%
- Concurrentie: ${vehicle.stat_stock_count ?? '-'} online, ${vehicle.stat_sold_count ?? '-'} recent verkocht`,
      };
    }

    case 'get_slow_movers': {
      const minOver = input.min_days_over_average || 0;
      const slow = vehicles
        .filter((v: any) => v.stock_days != null && v.stock_days_average != null && (v.stock_days - v.stock_days_average) > minOver)
        .sort((a: any, b: any) => (b.stock_days - b.stock_days_average) - (a.stock_days - a.stock_days_average))
        .slice(0, 15);

      return {
        success: true,
        data: slow,
        message: `**Slow Movers** (${slow.length} voertuigen boven gemiddelde)\n` +
          slow.map((v: any) => `- ${v.make} ${v.model} (${v.license_plate}): ${v.stock_days}d vs gem ${v.stock_days_average}d (+${v.stock_days - v.stock_days_average}d), rang ${v.rank_current ?? '-'}`).join('\n'),
      };
    }

    case 'get_price_recommendation': {
      const v = vehicles.find((v: any) => v.license_plate?.toLowerCase() === input.license_plate?.toLowerCase());
      if (!v) return { success: false, message: 'Voertuig niet gevonden.' };

      const priceVsMedian = v.vvp_50 ? Math.round(((v.price_local - v.vvp_50) / v.vvp_50) * 100) : null;
      const isOverpriced = priceVsMedian !== null && priceVsMedian > 10;
      const isUnderpriced = priceVsMedian !== null && priceVsMedian < -10;

      return {
        success: true,
        data: { vehicle: v, priceVsMedian, isOverpriced, isUnderpriced },
        message: `**Prijsanalyse ${v.make} ${v.model}** (${v.license_plate})
- Huidige prijs: €${v.price_local?.toLocaleString()}
- Marktmediaan (VVP50): €${v.vvp_50?.toLocaleString()} | ${priceVsMedian != null ? `${priceVsMedian > 0 ? '+' : ''}${priceVsMedian}% t.o.v. mediaan` : 'Geen data'}
- Prijsrange markt: €${v.vvp_25?.toLocaleString()} - €${v.vvp_75?.toLocaleString()}
- Waarschuwingsprijs: €${v.price_warning?.toLocaleString() ?? 'N/A'}
- ${isOverpriced ? '⚠️ Auto staat boven markt - overweeg prijsverlaging' : isUnderpriced ? '💰 Auto staat onder markt - marge ruimte!' : '✅ Prijs in lijn met markt'}
- Prijshistorie: ${v.price_history_amount_1 ? `€${v.price_history_amount_1.toLocaleString()} (${v.price_history_date_1})` : 'Geen wijzigingen'}`,
      };
    }

    case 'get_market_summary': {
      const withRank = vehicles.filter((v: any) => v.rank_current != null);
      const avgRank = withRank.length > 0 ? Math.round((withRank.reduce((s: number, v: any) => s + v.rank_current, 0) / withRank.length) * 10) / 10 : 0;
      const totalClicks = vehicles.reduce((s: number, v: any) => s + (v.clicks || 0), 0);
      const totalLeads = vehicles.reduce((s: number, v: any) => s + (v.stat_leads || 0), 0);

      const rood = vehicles.filter((v: any) => v.rank_current != null && v.rank_current < 15).length;
      const geel = vehicles.filter((v: any) => v.rank_current != null && v.rank_current >= 15 && v.rank_current <= 30).length;
      const groen = vehicles.filter((v: any) => v.rank_current != null && v.rank_current > 30).length;

      return {
        success: true,
        data: { avgRank, totalClicks, totalLeads, rood, geel, groen, total: vehicles.length },
        message: `**Marktpositie Overzicht**
- Totaal online: ${vehicles.length} voertuigen
- Gemiddelde rang: ${avgRank}
- Verdeling: 🔴 ${rood} | 🟡 ${geel} | 🟢 ${groen}
- Totaal clicks: ${totalClicks.toLocaleString()} | Totaal leads: ${totalLeads}
- CRM voorraad/onderweg: ${crm.length}`,
      };
    }

    default:
      return { success: false, message: `Onbekende functie: ${name}` };
  }
}
