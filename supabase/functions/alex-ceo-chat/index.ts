import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALEX_AGENT_ID = 'b6000000-0000-0000-0000-000000000006';

// ═══════════════════════════════════════
// JP CARS TOOL FUNCTIONS
// ═══════════════════════════════════════

function dedup(data: any[]) {
  const seen = new Set();
  return data.filter(v => {
    if (!v.license_plate || seen.has(v.license_plate)) return false;
    seen.add(v.license_plate);
    return true;
  });
}

async function analyze_market_composition(supabase: any, input: { group_by: string }) {
  const { data } = await supabase
    .from('jpcars_voorraad_monitor')
    .select('license_plate, fuel, make, body, stat_turnover_ext, apr, vvp_50, stock_days_average, stat_sold_count, stat_stock_count, price_local');

  const uniek = dedup(data || []);
  const field = input.group_by === 'fuel' ? 'fuel' : input.group_by === 'make' ? 'make' : 'body';

  const groepen: Record<string, any[]> = {};
  for (const auto of uniek) {
    const key = auto[field] || 'Onbekend';
    if (!groepen[key]) groepen[key] = [];
    groepen[key].push(auto);
  }

  return Object.entries(groepen).map(([key, autos]) => ({
    segment: key,
    onze_voorraad: autos.length,
    gem_etr: +(autos.reduce((s, a) => s + (a.stat_turnover_ext || 0), 0) / autos.length).toFixed(2),
    totaal_markt_aanbod: autos.reduce((s, a) => s + (a.stat_stock_count || 0), 0),
    totaal_markt_verkopen: autos.reduce((s, a) => s + (a.stat_sold_count || 0), 0),
    gem_markt_doorlooptijd: Math.round(autos.reduce((s, a) => s + (a.stock_days_average || 0), 0) / autos.length),
    gem_marktprijs: Math.round(autos.reduce((s, a) => s + (Number(a.vvp_50) || 0), 0) / autos.length),
    onze_gem_prijs: Math.round(autos.reduce((s, a) => s + (Number(a.price_local) || 0), 0) / autos.length),
  })).sort((a, b) => b.gem_etr - a.gem_etr);
}

async function analyze_segment_performance(supabase: any, input: { fuel?: string; make?: string; max_price?: number }) {
  let query = supabase.from('jpcars_voorraad_monitor').select('*');
  if (input.fuel) query = query.eq('fuel', input.fuel.toUpperCase());
  if (input.make) query = query.ilike('make', `%${input.make}%`);
  if (input.max_price) query = query.lte('price_local', input.max_price);

  const { data } = await query;
  const uniek = dedup(data || []);
  if (uniek.length === 0) return { error: 'Geen data gevonden voor dit segment' };

  return {
    segment: input,
    aantal: uniek.length,
    gem_etr: +(uniek.reduce((s, a) => s + (a.stat_turnover_ext || 0), 0) / uniek.length).toFixed(2),
    hoog_courant: uniek.filter(a => a.stat_turnover_ext >= 4 && a.apr >= 3).length,
    laag_courant: uniek.filter(a => a.stat_turnover_ext <= 2 && a.apr >= 3).length,
    gem_stock_dagen: Math.round(uniek.reduce((s, a) => s + (a.stock_days || 0), 0) / uniek.length),
    gem_markt_doorlooptijd: Math.round(uniek.reduce((s, a) => s + (a.stock_days_average || 0), 0) / uniek.length),
    gem_onze_prijs: Math.round(uniek.reduce((s, a) => s + Number(a.price_local || 0), 0) / uniek.length),
    gem_markt_mediaan: Math.round(uniek.reduce((s, a) => s + Number(a.vvp_50 || 0), 0) / uniek.length),
    totaal_markt_verkopen: uniek.reduce((s, a) => s + (a.stat_sold_count || 0), 0),
    auto_lijst: uniek.map(a => ({
      make: a.make, model: a.model, build: a.build,
      etr: a.stat_turnover_ext, apr: a.apr,
      prijs: a.price_local, mediaan: a.vvp_50,
      stock_dagen: a.stock_days, kenteken: a.license_plate
    }))
  };
}

