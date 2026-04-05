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

    // 3b. Get sold vehicles for B2C/B2B supplier performance analysis
    const { data: soldVehiclesData } = await supabase
      .from('vehicles')
      .select('id, brand, model, license_number, status, purchase_price, selling_price, created_at, sold_date, supplier_id, details, customer_id')
      .in('status', ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'])
      .not('selling_price', 'is', null)
      .order('sold_date', { ascending: false })
      .limit(500);

    const soldVehicles = soldVehiclesData || [];
    console.log(`📊 Loaded ${soldVehicles.length} sold vehicles for supplier analysis`);

    // 4. Get supplier contacts for supplier coordination (from both CRM and sold vehicles)
    const allSupplierIds = [...new Set([
      ...crm.map((v: any) => v.supplier_id),
      ...soldVehicles.map((v: any) => v.supplier_id),
    ].filter(Boolean))];
    let suppliers: any[] = [];
    if (allSupplierIds.length > 0) {
      const { data: supplierData } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company_name, email, phone, is_car_dealer')
        .in('id', allSupplierIds);
      suppliers = supplierData || [];
    }

    // 5. Get market history for trend analysis
    const { data: historyData } = await supabase
      .from('jpcars_market_history')
      .select('license_plate, rank_current, price_local, stock_days, clicks, value, stat_leads, recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(2000);

    const history = historyData || [];

    // 6. Get taxatie_valuations for dynamic market intelligence
    const { data: taxatieData } = await supabase
      .from('taxatie_valuations')
      .select('vehicle_data, jpcars_data, created_at')
      .not('jpcars_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    const taxaties = taxatieData || [];

    // 7. Build dynamic market trends from taxatie data
    const dynamicTrends = buildDynamicMarketTrends(taxaties);

    // 8. Calculate summary metrics
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
      verkocht_geladen: soldVehicles.length,
      history_records: history.length,
      suppliers_count: suppliers.length,
    };

    // 9. Build context for Claude
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
## ROL VAN DE VOORRAAD MONITOR

De Voorraad Monitor toont onze huidige online etalage. Gebruik deze data om:
1. **Te bewaken** of onze voorraad courant is en waar actie nodig is (stagedagen, rang, prijspositie)
2. **Marktverschuivingen te detecteren** die onze omloopsnelheid bedreigen (dalende rang, stijgende stagedagen)
3. **Te leren** welke modellen goed verkopen (B2C vs B2B) en bij welke leveranciers — analyseer patronen in de data
4. Voor **nieuwe inkoopadviezen** over modellen die we nog NIET hebben, gebruik de \`get_market_fast_movers\` tool
5. Voor het identificeren van **opschaalbare modellen** in onze voorraad, gebruik de \`get_scale_opportunities\` tool

## DYNAMISCHE MARKTTRENDS (uit taxatie-database)

${dynamicTrends}

## REAL-TIME VOORRAAD DATA (JP Cars Voorraadmonitor)

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

### ⚠️ POSITIONERING ALERTS
${buildPositioningAlerts(vehicles)}

### Alle Online Voertuigen (beknopt)
${vehicles.map((v: any) => {
  const optStr = v.options ? (Array.isArray(v.options) ? v.options.slice(0, 5).join(', ') : typeof v.options === 'object' ? Object.keys(v.options).slice(0, 5).join(', ') : '') : '';
  return `${v.make} ${v.model}|${v.license_plate}|rang:${v.rank_current ?? '-'}|${v.stock_days ?? 0}d|€${v.price_local ?? 0}|waarde:€${v.value ?? 0}|mediaan:€${v.vvp_50 ?? '-'}|leads:${v.stat_leads ?? 0}|clicks:${v.clicks ?? 0}|concurrentie:${v.competitive_set_size ?? v.window_size ?? '-'}${optStr ? `|opties:${optStr}` : ''}`;
}).join('\n')}
`;

    // 10. Get conversation history
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

    // 11. Define Kevin-specific tools (9 tools)
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
      {
        name: 'get_scale_opportunities',
        description: 'Identify models in our current stock that meet the Ideal Purchase Combination (ETR >= 4, market avgDays < 45, internal stock days < 25) and should be scaled up for purchasing. Cross-references voorraad monitor with taxatie market data.',
        input_schema: {
          type: 'object',
          properties: {
            min_etr: { type: 'number', description: 'Minimum ETR score (default 4)' },
            max_stock_days: { type: 'number', description: 'Maximum internal stock days (default 25)' },
          },
        },
      },
      {
        name: 'get_market_fast_movers',
        description: 'Get the most popular/fast-moving models across the entire Dutch market from taxatie database (16.000+ records). Groups by brand/model, filters on ETR and courantheid. Use this for purchase advice on models we do NOT yet have in stock.',
        input_schema: {
          type: 'object',
          properties: {
            min_etr: { type: 'number', description: 'Minimum ETR score (default 4)' },
            fuel_type: { type: 'string', description: 'Filter by fuel type: benzine, diesel, elektrisch, hybride, etc.' },
            brand: { type: 'string', description: 'Filter by specific brand (e.g. KIA, VOLKSWAGEN)' },
          },
        },
      },
      {
        name: 'get_positioning_alerts',
        description: 'Get all vehicles that are mispositioned in the market. Checks price vs median (VVP50), rank vs target, stock days vs average. Returns detailed alerts with VVP price range, options, competitive set size, and concrete pricing advice per vehicle.',
        input_schema: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'Filter by severity: "critical" (>10% above median OR rank <50% of target) or "all" (default)' },
          },
        },
      },
    ];

    // 12. Call Claude API
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
    
    // Tool loop: process tool calls iteratively (max 3 rounds)
    let currentContent = claudeData.content;
    let currentMessages = [...claudeMessages];
    let responseMessage = '';

    for (let toolRound = 0; toolRound < 3; toolRound++) {
      const toolBlocks = currentContent?.filter((b: any) => b.type === 'tool_use') || [];
      const textBlocks = currentContent?.filter((b: any) => b.type === 'text') || [];

      // No tools called — extract final text and break
      if (toolBlocks.length === 0) {
        responseMessage = textBlocks.map((b: any) => b.text).join('\n');
        break;
      }

      // Tools called — execute ALL tools, ignore any interim text
      console.log(`🔧 Kevin tool round ${toolRound + 1}: ${toolBlocks.map((t: any) => t.name).join(', ')}`);

      const toolResults: any[] = [];
      for (const toolCall of toolBlocks) {
        const toolResult = handleKevinToolCall(toolCall.name, toolCall.input, vehicles, crm, history, suppliers, taxaties, soldVehicles);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Build follow-up messages with tool results
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: currentContent },
        { role: 'user', content: toolResults },
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
          messages: currentMessages,
          max_tokens: 2000,
          tools: kevinTools,
          tool_choice: { type: 'auto' },
        }),
      });

      if (!followUpResponse.ok) {
        console.error('❌ Follow-up Claude error:', await followUpResponse.text());
        // Fallback: use first tool result message
        responseMessage = toolResults.length > 0 
          ? JSON.parse(toolResults[0].content)?.message || 'Er ging iets mis bij de analyse.'
          : 'Er ging iets mis bij de analyse.';
        break;
      }

      const followUpData = await followUpResponse.json();
      currentContent = followUpData.content;
      // Loop continues to check if Claude called more tools
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
// DYNAMIC MARKET TRENDS BUILDER
// ============================================================================

