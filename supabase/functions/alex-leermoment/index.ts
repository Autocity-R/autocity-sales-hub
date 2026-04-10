import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    console.log(`🧠 Alex leermoment — evaluating decisions from past week`);

    // Get open decisions older than 7 days
    const { data: decisions } = await supabase
      .from('alex_decisions')
      .select('*')
      .eq('status', 'open')
      .lt('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    if (!decisions || decisions.length === 0) {
      console.log('✅ No decisions to evaluate');
      return new Response(JSON.stringify({ success: true, message: 'No decisions to evaluate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Evaluating ${decisions.length} decisions...`);

    // Get current business data for context
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('status, selling_price, purchase_price, sold_date, online_since_date, details')
      .in('status', ['voorraad', 'verkocht_b2c', 'verkocht_b2b', 'afgeleverd']);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let verkopen_mtd = 0, voorraad_stuks = 0;
    let b2c_marges: number[] = [];

    for (const v of (vehicles || [])) {
      const details = v.details as any;
      const isTradeIn = details?.isTradeIn === true || details?.isTradeIn === 'true';
      if (['verkocht_b2c', 'verkocht_b2b', 'afgeleverd'].includes(v.status) && v.sold_date && v.sold_date >= monthStart) {
        verkopen_mtd++;
        if (!isTradeIn && v.selling_price && v.purchase_price && v.purchase_price > 0) {
          b2c_marges.push(((v.selling_price - v.purchase_price) / v.purchase_price) * 100);
        }
      }
      if (v.status === 'voorraad' && !isTradeIn) voorraad_stuks++;
    }

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    // Ask Claude to evaluate each decision
    const evaluationResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{
          name: 'evaluate_decisions',
          description: 'Evalueer de beslissingen en geef per stuk terug wat de uitkomst was.',
          input_schema: {
            type: 'object',
            properties: {
              evaluations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    decision_id: { type: 'string' },
                    uitkomst: { type: 'string', description: 'Wat is er gebeurd sinds deze beslissing' },
                    correct: { type: 'boolean', description: 'Was dit de juiste beslissing?' },
                    lering: { type: 'string', description: 'Wat leren we hiervan voor de toekomst' },
                    status: { type: 'string', enum: ['afgehandeld', 'nog_lopend', 'niet_relevant'] },
                  },
                  required: ['decision_id', 'uitkomst', 'correct', 'lering', 'status']
                }
              }
            },
            required: ['evaluations']
          }
        }],
        tool_choice: { type: 'tool', name: 'evaluate_decisions' },
        system: 'Je bent Alex, CEO AI van Auto City. Evalueer je eigen beslissingen eerlijk. Wat ging goed? Wat niet? Wat leer je? Wees kritisch op jezelf.',
        messages: [{
          role: 'user',
          content: `Evalueer deze beslissingen van de afgelopen week. Huidige context: ${verkopen_mtd} verkopen MTD, ${voorraad_stuks} in voorraad, gem. B2C marge ${avg(b2c_marges)}%.

BESLISSINGEN OM TE EVALUEREN:
${JSON.stringify(decisions, null, 2)}`
        }],
      }),
    });

    if (!evaluationResponse.ok) {
      throw new Error(`Claude API error: ${evaluationResponse.status}`);
    }

    const evalData = await evaluationResponse.json();
    const toolUse = evalData.content?.find((b: any) => b.type === 'tool_use');

    if (toolUse?.input?.evaluations) {
      for (const evaluation of toolUse.input.evaluations) {
        // Update the decision
        const newStatus = evaluation.status === 'afgehandeld' ? 'afgehandeld' : 
                         evaluation.status === 'niet_relevant' ? 'niet_relevant' : 'open';
        
        await supabase
          .from('alex_decisions')
          .update({
            uitkomst: evaluation.uitkomst,
            correct: evaluation.correct,
            lering: evaluation.lering,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', evaluation.decision_id);

        // Save learning as new insight if there's a lesson
        if (evaluation.lering) {
          await supabase.from('alex_market_memory').insert({
            categorie: 'zelfreflectie',
            onderwerp: `Lering: ${evaluation.uitkomst?.substring(0, 50)}`,
            inzicht: evaluation.lering,
            impact_op_strategie: evaluation.correct ? 'Bevestiging van aanpak' : 'Aanpak bijstellen',
            geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            geldigheid: 'actueel',
            vertrouwen: 0.8,
            bron: 'zelfevaluatie',
          });
        }
      }

      console.log(`✅ Evaluated ${toolUse.input.evaluations.length} decisions`);
    }

    return new Response(JSON.stringify({
      success: true,
      evaluated: toolUse?.input?.evaluations?.length || 0,
      date: today,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Alex leermoment error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