async function evaluate_purchase_risk(supabase: any, input: { make: string; model: string; proposed_purchase_price: number }) {
  const { data } = await supabase
    .from('jpcars_voorraad_monitor')
    .select('*')
    .ilike('make', `%${input.make}%`)
    .ilike('model', `%${input.model}%`);

  const uniek = dedup(data || []);
  if (uniek.length === 0) return { error: `Geen JP Cars data voor ${input.make} ${input.model}` };

  const ref = uniek[0];
  const markt_mediaan = Number(ref.vvp_50) || 0;
  const markt_p25 = Number(ref.vvp_25) || 0;
  const verwachte_verkoopprijs = Math.round(markt_mediaan * 0.97);
  const verwachte_marge = verwachte_verkoopprijs - input.proposed_purchase_price;
  const marge_pct = input.proposed_purchase_price > 0 ? +(verwachte_marge / input.proposed_purchase_price * 100).toFixed(1) : 0;

  return {
    model: `${input.make} ${input.model}`,
    etr: ref.stat_turnover_ext,
    apr_betrouwbaarheid: ref.apr,
    markt_mediaan,
    markt_p25,
    markt_p75: Number(ref.vvp_75) || 0,
    voorgestelde_inkoopprijs: input.proposed_purchase_price,
    verwachte_verkoopprijs,
    verwachte_marge,
    marge_percentage: marge_pct,
    voldoet_aan_b2c_norm: marge_pct >= 15,
    voldoet_aan_b2b_norm: verwachte_marge >= 2000,
    markt_doorlooptijd: ref.stock_days_average,
    price_sensitivity: ref.price_sensitivity,
    concurrenten: ref.competitive_set_size,
    vergelijkbare_autos: uniek.length,
    advies: marge_pct >= 15
      ? `Inkoop verantwoord. ETR ${ref.stat_turnover_ext}/5, verwachte marge ${marge_pct}%.`
      : `Risico. Verwachte marge ${marge_pct}% — onder 15% norm. Maximale inkoopprijs: €${Math.round(markt_mediaan * 0.82)}.`
  };
}

async function portfolio_pricing_scan(supabase: any) {
  const { data } = await supabase
    .from('jpcars_voorraad_monitor')
    .select('*')
    .order('stock_days', { ascending: false });

  const uniek = dedup(data || []);

  return {
    totaal_gescand: uniek.length,
    urgente_afprijzing: uniek
      .filter(a => a.stat_turnover_ext <= 2 && a.apr >= 3 && a.stock_days > 45 && Number(a.price_local) > Number(a.vvp_50))
      .map(a => ({
        auto: `${a.make} ${a.model} ${a.build}`,
        kenteken: a.license_plate,
        huidige_prijs: a.price_local,
        markt_mediaan: a.vvp_50,
        boven_mediaan: Math.round(Number(a.price_local) - Number(a.vvp_50)),
        stock_dagen: a.stock_days,
        etr: a.stat_turnover_ext,
        aanbevolen_prijs: Math.round(Number(a.vvp_50) * 0.97),
        prijsgevoeligheid: a.price_sensitivity
      })),
    marge_kansen: uniek
      .filter(a => a.stat_turnover_ext >= 4 && a.apr >= 3 && Number(a.price_local) < Number(a.vvp_50))
      .map(a => ({
        auto: `${a.make} ${a.model} ${a.build}`,
        kenteken: a.license_plate,
        huidige_prijs: a.price_local,
        markt_mediaan: a.vvp_50,
        ruimte_omhoog: Math.round(Number(a.vvp_50) - Number(a.price_local)),
        etr: a.stat_turnover_ext,
        stock_dagen: a.stock_days
      })),
    trage_voorraad: uniek
      .filter(a => a.stock_days > (a.stock_days_average || 0) && (a.stock_days_average || 0) > 0)
      .slice(0, 10)
      .map(a => ({
        auto: `${a.make} ${a.model} ${a.build}`,
        kenteken: a.license_plate,
        stock_dagen: a.stock_days,
        markt_gem: a.stock_days_average,
        vertraging: a.stock_days - a.stock_days_average,
        etr: a.stat_turnover_ext
      }))
  };
}