function buildDynamicMarketTrends(taxaties: any[]): string {
  if (taxaties.length === 0) return 'Geen taxatie-data beschikbaar voor markttrends.';

  // Group by brand/model with ETR and courantheid
  const modelStats: Record<string, { count: number; etrSum: number; etrCount: number; courantheid: Record<string, number>; fuelTypes: Set<string> }> = {};

  for (const t of taxaties) {
    const brand = t.vehicle_data?.brand || t.vehicle_data?.make;
    const model = t.vehicle_data?.model;
    const etr = t.jpcars_data?.etr;
    const cour = t.jpcars_data?.courantheid;
    const fuel = t.vehicle_data?.fuelType;

    if (!brand || !model) continue;
    const key = `${brand} ${model}`.toUpperCase();

    if (!modelStats[key]) {
      modelStats[key] = { count: 0, etrSum: 0, etrCount: 0, courantheid: {}, fuelTypes: new Set() };
    }
    modelStats[key].count++;
    if (etr != null) { modelStats[key].etrSum += Number(etr); modelStats[key].etrCount++; }
    if (cour) { modelStats[key].courantheid[cour] = (modelStats[key].courantheid[cour] || 0) + 1; }
    if (fuel) modelStats[key].fuelTypes.add(fuel);
  }

  // Find top models by ETR
  const ranked = Object.entries(modelStats)
    .filter(([_, s]) => s.etrCount >= 2)
    .map(([name, s]) => ({
      name,
      avgEtr: Math.round((s.etrSum / s.etrCount) * 10) / 10,
      count: s.count,
      topCourantheid: Object.entries(s.courantheid).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
      fuels: [...s.fuelTypes].join(', '),
    }))
    .sort((a, b) => b.avgEtr - a.avgEtr);

  const topModels = ranked.slice(0, 10);
  const bottomModels = ranked.filter(m => m.avgEtr <= 2).slice(0, 5);

  let result = `### Top 10 Courante Modellen (hoogste ETR, dynamisch berekend uit ${taxaties.length} taxaties)\n`;
  result += topModels.map((m, i) => `${i + 1}. **${m.name}** — ETR: ${m.avgEtr} | Courantheid: ${m.topCourantheid} | ${m.count}x getaxeerd | ${m.fuels}`).join('\n');

  if (bottomModels.length > 0) {
    result += `\n\n### Modellen met Lage ETR (vermijd bij inkoop)\n`;
    result += bottomModels.map(m => `- ${m.name} — ETR: ${m.avgEtr} | Courantheid: ${m.topCourantheid} | ${m.count}x`).join('\n');
  }

  return result;
}

