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
      .select('*');

    const vehicles = jpcarsData || [];

    // 3. Get CRM voorraad vehicles with supplier info
    const { data: crmVehicles } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, status, purchase_price, selling_price, created_at, import_status, details, supplier_id, location')
      .in('status', ['voorraad', 'onderweg']);

    const crm = crmVehicles || [];

    // 4. Get supplier contacts for supplier coordination
    const supplierIds = [...new Set(crm.map((v: any) => v.supplier_id).filter(Boolean))];
    let suppliers: any[] = [];
    if (supplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, is_car_dealer')
        .in('id', supplierIds);
      suppliers = supplierData || [];
    }

    // 5. Get market history for trend analysis
    const { data: historyData } = await supabase
      .from('jpcars_market_history')
      .select('license_plate, rank_current, price_local, stock_days, clicks, value, stat_leads, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(2000);

    const history = historyData || [];

    // 6. Calculate summary metrics
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

    const top5Risico = [...vehicles]
      .filter((v: any) => v.stock_days != null && v.stock_days_average != null)
      .sort((a: any, b: any) => (b.stock_days - b.stock_days_average) - (a.stock_days - a.stock_days_average))
      .slice(0, 5);

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
      history_records: history.length,
      suppliers_count: suppliers.length,
    };

    // 7. Build context for Claude
    const supplierContext = suppliers.length > 0 ? `\n### Leveranciers
${suppliers.map((s: any) => `- ${s.company_name || `${s.first_name} ${s.last_name}`} (${s.id}) | ${s.is_car_dealer ? 'Autodealer' : 'Particulier'} | ${s.email || '-'}`).join('\n')}

### CRM Voertuigen met Leverancier
${crm.filter((v: any) => v.supplier_id).map((v: any) => {
  const sup = suppliers.find((s: any) => s.id === v.supplier_id);
  return `- ${v.brand} ${v.model} (${v.license_number || '-'}) | Leverancier: ${sup?.company_name || sup?.first_name || 'Onbekend'} | Status: ${v.status}`;
}).join('\n')}` : '';

    const trendContext = history.length > 0 ? `\n### Historische Data Beschikbaar
${history.length} datapunten beschikbaar voor trendanalyse. Gebruik de get_market_trends tool voor specifieke voertuigtrends.` : '\n### Historische Data\nNog geen historische data beschikbaar. Data wordt opgebouwd bij elke sync.';

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
- Leveranciers: ${summary.suppliers_count}

### Top 5 Risico Voertuigen (langst boven gemiddelde stagedagen)
${top5Risico.map((v: any) => `- ${v.make} ${v.model} (${v.license_plate}): rang ${v.rank_current}, ${v.stock_days} dagen (gem: ${v.stock_days_average}), prijs €${v.price_local?.toLocaleString()}`).join('\n')}

### Top 5 Best Presterende (hoogste rang)
${top5Best.map((v: any) => `- ${v.make} ${v.model} (${v.license_plate}): rang ${v.rank_current}, ${v.stock_days} dagen, prijs €${v.price_local?.toLocaleString()}`).join('\n')}
${supplierContext}
${trendContext}

### Alle Online Voertuigen (beknopt)
${vehicles.map((v: any) => `${v.make} ${v.model}|${v.license_plate}|rang:${v.rank_current ?? '-'}|${v.stock_days ?? 0}d|€${v.price_local ?? 0}|waarde:€${v.value ?? 0}|leads:${v.stat_leads ?? 0}|clicks:${v.clicks ?? 0}|concurrentie:${v.competitive_set_size ?? v.window_size ?? '-'}`).join('\n')}
`;

    // 8. Get conversation history
    const { data: historyMsgs } = await supabase
      .from('ai_chat_messages')
      .select('content, message_type')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const claudeMessages: any[] = [];
    (historyMsgs || []).forEach((msg: any) => {
      claudeMessages.push({
        role: msg.message_type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
    claudeMessages.push({ role: 'user', content: message });

    // 9. Define Kevin-specific tools
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
      {
        name: 'get_market_trends',
        description: 'Get historical trend data for a specific vehicle or model to detect market shifts. Shows week-over-week changes in rank, price, clicks, and stock days.',
        input_schema: {
          type: 'object',
          properties: {
            license_plate: { type: 'string', description: 'License plate to get trends for' },
            search: { type: 'string', description: 'Search by make/model if no plate known' },
          },
        },
      },
      {
        name: 'get_supplier_analysis',
        description: 'Get supplier performance analysis - which suppliers deliver fast-moving vs slow-moving vehicles',
        input_schema: {
          type: 'object',
          properties: {
            supplier_id: { type: 'string', description: 'Specific supplier ID to analyze (optional)' },
          },
        },
      },
    ];

    // 10. Call Claude API
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

      const toolResult = handleKevinToolCall(toolCall.name, toolCall.input, vehicles, crm, history, suppliers);

      if (!responseMessage) {
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

function handleKevinToolCall(name: string, input: any, vehicles: any[], crm: any[], history: any[], suppliers: any[]): any {
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

      // Find CRM match
      const crmMatch = crm.find((c: any) => c.license_number?.replace(/[-\s]/g, '').toLowerCase() === vehicle.license_plate?.replace(/[-\s]/g, '').toLowerCase());
      const supplierInfo = crmMatch?.supplier_id ? suppliers.find((s: any) => s.id === crmMatch.supplier_id) : null;

      return {
        success: true,
        data: vehicle,
        message: `**${vehicle.make} ${vehicle.model}** (${vehicle.license_plate})