async function analyze_price_history(supabase: any) {
  const { data } = await supabase
    .from('jpcars_voorraad_monitor')
    .select('license_plate, make, model, fuel, stock_days, price_local, vvp_50, price_history_amount_1, price_history_date_1, price_history_amount_2, price_history_date_2, stat_turnover_ext, apr')
    .not('price_history_date_1', 'is', null);

  const uniek = dedup(data || []);
  const metAfprijzing = uniek.filter(a => Number(a.price_history_amount_1) > 0);

  if (metAfprijzing.length === 0) return { totaal_afgeprezen: 0, auto_lijst: [] };

  return {
    totaal_afgeprezen: metAfprijzing.length,
    gem_afprijsbedrag: Math.round(metAfprijzing.reduce((s, a) => s + Number(a.price_history_amount_1 || 0), 0) / metAfprijzing.length),
    auto_lijst: metAfprijzing.map(a => ({
      auto: `${a.make} ${a.model}`,
      etr: a.stat_turnover_ext,
      stock_dagen_nu: a.stock_days,
      verlaging_bedrag: a.price_history_amount_1,
      verlaging_datum: a.price_history_date_1,
      tweede_verlaging: a.price_history_amount_2 || null,
      huidige_prijs: a.price_local,
      markt_mediaan: a.vvp_50
    })).sort((a, b) => b.stock_dagen_nu - a.stock_dagen_nu)
  };
}

async function get_market_snapshot(supabase: any) {
  const { data } = await supabase
    .from('jpcars_voorraad_monitor')
    .select('*');

  const uniek = dedup(data || []);
  const gesorteerd = [...uniek].sort((a, b) => (b.stock_days || 0) - (a.stock_days || 0));

  return {
    sync_tijdstip: data?.[0]?.synced_at,
    totaal_voorraad: uniek.length,
    segmenten: ['ELECTRICITY', 'HYBRID', 'PETROL', 'DIESEL'].map(fuel => {
      const s = uniek.filter(a => a.fuel === fuel);
      if (s.length === 0) return null;
      return {
        brandstof: fuel,
        aantal: s.length,
        gem_etr: +(s.reduce((a, v) => a + (v.stat_turnover_ext || 0), 0) / s.length).toFixed(1),
        hoog_courant: s.filter(a => a.stat_turnover_ext >= 4 && a.apr >= 3).length,
        laag_courant: s.filter(a => a.stat_turnover_ext <= 2 && a.apr >= 3).length,
        gem_stock_dagen: Math.round(s.reduce((a, v) => a + (v.stock_days || 0), 0) / s.length),
        markt_verkopen: s.reduce((a, v) => a + (v.stat_sold_count || 0), 0),
        onze_gem_prijs: Math.round(s.reduce((a, v) => a + Number(v.price_local || 0), 0) / s.length),
        markt_mediaan: Math.round(s.reduce((a, v) => a + Number(v.vvp_50 || 0), 0) / s.length),
      };
    }).filter(Boolean),
    urgent_afprijzen: gesorteerd
      .filter(a => a.stat_turnover_ext <= 2 && Number(a.price_local) > Number(a.vvp_50) && a.apr >= 3)
      .slice(0, 5)
      .map(a => ({ auto: `${a.make} ${a.model}`, stock_dagen: a.stock_days, boven_mediaan: Math.round(Number(a.price_local) - Number(a.vvp_50)) })),
    marge_kansen: gesorteerd
      .filter(a => a.stat_turnover_ext >= 4 && Number(a.price_local) < Number(a.vvp_50) && a.apr >= 3)
      .slice(0, 5)
      .map(a => ({ auto: `${a.make} ${a.model}`, ruimte: Math.round(Number(a.vvp_50) - Number(a.price_local)) })),
    langst_staand: gesorteerd.slice(0, 5).map(a => ({
      auto: `${a.make} ${a.model} ${a.build}`,
      stock_dagen: a.stock_days,
      etr: a.stat_turnover_ext,
      kenteken: a.license_plate
    }))
  };
}