// ============================================================================
// POSITIONING ALERTS BUILDER
// ============================================================================

function getPositioningIssues(vehicles: any[]): any[] {
  const alerts: any[] = [];

  for (const v of vehicles) {
    const issues: string[] = [];
    let severity = 'attention';

    // Price vs median check
    const priceVsMedian = v.vvp_50 ? Math.round(((v.price_local - v.vvp_50) / v.vvp_50) * 100) : null;
    if (priceVsMedian !== null && priceVsMedian > 10) {
      issues.push(`Prijs +${priceVsMedian}% boven mediaan`);
      severity = 'critical';
    } else if (v.price_warning && v.price_local > v.price_warning) {
      issues.push(`Prijs boven waarschuwingsgrens (€${v.price_warning.toLocaleString()})`);
      severity = 'critical';
    }

    // Rank vs target check
    if (v.rank_current != null && v.rank_target != null && v.rank_target > 0) {
      const rankRatio = v.rank_current / v.rank_target;
      if (rankRatio < 0.5) {
        issues.push(`Rang ${v.rank_current} (target: ${v.rank_target})`);
        severity = 'critical';
      } else if (rankRatio < 0.75) {
        issues.push(`Rang ${v.rank_current} (target: ${v.rank_target})`);
      }
    }

    // Stock days vs average
    if (v.stock_days != null && v.stock_days_average != null && v.stock_days > v.stock_days_average * 1.2) {
      const overDays = v.stock_days - v.stock_days_average;
      issues.push(`${v.stock_days}d (gem: ${v.stock_days_average}d, +${overDays}d)`);
      if (v.stock_days > v.stock_days_average * 1.5) severity = 'critical';
    }

    if (issues.length > 0) {
      const optStr = v.options
        ? (Array.isArray(v.options) ? v.options.slice(0, 6).join(', ') : typeof v.options === 'object' ? Object.keys(v.options).slice(0, 6).join(', ') : '')
        : '';

      alerts.push({
        make: v.make,
        model: v.model,
        plate: v.license_plate,
        severity,
        issues,
        priceLocal: v.price_local,
        vvp25: v.vvp_25,
        vvp50: v.vvp_50,
        vvp75: v.vvp_75,
        priceVsMedian,
        rankCurrent: v.rank_current,
        rankTarget: v.rank_target,
        stockDays: v.stock_days,
        stockDaysAvg: v.stock_days_average,
        competitiveSet: v.competitive_set_size ?? v.window_size,
        options: optStr,
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return (b.priceVsMedian ?? 0) - (a.priceVsMedian ?? 0);
  });
}

function buildPositioningAlerts(vehicles: any[]): string {
  const alerts = getPositioningIssues(vehicles);
  if (alerts.length === 0) return 'Alle voertuigen zijn goed gepositioneerd. ✅';

  const critical = alerts.filter(a => a.severity === 'critical');
  const attention = alerts.filter(a => a.severity === 'attention');

  let result = `${alerts.length} voertuigen met positioneringsissues (${critical.length} kritiek, ${attention.length} aandacht):\n`;
  result += alerts.slice(0, 8).map(a => {
    const pct = a.priceVsMedian != null ? ` (${a.priceVsMedian > 0 ? '+' : ''}${a.priceVsMedian}% vs mediaan)` : '';
    return `- ${a.severity === 'critical' ? '🔴' : '🟡'} ${a.make} ${a.model} (${a.plate}): €${a.priceLocal?.toLocaleString()}${pct} | rang ${a.rankCurrent ?? '-'} (target ${a.rankTarget ?? '-'}) | ${a.stockDays ?? '-'}d`;
  }).join('\n');

  if (alerts.length > 8) result += `\n... en nog ${alerts.length - 8} voertuigen. Gebruik get_positioning_alerts voor het volledige overzicht.`;

  return result;
}


function handleKevinToolCall(name: string, input: any, vehicles: any[], crm: any[], history: any[], suppliers: any[], taxaties: any[]): any {
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

    case 'get_scale_opportunities': {
      const minEtr = input.min_etr || 4;
      const maxStockDays = input.max_stock_days || 25;

      // Cross-reference voorraad with taxatie data
      const opportunities: any[] = [];

      for (const v of vehicles) {
        if (v.stock_days == null || v.stock_days > maxStockDays) continue;
        if (v.stock_days_average != null && v.stock_days_average > 45) continue;

        // Find matching taxatie for this model
        const matchingTaxaties = taxaties.filter((t: any) => {
          const tModel = (t.vehicle_data?.model || '').toUpperCase();
          const tBrand = (t.vehicle_data?.brand || t.vehicle_data?.make || '').toUpperCase();
          const vModel = (v.model || '').toUpperCase();
          const vMake = (v.make || '').toUpperCase();
          return tModel === vModel && tBrand === vMake;
        });

        const etrValues = matchingTaxaties
          .map((t: any) => Number(t.jpcars_data?.etr))
          .filter((e: number) => !isNaN(e) && e > 0);

        const avgEtr = etrValues.length > 0 ? etrValues.reduce((a: number, b: number) => a + b, 0) / etrValues.length : null;

        if (avgEtr != null && avgEtr >= minEtr) {
          const courValues = matchingTaxaties.map((t: any) => t.jpcars_data?.courantheid).filter(Boolean);
          const topCour = courValues.length > 0
            ? Object.entries(courValues.reduce((acc: any, c: string) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]
            : '-';

          opportunities.push({
            make: v.make,
            model: v.model,
            plate: v.license_plate,
            stockDays: v.stock_days,
            marketAvgDays: v.stock_days_average,
            rank: v.rank_current,
            avgEtr: Math.round(avgEtr * 10) / 10,
            courantheid: topCour,
            taxatieCount: matchingTaxaties.length,
            price: v.price_local,
          });
        }
      }

      opportunities.sort((a, b) => b.avgEtr - a.avgEtr);

      if (opportunities.length === 0) {
        return {
          success: true,
          message: `Geen voertuigen gevonden die voldoen aan de Ideale Inkoopcombinatie (ETR >= ${minEtr}, stagedagen < ${maxStockDays}, markt avgDays < 45). Overweeg de criteria te verruimen.`,
        };
      }

      return {
        success: true,
        data: opportunities,
        message: `**Opschaal Kansen** (${opportunities.length} modellen voldoen aan Ideale Inkoopcombinatie)\n\nCriteria: ETR >= ${minEtr} | Stagedagen < ${maxStockDays} | Markt avgDays < 45\n\n` +
          opportunities.map((o, i) => `${i + 1}. **${o.make} ${o.model}** (${o.plate}) — ETR: ${o.avgEtr} | Courantheid: ${o.courantheid} | ${o.stockDays}d (markt gem: ${o.marketAvgDays ?? '-'}d) | Rang: ${o.rank ?? '-'} | €${o.price?.toLocaleString() ?? '-'} | ${o.taxatieCount}x getaxeerd`).join('\n'),
      };
    }

    case 'get_market_fast_movers': {
      const minEtr = input.min_etr || 4;

      // Group taxaties by brand/model
      const modelMap: Record<string, { count: number; etrSum: number; etrCount: number; courantheid: Record<string, number>; fuels: Set<string>; avgDaysSum: number; avgDaysCount: number; priceSum: number; priceCount: number }> = {};

      for (const t of taxaties) {
        const brand = (t.vehicle_data?.brand || t.vehicle_data?.make || '').toUpperCase();
        const model = (t.vehicle_data?.model || '').toUpperCase();
        const fuel = t.vehicle_data?.fuelType;
        const etr = Number(t.jpcars_data?.etr);
        const cour = t.jpcars_data?.courantheid;
        const stockAvgDays = t.jpcars_data?.stockStats?.avgDays;
        const baseValue = t.jpcars_data?.baseValue || t.jpcars_data?.totalValue;

        if (!brand || !model) continue;

        // Apply filters
        if (input.brand && brand !== input.brand.toUpperCase()) continue;
        if (input.fuel_type && fuel && !fuel.toLowerCase().includes(input.fuel_type.toLowerCase())) continue;

        const key = `${brand} ${model}`;

        if (!modelMap[key]) {
          modelMap[key] = { count: 0, etrSum: 0, etrCount: 0, courantheid: {}, fuels: new Set(), avgDaysSum: 0, avgDaysCount: 0, priceSum: 0, priceCount: 0 };
        }

        modelMap[key].count++;
        if (!isNaN(etr) && etr > 0) { modelMap[key].etrSum += etr; modelMap[key].etrCount++; }
        if (cour) { modelMap[key].courantheid[cour] = (modelMap[key].courantheid[cour] || 0) + 1; }
        if (fuel) modelMap[key].fuels.add(fuel);
        if (stockAvgDays != null) { modelMap[key].avgDaysSum += Number(stockAvgDays); modelMap[key].avgDaysCount++; }
        if (baseValue != null) { modelMap[key].priceSum += Number(baseValue); modelMap[key].priceCount++; }
      }

      // Filter and rank
      const fastMovers = Object.entries(modelMap)
        .filter(([_, s]) => s.etrCount >= 2 && (s.etrSum / s.etrCount) >= minEtr)
        .map(([name, s]) => ({
          name,
          avgEtr: Math.round((s.etrSum / s.etrCount) * 10) / 10,
          count: s.count,
          topCourantheid: Object.entries(s.courantheid).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
          fuels: [...s.fuels].join(', '),
          avgMarketDays: s.avgDaysCount > 0 ? Math.round(s.avgDaysSum / s.avgDaysCount) : null,
          avgPrice: s.priceCount > 0 ? Math.round(s.priceSum / s.priceCount) : null,
          inOurStock: vehicles.some((v: any) => `${v.make} ${v.model}`.toUpperCase() === name),
        }))
        .sort((a, b) => b.avgEtr - a.avgEtr)
        .slice(0, 20);

      if (fastMovers.length === 0) {
        return { success: true, message: `Geen modellen gevonden met ETR >= ${minEtr}${input.brand ? ` voor ${input.brand}` : ''}${input.fuel_type ? ` (${input.fuel_type})` : ''}.` };
      }

      return {
        success: true,
        data: fastMovers,
        message: `**Fast Movers Marktanalyse** (ETR >= ${minEtr}${input.brand ? `, ${input.brand}` : ''}${input.fuel_type ? `, ${input.fuel_type}` : ''})\n\n` +
          fastMovers.map((m, i) => `${i + 1}. **${m.name}** — ETR: ${m.avgEtr} | Courantheid: ${m.topCourantheid} | ${m.count}x getaxeerd | ${m.fuels} | Gem. marktdagen: ${m.avgMarketDays ?? '-'} | Gem. waarde: €${m.avgPrice?.toLocaleString() ?? '-'} | ${m.inOurStock ? '✅ In voorraad' : '🆕 Niet in voorraad'}`).join('\n'),
      };
    }

    case 'get_positioning_alerts': {
      const allAlerts = getPositioningIssues(vehicles);
      const filtered = input.severity === 'critical'
        ? allAlerts.filter(a => a.severity === 'critical')
        : allAlerts;

      if (filtered.length === 0) {
        return { success: true, message: 'Alle voertuigen zijn goed gepositioneerd. Geen alerts. ✅' };
      }

      return {
        success: true,
        data: filtered,
        message: `**⚠️ POSITIONERING ALERTS** (${filtered.length} voertuigen)\n\n` +
          filtered.map((a, i) => {
            const pct = a.priceVsMedian != null ? ` (${a.priceVsMedian > 0 ? '+' : ''}${a.priceVsMedian}% vs mediaan)` : '';
            const advicePrice = a.vvp50 && a.vvp75 ? `€${a.vvp50.toLocaleString()}-€${a.vvp75.toLocaleString()}` : 'N/A';
            return `${i + 1}. ${a.severity === 'critical' ? '🔴' : '🟡'} **${a.make} ${a.model}** (${a.plate}) — ${a.severity === 'critical' ? 'ACTIE VEREIST' : 'AANDACHT'}
   Prijs: €${a.priceLocal?.toLocaleString()}${pct} | Mediaan: €${a.vvp50?.toLocaleString() ?? '-'}
   Rang: ${a.rankCurrent ?? '-'} (target: ${a.rankTarget ?? '-'}) | ${a.stockDays ?? '-'} dagen (gem: ${a.stockDaysAvg ?? '-'})
   ${a.options ? `Opties: ${a.options}` : ''}
   Concurrentie: ${a.competitiveSet ?? '-'} vergelijkbare online
   Issues: ${a.issues.join(' | ')}
   → Advies: ${a.priceVsMedian != null && a.priceVsMedian > 5 ? `Verlaag naar ${advicePrice} (VVP50-VVP75 range)` : a.stockDays > (a.stockDaysAvg || 999) * 1.5 ? 'Overweeg B2B afstoten of actieprijs' : 'Monitoren, kleine correctie overwegen'}`;
          }).join('\n\n'),
      };
    }

    default:
      return { success: false, message: `Onbekende functie: ${name}` };
  }
}