- Rang: ${vehicle.rank_current ?? '-'} | Stagedagen: ${vehicle.stock_days ?? '-'} (gem: ${vehicle.stock_days_average ?? '-'})
- Prijs: €${vehicle.price_local?.toLocaleString()} | Marktwaarde: €${vehicle.value?.toLocaleString()}
- VVP: 5%=€${vehicle.vvp_5?.toLocaleString()} | 25%=€${vehicle.vvp_25?.toLocaleString()} | 50%=€${vehicle.vvp_50?.toLocaleString()} | 75%=€${vehicle.vvp_75?.toLocaleString()} | 95%=€${vehicle.vvp_95?.toLocaleString()}
- Clicks: ${vehicle.clicks ?? 0} | Leads: ${vehicle.stat_leads ?? 0} | APR: ${vehicle.apr ?? '-'}%
- Concurrentie: ${vehicle.stat_stock_count ?? '-'} online, ${vehicle.stat_sold_count ?? '-'} recent verkocht | Set size: ${vehicle.competitive_set_size ?? vehicle.window_size ?? '-'}
- Omzet int: ${vehicle.stat_turnover_int ?? '-'} | ext: ${vehicle.stat_turnover_ext ?? '-'}
${supplierInfo ? `- Leverancier: ${supplierInfo.company_name || `${supplierInfo.first_name} ${supplierInfo.last_name}`}` : ''}`,
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
- Prijsgevoeligheid: ${v.price_sensitivity ?? '-'}
- ${isOverpriced ? '⚠️ Auto staat boven markt - overweeg prijsverlaging' : isUnderpriced ? '💰 Auto staat onder markt - marge ruimte!' : '✅ Prijs in lijn met markt'}
- Prijshistorie: ${v.price_history_amount_1 ? `€${v.price_history_amount_1.toLocaleString()} (${v.price_history_date_1})` : 'Geen wijzigingen'}${v.price_history_amount_2 ? ` → €${v.price_history_amount_2.toLocaleString()} (${v.price_history_date_2})` : ''}`,
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

      // Fuel type distribution
      const fuelDist: Record<string, number> = {};
      vehicles.forEach((v: any) => { if (v.fuel) fuelDist[v.fuel] = (fuelDist[v.fuel] || 0) + 1; });

      return {
        success: true,
        data: { avgRank, totalClicks, totalLeads, rood, geel, groen, total: vehicles.length, fuelDist },
        message: `**Marktpositie Overzicht**
- Totaal online: ${vehicles.length} voertuigen
- Gemiddelde rang: ${avgRank}
- Verdeling: 🔴 ${rood} | 🟡 ${geel} | 🟢 ${groen}
- Totaal clicks: ${totalClicks.toLocaleString()} | Totaal leads: ${totalLeads}
- CRM voorraad/onderweg: ${crm.length}
- Brandstof verdeling: ${Object.entries(fuelDist).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
      };
    }

    case 'get_market_trends': {
      if (history.length === 0) {
        return { success: true, message: 'Nog geen historische data beschikbaar. Trendanalyse wordt mogelijk na meerdere sync-cycli (uurlijks).' };
      }

      let targetPlates: string[] = [];
      if (input.license_plate) {
        targetPlates = [input.license_plate.toLowerCase()];
      } else if (input.search) {
        const s = input.search.toLowerCase();
        targetPlates = vehicles
          .filter((v: any) => `${v.make} ${v.model}`.toLowerCase().includes(s))
          .map((v: any) => v.license_plate?.toLowerCase())
          .filter(Boolean);
      }

      if (targetPlates.length === 0) {
        return { success: false, message: 'Geen voertuigen gevonden voor trendanalyse.' };
      }

      const trends = targetPlates.slice(0, 5).map((plate: string) => {
        const records = history
          .filter((h: any) => h.license_plate?.toLowerCase() === plate)
          .sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        if (records.length < 2) {
          const v = vehicles.find((v: any) => v.license_plate?.toLowerCase() === plate);
          return `- ${v?.make ?? '?'} ${v?.model ?? '?'} (${plate}): Onvoldoende data voor trend (${records.length} datapunt(en))`;
        }

        const oldest = records[0];
        const newest = records[records.length - 1];
        const rankChange = (newest.rank_current ?? 0) - (oldest.rank_current ?? 0);
        const priceChange = (newest.price_local ?? 0) - (oldest.price_local ?? 0);
        const clicksChange = (newest.clicks ?? 0) - (oldest.clicks ?? 0);
        const v = vehicles.find((v: any) => v.license_plate?.toLowerCase() === plate);

        return `- ${v?.make ?? '?'} ${v?.model ?? '?'} (${plate}):
  Periode: ${records.length} datapunten (${oldest.recorded_at?.substring(0, 10)} → ${newest.recorded_at?.substring(0, 10)})
  Rang: ${oldest.rank_current ?? '-'} → ${newest.rank_current ?? '-'} (${rankChange > 0 ? '+' : ''}${rankChange})
  Prijs: €${oldest.price_local?.toLocaleString() ?? '-'} → €${newest.price_local?.toLocaleString() ?? '-'} (${priceChange > 0 ? '+' : ''}€${priceChange.toLocaleString()})
  Clicks: ${oldest.clicks ?? 0} → ${newest.clicks ?? 0} (${clicksChange > 0 ? '+' : ''}${clicksChange})
  Trend: ${rankChange > 5 ? '📈 Stijgend' : rankChange < -5 ? '📉 Dalend' : '➡️ Stabiel'}`;
      });

      return {
        success: true,
        message: `**Markttrend Analyse**\n${trends.join('\n\n')}`,
      };
    }

    case 'get_supplier_analysis': {
      if (suppliers.length === 0) {
        return { success: true, message: 'Geen leveranciers gevonden in het CRM.' };
      }

      const supplierStats = suppliers.map((sup: any) => {
        const supVehicles = crm.filter((v: any) => v.supplier_id === sup.id);
        const supPlates = supVehicles.map((v: any) => v.license_number?.replace(/[-\s]/g, '').toLowerCase()).filter(Boolean);
        
        const matchedMarket = vehicles.filter((v: any) => 
          supPlates.includes(v.license_plate?.replace(/[-\s]/g, '').toLowerCase())
        );

        const avgRank = matchedMarket.length > 0 
          ? Math.round(matchedMarket.reduce((s: number, v: any) => s + (v.rank_current ?? 0), 0) / matchedMarket.length)
          : null;
        const avgStockDays = matchedMarket.length > 0
          ? Math.round(matchedMarket.reduce((s: number, v: any) => s + (v.stock_days ?? 0), 0) / matchedMarket.length)
          : null;

        return {
          name: sup.company_name || `${sup.first_name} ${sup.last_name}`,
          total: supVehicles.length,
          online: matchedMarket.length,
          avgRank,
          avgStockDays,
        };
      }).filter((s: any) => s.total > 0).sort((a: any, b: any) => b.total - a.total);

      if (input.supplier_id) {
        const specific = supplierStats.find((s: any) => s.name === input.supplier_id);
        if (specific) {
          return { success: true, data: specific, message: `**Leverancier: ${specific.name}**\n- Totaal voertuigen: ${specific.total}\n- Online: ${specific.online}\n- Gem. rang: ${specific.avgRank ?? '-'}\n- Gem. stagedagen: ${specific.avgStockDays ?? '-'}` };
        }
      }

      return {
        success: true,
        data: supplierStats,
        message: `**Leverancier Analyse** (${supplierStats.length} leveranciers)\n` +
          supplierStats.map((s: any) => `- ${s.name}: ${s.total} auto's (${s.online} online), gem. rang ${s.avgRank ?? '-'}, gem. ${s.avgStockDays ?? '-'} stagedagen`).join('\n'),
      };
    }

    default:
      return { success: false, message: `Onbekende functie: ${name}` };
  }
}