// ═══════════════════════════════════════
// TOOL DEFINITIONS FOR CLAUDE
// ═══════════════════════════════════════

const jpCarsToolDefinitions = [
  {
    name: 'analyze_market_composition',
    description: 'Analyseer de marktsamenstelling van onze voorraad per segment (brandstof, merk, of carrosserie). Toont ETR, marktaanbod, verkopen en prijzen per groep.',
    input_schema: {
      type: 'object',
      properties: {
        group_by: { type: 'string', enum: ['fuel', 'make', 'body'], description: 'Groepeer op brandstof, merk of carrosserietype' }
      },
      required: ['group_by']
    }
  },
  {
    name: 'analyze_segment_performance',
    description: 'Diepteanalyse van een specifiek segment. Filter op brandstof, merk en/of maximale prijs. Toont ETR, courantheid, stock dagen en individuele auto lijst.',
    input_schema: {
      type: 'object',
      properties: {
        fuel: { type: 'string', description: 'Brandstoftype, bijv. ELECTRICITY, HYBRID, PETROL, DIESEL' },
        make: { type: 'string', description: 'Merk, bijv. BMW, TESLA, VOLKSWAGEN' },
        max_price: { type: 'number', description: 'Maximale prijs filter' }
      }
    }
  },
  {
    name: 'evaluate_purchase_risk',
    description: 'Beoordeel het inkooprisico van een specifiek model bij een voorgestelde inkoopprijs. Vergelijkt met marktprijzen, berekent verwachte marge en geeft inkoop-advies.',
    input_schema: {
      type: 'object',
      properties: {
        make: { type: 'string', description: 'Merk van de auto' },
        model: { type: 'string', description: 'Model van de auto' },
        proposed_purchase_price: { type: 'number', description: 'Voorgestelde inkoopprijs in euro' }
      },
      required: ['make', 'model', 'proposed_purchase_price']
    }
  },
  {
    name: 'portfolio_pricing_scan',
    description: 'Volledige voorraadscan: urgente afprijzingen (laag courant + boven mediaan), marge kansen (hoog courant + onder mediaan), en traagste voorraad.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'analyze_price_history',
    description: 'Analyse van ons afprijsgedrag: welke auto\'s zijn afgeprezen, hoeveel, wanneer, en wat is de huidige positie t.o.v. de markt.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'get_market_snapshot',
    description: 'Volledig real-time marktoverzicht: voorraad per brandstof-segment met ETR, urgente afprijzingen, marge kansen en langst staande auto\'s.',
    input_schema: { type: 'object', properties: {} }
  }
];

