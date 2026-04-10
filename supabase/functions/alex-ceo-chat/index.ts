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
    const { data: kpiData } = await supabase.rpc('', {}).catch(() => ({ data: null }));
    
    // Use direct queries instead of RPC
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
          if (isB2B) {
            b2b_marges.push(v.selling_price - v.purchase_price);
          } else {
            b2c_marges.push(((v.selling_price - v.purchase_price) / v.purchase_price) * 100);
          }
        }
      }
      if (isSold && v.sold_date && v.sold_date >= prevMonthStart && v.sold_date < prevMonthEnd) {
        verkopen_vorige_maand++;
      }
      if (isSold && v.sold_date && v.sold_date >= thirtyDaysAgo && v.online_since_date) {
        const days = (new Date(v.sold_date).getTime() - new Date(v.online_since_date).getTime()) / 86400000;
        if (days > 0) omloop_dagen.push(days);
      }
      if (v.status === 'voorraad' && !isTradeIn) {
        voorraad_stuks++;
        voorraad_waarde += (v.purchase_price || 0);
      }
      if (v.status === 'verkocht_b2c' && v.sold_date && v.sold_date < twentyOneDaysAgo) {
        klanten_wacht_21_plus++;
      }
      if (v.status === 'voorraad' && v.online_since_date && v.online_since_date < ninetyDaysAgo) {
        auto_ouder_90_dagen++;
      }
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    
    const kpis = {
      verkopen_mtd,
      verkopen_vorige_maand,
      b2c_marge_pct: avg(b2c_marges),
      b2b_marge_euro: avg(b2b_marges),
      omloopsnelheid: avg(omloop_dagen),
      voorraad_stuks,
      voorraad_waarde,
      klanten_wacht_21_plus,
      auto_ouder_90_dagen,
    };

    console.log('📈 KPIs calculated:', kpis);

    // ── Step 3: Send to Claude with web search ──
    const userContent = `MIJN GEHEUGEN (marktkennis):
${JSON.stringify(memory, null, 1)}

OPENSTAANDE BESLISSINGEN:
${JSON.stringify(openDecisions, null, 1)}

LAATSTE GESPREK MET HENDRIK:
${JSON.stringify(lastConversation)}

LIVE BEDRIJFSDATA:
${JSON.stringify(kpis, null, 1)}

VRAAG VAN HENDRIK:
${message}`;

    console.log('🤖 Calling Claude with web search...');

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
        tools: [
          { type: 'web_search_20250305', name: 'web_search' }
        ],
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('❌ Claude API error:', claudeResponse.status, errText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    
    // Extract text from response (may have multiple content blocks due to web search)
    let alexResponse = '';
    for (const block of claudeData.content || []) {
      if (block.type === 'text') {
        alexResponse += block.text;
      }
    }

    if (!alexResponse) {
      alexResponse = 'Ik kon geen antwoord genereren. Probeer het opnieuw.';
    }

    console.log('✅ Alex response generated, length:', alexResponse.length);

    // ── Step 4: Learn from conversation ──
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
            description: 'Sla op wat Alex heeft geleerd uit dit gesprek.',
            input_schema: {
              type: 'object',
              properties: {
                new_insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      categorie: { type: 'string', description: 'bijv: wetgeving, marktprijs, macro, concurrent, strategie' },
                      onderwerp: { type: 'string' },
                      inzicht: { type: 'string' },
                      impact_op_strategie: { type: 'string' },
                      geldig_tot: { type: 'string', description: 'ISO date' },
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
          system: 'Je bent Alex. Analyseer dit gesprek en extract wat je hebt geleerd. Alleen wat echt nieuw of besloten is. Geef lege arrays als er niets nieuws is.',
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
          
          // Save new insights to alex_market_memory
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

          // Save new decisions
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

          // Save conversation summary
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

    return new Response(JSON.stringify({
      success: true,
      message: alexResponse,
      context_used: {
        memory_items: memory.length,
        open_decisions: openDecisions.length,
        has_last_conversation: !!lastConversation,
        kpis_loaded: true,
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
