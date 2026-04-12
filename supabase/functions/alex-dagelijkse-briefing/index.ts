import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALEX_AGENT_ID = 'b6000000-0000-0000-0000-000000000006';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`📋 Alex dagelijkse briefing — ${today}`);

    // ── 1. Mark expired memory as 'verouderd' ──
    const { data: expired } = await supabase
      .from('alex_market_memory')
      .update({ geldigheid: 'verouderd' })
      .lt('geldig_tot', today)
      .eq('geldigheid', 'actueel')
      .select('id');
    
    console.log(`♻️ Marked ${expired?.length || 0} expired memory entries as verouderd`);

    // ── 2. Load current memory ──
    const [memoryResult, decisionsResult, conversationResult, systemPromptResult] = await Promise.all([
      supabase
        .from('alex_market_memory')
        .select('categorie, onderwerp, inzicht, impact_op_strategie, vertrouwen, beoordeeld_op')
        .eq('geldigheid', 'actueel')
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('alex_decisions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('alex_conversation_memory')
        .select('samenvatting, beslissingen, openstaande_vragen')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('ai_agents')
        .select('system_prompt')
        .eq('id', ALEX_AGENT_ID)
        .single(),
    ]);

    // ── 3. Live KPIs ──
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('status, selling_price, purchase_price, sold_date, online_since_date, details, import_status');

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
    let import_vastgelopen = 0;

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
      if (['voorraad', 'onderweg'].includes(v.status) && v.import_status && !['ingeschreven', 'niet_gestart'].includes(v.import_status)) {
        import_vastgelopen++;
      }
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const kpis = {
      verkopen_mtd, verkopen_vorige_maand,
      b2c_marge_pct: avg(b2c_marges), b2b_marge_euro: avg(b2b_marges),
      omloopsnelheid: avg(omloop_dagen), voorraad_stuks, voorraad_waarde,
      klanten_wacht_21_plus, auto_ouder_90_dagen, import_vastgelopen,
    };

    // ── 3b. Historical monthly sales (full year) ──
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const maandelijks: Record<string, { b2c: number; b2b: number; inruil: number; omzet: number; winst: number; garantie: number }> = {};

    for (const v of (vehicles || [])) {
      const isSold = ['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status);
      if (!isSold || !v.sold_date || v.sold_date < yearStart) continue;
      
      const det = v.details as any;
      const maand = v.sold_date.substring(0, 7);
      if (!maandelijks[maand]) maandelijks[maand] = { b2c: 0, b2b: 0, inruil: 0, omzet: 0, winst: 0, garantie: 0 };
      const m = maandelijks[maand];
      
      const isB2B = det?.warrantyPackage === 'geen_garantie_b2b';
      const isTradeIn = det?.isTradeIn === true || det?.isTradeIn === 'true';
      
      if (isB2B) m.b2b++; else m.b2c++;
      if (isTradeIn) m.inruil++;
      m.omzet += (v.selling_price || 0);
      m.winst += ((v.selling_price || 0) - (v.purchase_price || 0));
      const gp = parseFloat(det?.warrantyPackagePrice || '0');
      if (gp > 0) m.garantie += gp;
    }

    const historische_verkopen = Object.entries(maandelijks)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([maand, data]) => ({ maand, ...data, omzet: Math.round(data.omzet), winst: Math.round(data.winst), garantie: Math.round(data.garantie) }));

    // ── 4. Agent signals ──
    const [claimsResult, agentSignals] = await Promise.all([
      supabase.from('warranty_claims').select('id', { count: 'exact', head: true }).eq('claim_status', 'pending'),
      supabase.from('alex_insights').select('type, signaal, aanbeveling, prioriteit').eq('datum', today).order('created_at', { ascending: false }).limit(10),
    ]);

    const signals = {
      open_claims: claimsResult.count || 0,
      klanten_wacht_21_plus,
      import_vastgelopen,
      auto_ouder_90_dagen,
      recente_signalen: agentSignals.data || [],
    };

    // ── 5. Generate briefing with Claude + web search ──
    const systemPrompt = systemPromptResult.data?.system_prompt || 'Je bent Alex, CEO AI van Auto City.';
    
    const briefingPrompt = `Het is ${today}, werkdag briefing.

MIJN GEHEUGEN (actuele marktkennis):
${JSON.stringify(memoryResult.data || [], null, 1)}

OPENSTAANDE BESLISSINGEN:
${JSON.stringify(decisionsResult.data || [], null, 1)}

LAATSTE GESPREK MET HENDRIK:
${JSON.stringify(conversationResult.data?.[0] || null)}

LIVE BEDRIJFSDATA (huidige maand):
${JSON.stringify(kpis, null, 1)}

HISTORISCHE VERKOPEN PER MAAND (${now.getFullYear()}):
${JSON.stringify(historische_verkopen, null, 1)}

AGENT SIGNALEN:
${JSON.stringify(signals, null, 1)}

OPDRACHT:
1. Doe marktresearch voor vandaag — zoek naar relevante EV/hybride occasiemarkt ontwikkelingen in Nederland
2. Analyseer de interne KPIs — wat gaat goed, wat niet
3. Identificeer risico's en kansen
4. Geef inkoopadvies voor deze week
5. Geef aan welke van je geheugenentries je wilt heronderzoeken of bijwerken

Schrijf een briefing email voor Hendrik. Kort, zakelijk, cijfermatig. Geen emoji. Eindig met concrete actiepunten.`;

    console.log('🤖 Generating briefing with Claude + web search...');

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [
          { type: 'web_search_20250305', name: 'web_search' },
          {
            name: 'save_briefing_data',
            description: 'Sla de briefing resultaten op: nieuwe marktinzichten en de briefing tekst.',
            input_schema: {
              type: 'object',
              properties: {
                briefing_html: { type: 'string', description: 'De volledige briefing email in HTML' },
                briefing_summary: { type: 'string', description: 'Korte samenvatting (1-2 zinnen)' },
                toon: { type: 'string', enum: ['positief', 'neutraal', 'waarschuwing', 'urgent'], description: 'Toon van de briefing' },
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
                daily_signals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['risico', 'kans', 'agent_melding', 'markt'] },
                      signaal: { type: 'string' },
                      aanbeveling: { type: 'string' },
                      prioriteit: { type: 'string', enum: ['hoog', 'middel', 'laag'] },
                    },
                    required: ['type', 'signaal']
                  }
                }
              },
              required: ['briefing_html', 'briefing_summary', 'toon', 'new_insights', 'daily_signals']
            }
          }
        ],
        tool_choice: { type: 'any' },
        system: systemPrompt,
        messages: [{ role: 'user', content: briefingPrompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('❌ Claude API error:', claudeResponse.status, errText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    
    // Handle tool calling loop — Claude may call web_search first, then save_briefing_data
    let briefingData: any = null;
    let fullText = '';
    let messages: any[] = [{ role: 'user', content: briefingPrompt }];
    let responseData = claudeData;
    
    for (let round = 0; round < 5; round++) {
      const toolUses = (responseData.content || []).filter((b: any) => b.type === 'tool_use');
      const textBlocks = (responseData.content || []).filter((b: any) => b.type === 'text');
      
      for (const tb of textBlocks) fullText += tb.text;
      
      const saveTool = toolUses.find((t: any) => t.name === 'save_briefing_data');
      if (saveTool) {
        briefingData = saveTool.input;
        break;
      }

      if (toolUses.length === 0) break;
      if (responseData.stop_reason === 'end_turn') break;

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: responseData.content });
      const toolResults = toolUses.map((t: any) => ({
        type: 'tool_result',
        tool_use_id: t.id,
        content: t.name === 'web_search' ? 'Search completed' : 'OK',
      }));
      messages.push({ role: 'user', content: toolResults });

      const nextResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          tools: [
            { type: 'web_search_20250305', name: 'web_search' },
            {
              name: 'save_briefing_data',
              description: 'Sla de briefing resultaten op.',
              input_schema: {
                type: 'object',
                properties: {
                  briefing_html: { type: 'string' },
                  briefing_summary: { type: 'string' },
                  toon: { type: 'string', enum: ['positief', 'neutraal', 'waarschuwing', 'urgent'] },
                  new_insights: { type: 'array', items: { type: 'object', properties: { categorie: { type: 'string' }, onderwerp: { type: 'string' }, inzicht: { type: 'string' }, impact_op_strategie: { type: 'string' }, geldig_tot: { type: 'string' } }, required: ['categorie', 'onderwerp', 'inzicht'] } },
                  daily_signals: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, signaal: { type: 'string' }, aanbeveling: { type: 'string' }, prioriteit: { type: 'string' } }, required: ['type', 'signaal'] } },
                },
                required: ['briefing_html', 'briefing_summary', 'toon', 'new_insights', 'daily_signals']
              }
            }
          ],
          system: systemPrompt,
          messages,
        }),
      });

      if (!nextResponse.ok) break;
      responseData = await nextResponse.json();
    }

    // ── 6. Save results ──
    if (briefingData) {
      // Save new insights
      if (briefingData.new_insights?.length > 0) {
        for (const insight of briefingData.new_insights) {
          await supabase.from('alex_market_memory').insert({
            categorie: insight.categorie || 'algemeen',
            onderwerp: insight.onderwerp,
            inzicht: insight.inzicht,
            impact_op_strategie: insight.impact_op_strategie || null,
            geldig_tot: insight.geldig_tot || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            geldigheid: 'actueel',
            vertrouwen: 0.8,
            bron: 'dagelijkse_briefing',
          });
        }
        console.log(`💾 Saved ${briefingData.new_insights.length} new insights from briefing`);
      }

      // Save daily signals
      if (briefingData.daily_signals?.length > 0) {
        for (const signal of briefingData.daily_signals) {
          await supabase.from('alex_insights').insert({
            type: signal.type || 'risico',
            signaal: signal.signaal,
            aanbeveling: signal.aanbeveling || null,
            prioriteit: signal.prioriteit || 'middel',
            datum: today,
            agent: 'Alex',
          });
        }
        console.log(`💾 Saved ${briefingData.daily_signals.length} daily signals`);
      }

      // Save briefing to ai_briefings
      await supabase.from('ai_briefings').insert({
        agent_id: ALEX_AGENT_ID,
        briefing_date: today,
        briefing_type: 'dagelijks',
        content: briefingData.briefing_html || fullText,
        summary: briefingData.briefing_summary || null,
        data_snapshot: { kpis, signals, memory_count: (memoryResult.data || []).length },
        alerts_included: briefingData.daily_signals?.filter((s: any) => s.prioriteit === 'hoog').length || 0,
      });

      // Send email via email_queue
      const toon = briefingData.toon || 'neutraal';
      await supabase.from('email_queue').insert({
        status: 'pending',
        payload: {
          senderEmail: 'alex@auto-city.nl',
          to: ['hendrik@auto-city.nl'],
          subject: `Alex | CEO Briefing ${today} — ${toon}`,
          htmlBody: briefingData.briefing_html || `<div>${fullText}</div>`,
        },
      });
      console.log('📧 Briefing email queued');

      // ── 7. Urgent alerts ──
      const urgentReasons: string[] = [];
      if (kpis.b2c_marge_pct > 0 && kpis.b2c_marge_pct < 13) urgentReasons.push(`B2C marge ${kpis.b2c_marge_pct}% — onder 13% drempel`);
      if (kpis.b2b_marge_euro > 0 && kpis.b2b_marge_euro < 2000) urgentReasons.push(`B2B marge €${kpis.b2b_marge_euro} — onder €2.000 drempel`);
      if (kpis.auto_ouder_90_dagen >= 15) urgentReasons.push(`${kpis.auto_ouder_90_dagen} auto's boven 90 dagen`);

      if (urgentReasons.length > 0) {
        await supabase.from('email_queue').insert({
          status: 'pending',
          payload: {
            senderEmail: 'alex@auto-city.nl',
            to: ['hendrik@auto-city.nl'],
            subject: `⚠️ URGENT — Alex Alert ${today}`,
            htmlBody: `<h2>Urgente Alerts</h2><ul>${urgentReasons.map(r => `<li>${r}</li>`).join('')}</ul><p>Bekijk de volledige briefing voor details.</p>`,
          },
        });
        console.log('🚨 Urgent alert email queued:', urgentReasons);
      }
    } else {
      // Fallback: save briefing from text
      await supabase.from('ai_briefings').insert({
        agent_id: ALEX_AGENT_ID,
        briefing_date: today,
        briefing_type: 'dagelijks',
        content: fullText || 'Briefing kon niet worden gegenereerd.',
        data_snapshot: { kpis, signals },
      });
    }

    console.log('✅ Alex dagelijkse briefing completed');

    return new Response(JSON.stringify({ success: true, date: today }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Alex briefing error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