// Tool executor
async function executeJpCarsTool(supabase: any, toolName: string, toolInput: any): Promise<any> {
  switch (toolName) {
    case 'analyze_market_composition': return analyze_market_composition(supabase, toolInput);
    case 'analyze_segment_performance': return analyze_segment_performance(supabase, toolInput);
    case 'evaluate_purchase_risk': return evaluate_purchase_risk(supabase, toolInput);
    case 'portfolio_pricing_scan': return portfolio_pricing_scan(supabase);
    case 'analyze_price_history': return analyze_price_history(supabase);
    case 'get_market_snapshot': return get_market_snapshot(supabase);
    default: return { error: `Unknown tool: ${toolName}` };
  }
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, agentId, sessionId } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ success: false, error: 'No message provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧠 Alex CEO Chat — loading memory and context...');

    // ── Step 1: Load Alex's memory ──
    const [memoryResult, decisionsResult, conversationResult, systemPromptResult] = await Promise.all([
      supabase
        .from('alex_market_memory')
        .select('categorie, onderwerp, inzicht, impact_op_strategie, vertrouwen, beoordeeld_op')
        .eq('geldigheid', 'actueel')
        .order('updated_at', { ascending: false })
        .limit(25),
      supabase
        .from('alex_decisions')
        .select('beslissing, context, adressaat, urgentie, datum')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('alex_conversation_memory')
        .select('samenvatting, beslissingen, openstaande_vragen, context_voor_volgende')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('ai_agents')
        .select('system_prompt')
        .eq('id', ALEX_AGENT_ID)
        .single()
    ]);

    const memory = memoryResult.data || [];
    const openDecisions = decisionsResult.data || [];
    const lastConversation = conversationResult.data?.[0] || null;
    const systemPrompt = systemPromptResult.data?.system_prompt || 'Je bent Alex, CEO AI van Auto City.';

    console.log(`📊 Memory: ${memory.length} items, ${openDecisions.length} open decisions`);

    // ── Step 2: Live business KPIs ──
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('status, selling_price, purchase_price, sold_date, online_since_date, details')
      .in('status', ['voorraad', 'verkocht_b2c', 'verkocht_b2b', 'afgeleverd']);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = monthStart;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 86400000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString();

    let verkopen_mtd = 0, verkopen_vorige_maand = 0;
    let b2c_marges: number[] = [], b2b_marges: number[] = [];
    let omloop_dagen: number[] = [];
    let voorraad_stuks = 0, voorraad_waarde = 0;
    let klanten_wacht_21_plus = 0, auto_ouder_90_dagen = 0;

    for (const v of (vehicles || [])) {
      const details = v.details as any;
      const isTradeIn = details?.isTradeIn === true || details?.isTradeIn === 'true';
      const isSold = ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status);
      const isB2B = details?.warrantyPackage === 'geen_garantie_b2b';
      
      if (isSold && v.sold_date && v.sold_date >= monthStart) {
        verkopen_mtd++;
        if (!isTradeIn && v.selling_price && v.purchase_price && v.purchase_price > 0) {
          if (isB2B) b2b_marges.push(v.selling_price - v.purchase_price);
          else b2c_marges.push(((v.selling_price - v.purchase_price) / v.purchase_price) * 100);
        }
      }
      if (isSold && v.sold_date && v.sold_date >= prevMonthStart && v.sold_date < prevMonthEnd) verkopen_vorige_maand++;
      if (isSold && v.sold_date && v.sold_date >= thirtyDaysAgo && v.online_since_date) {
        const days = (new Date(v.sold_date).getTime() - new Date(v.online_since_date).getTime()) / 86400000;
        if (days > 0) omloop_dagen.push(days);
      }
      if (v.status === 'voorraad' && !isTradeIn) {
        voorraad_stuks++;
        voorraad_waarde += (v.purchase_price || 0);
      }
      if (v.status === 'verkocht_b2c' && v.sold_date && v.sold_date < twentyOneDaysAgo) klanten_wacht_21_plus++;
      if (v.status === 'voorraad' && v.online_since_date && v.online_since_date < ninetyDaysAgo) auto_ouder_90_dagen++;
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    
    const kpis = {
      verkopen_mtd, verkopen_vorige_maand,
      b2c_marge_pct: avg(b2c_marges), b2b_marge_euro: avg(b2b_marges),
      omloopsnelheid: avg(omloop_dagen), voorraad_stuks, voorraad_waarde,
      klanten_wacht_21_plus, auto_ouder_90_dagen,
    };

    // ── Step 2b: Historical monthly sales ──
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const maandelijks: Record<string, { b2c: number; b2b: number; inruil: number; omzet: number; winst: number; garantie: number }> = {};

    for (const v of (vehicles || [])) {
      const isSold = ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status);
      if (!isSold || !v.sold_date || v.sold_date < yearStart) continue;
      const details = v.details as any;
      const maand = v.sold_date.substring(0, 7);
      if (!maandelijks[maand]) maandelijks[maand] = { b2c: 0, b2b: 0, inruil: 0, omzet: 0, winst: 0, garantie: 0 };
      const m = maandelijks[maand];
      const isB2B = details?.warrantyPackage === 'geen_garantie_b2b';
      const isTradeIn = details?.isTradeIn === true || details?.isTradeIn === 'true';
      if (isB2B) m.b2b++; else m.b2c++;
      if (isTradeIn) m.inruil++;
      m.omzet += (v.selling_price || 0);
      m.winst += ((v.selling_price || 0) - (v.purchase_price || 0));
      const garantiePrijs = parseFloat(details?.warrantyPackagePrice || '0');
      if (garantiePrijs > 0) m.garantie += garantiePrijs;
    }

    const historische_verkopen = Object.entries(maandelijks)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([maand, data]) => ({ maand, ...data, omzet: Math.round(data.omzet), winst: Math.round(data.winst), garantie: Math.round(data.garantie) }));

    console.log('📈 KPIs calculated:', kpis);

    // ── Step 3: Claude call with tool-use loop ──
    const userContent = `MIJN GEHEUGEN (marktkennis):
${JSON.stringify(memory, null, 1)}

OPENSTAANDE BESLISSINGEN:
${JSON.stringify(openDecisions, null, 1)}

LAATSTE GESPREK MET HENDRIK:
${JSON.stringify(lastConversation)}

LIVE BEDRIJFSDATA (huidige maand):
${JSON.stringify(kpis, null, 1)}

HISTORISCHE VERKOPEN PER MAAND (${now.getFullYear()}):
${JSON.stringify(historische_verkopen, null, 1)}

VRAAG VAN HENDRIK:
${message}`;

    console.log('🤖 Calling Claude with JP Cars tools + web search...');

    const allTools = [
      { type: 'web_search_20250305', name: 'web_search' },
      ...jpCarsToolDefinitions
    ];

    let messages: any[] = [{ role: 'user', content: userContent }];
    let alexResponse = '';

    // Tool-use loop (max 5 iterations)
    for (let round = 0; round < 5; round++) {
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          tools: allTools,
          system: systemPrompt,
          messages,
        }),
      });

      if (!claudeResponse.ok) {
        const errText = await claudeResponse.text();
        console.error('❌ Claude API error:', claudeResponse.status, errText);
        throw new Error(`Claude API error: ${claudeResponse.status}`);
      }

      const claudeData = await claudeResponse.json();

      // Extract text blocks
      for (const block of claudeData.content || []) {
        if (block.type === 'text') alexResponse += block.text;
      }

      // If stop reason is end_turn, we're done
      if (claudeData.stop_reason === 'end_turn') {
        console.log(`✅ Claude responded (round ${round + 1}), no more tools`);
        break;
      }

      // Process tool calls
      const toolUses = (claudeData.content || []).filter((b: any) => b.type === 'tool_use');
      if (toolUses.length === 0) break;

      // Add assistant message
      messages.push({ role: 'assistant', content: claudeData.content });

      // Execute tools and build results
      const toolResults: any[] = [];
      for (const toolUse of toolUses) {
        if (toolUse.name === 'web_search') {
          // Web search is handled by Claude internally, just acknowledge
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: 'Search completed' });
        } else {
          console.log(`🔧 Executing tool: ${toolUse.name}`, JSON.stringify(toolUse.input));
          try {
            const result = await executeJpCarsTool(supabase, toolUse.name, toolUse.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result)
            });
            console.log(`✅ Tool ${toolUse.name} completed`);
          } catch (toolErr) {
            console.error(`❌ Tool ${toolUse.name} error:`, toolErr);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: `Tool error: ${toolErr.message}` }),
              is_error: true
            });
          }
        }
      }

      messages.push({ role: 'user', content: toolResults });
      console.log(`🔄 Round ${round + 1} complete, ${toolUses.length} tools executed`);
    }

    if (!alexResponse) {
      alexResponse = 'Ik kon geen antwoord genereren. Probeer het opnieuw.';
    }

    console.log('✅ Alex response generated, length:', alexResponse.length);

    // ── Step 4: Learn from conversation (non-blocking) ──
    (async () => {
      try {
        console.log('🧠 Extracting learnings from conversation...');
        
        const memoryExtract = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            tools: [{
              name: 'save_learnings',
              description: 'Sla op wat Alex heeft geleerd uit dit gesprek. Wees spaarzaam — alleen bij correcties, werkwijze, voorkeuren of uitzonderingen.',
              input_schema: {
                type: 'object',
                properties: {
                  new_insights: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        categorie: { type: 'string' },
                        onderwerp: { type: 'string' },
                        inzicht: { type: 'string' },
                        impact_op_strategie: { type: 'string' },
                        geldig_tot: { type: 'string' },
                      },
                      required: ['categorie', 'onderwerp', 'inzicht']
                    }
                  },
                  new_decisions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        beslissing: { type: 'string' },
                        adressaat: { type: 'string' },
                        urgentie: { type: 'string', enum: ['hoog', 'middel', 'laag'] },
                        context: { type: 'string' },
                      },
                      required: ['beslissing']
                    }
                  },
                  conversation_summary: {
                    type: 'object',
                    properties: {
                      samenvatting: { type: 'string' },
                      beslissingen: { type: 'array', items: { type: 'string' } },
                      openstaande_vragen: { type: 'array', items: { type: 'string' } },
                      context_voor_volgende: { type: 'string' },
                    },
                    required: ['samenvatting']
                  }
                },
                required: ['new_insights', 'new_decisions', 'conversation_summary']
              }
            }],
            tool_choice: { type: 'tool', name: 'save_learnings' },
            system: 'Je bent Alex. Analyseer dit gesprek en extract wat je hebt geleerd. Wees SPAARZAAM — alleen opslaan bij: correcties, werkwijze-uitleg, voorkeuren, uitzonderingen. Bij standaard data-vragen: lege arrays.',
            messages: [{
              role: 'user',
              content: `Vraag van Hendrik: ${message}\n\nMijn antwoord: ${alexResponse.substring(0, 2000)}`
            }],
          }),
        });

        if (memoryExtract.ok) {
          const extractData = await memoryExtract.json();
          const toolUse = extractData.content?.find((b: any) => b.type === 'tool_use');
          
          if (toolUse?.input) {
            const learnings = toolUse.input;
            
            if (learnings.new_insights?.length > 0) {
              for (const insight of learnings.new_insights) {
                await supabase.from('alex_market_memory').insert({
                  categorie: insight.categorie || 'algemeen',
                  onderwerp: insight.onderwerp,
                  inzicht: insight.inzicht,
                  impact_op_strategie: insight.impact_op_strategie || null,
                  geldig_tot: insight.geldig_tot || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                  geldigheid: 'actueel',
                  vertrouwen: 0.7,
                  bron: 'gesprek_hendrik',
                });
              }
              console.log(`💾 Saved ${learnings.new_insights.length} new insights`);
            }

            if (learnings.new_decisions?.length > 0) {
              for (const decision of learnings.new_decisions) {
                await supabase.from('alex_decisions').insert({
                  beslissing: decision.beslissing,
                  adressaat: decision.adressaat || 'Hendrik',
                  urgentie: decision.urgentie || 'middel',
                  context: decision.context || message.substring(0, 200),
                  status: 'open',
                  datum: new Date().toISOString().split('T')[0],
                });
              }
              console.log(`💾 Saved ${learnings.new_decisions.length} new decisions`);
            }

            if (learnings.conversation_summary?.samenvatting) {
              await supabase.from('alex_conversation_memory').insert({
                samenvatting: learnings.conversation_summary.samenvatting,
                beslissingen: learnings.conversation_summary.beslissingen || [],
                openstaande_vragen: learnings.conversation_summary.openstaande_vragen || [],
                context_voor_volgende: learnings.conversation_summary.context_voor_volgende || '',
                datum: new Date().toISOString().split('T')[0],
              });
              console.log('💾 Saved conversation summary');
            }
          }
        }
      } catch (memErr) {
        console.error('⚠️ Memory extraction error (non-blocking):', memErr);
      }
    })().catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      message: alexResponse,
      context_used: {
        memory_items: memory.length,
        open_decisions: openDecisions.length,
        has_last_conversation: !!lastConversation,
        kpis_loaded: true,
        jp_cars_tools_available: true,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Alex CEO Chat error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error',
      message: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
