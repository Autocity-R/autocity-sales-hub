import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hendrik's agent ID for memory isolation
const HENDRIK_AGENT_ID = '43004cb6-26e9-4453-861d-75ff8dffb3fe';

// Alert thresholds
const THRESHOLDS = {
  IMPORT_STATUS_DAYS: 9,
  TRANSPORT_DAYS: 20,
  PAPERS_DAYS: 14,
  SLOW_MOVER_DAYS: 50,
  WORKSHOP_DAYS: 14,
};

interface BriefingRequest {
  briefingType: 'daily' | 'weekly' | 'monthly';
}

interface MemoryRecord {
  memory_type: string;
  entity_name: string;
  insight: string;
  confidence: number;
}

/**
 * Recall memories for Hendrik
 */
async function recallMemory(
  supabase: any,
  memoryType?: string,
  minConfidence: number = 0.5
): Promise<MemoryRecord[]> {
  try {
    let query = supabase
      .from('ai_memory')
      .select('memory_type, entity_name, insight, confidence, updated_at')
      .eq('agent_id', HENDRIK_AGENT_ID)
      .eq('is_active', true)
      .gte('confidence', minConfidence)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('confidence', { ascending: false })
      .order('updated_at', { ascending: false });

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }

    const { data, error } = await query.limit(30);

    if (error) {
      console.error('❌ Memory recall error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Memory recall exception:', error);
    return [];
  }
}

/**
 * Build memory context string
 */
function buildMemoryContext(memories: MemoryRecord[]): string {
  if (!memories || memories.length === 0) return '';

  const grouped: Record<string, MemoryRecord[]> = {};
  memories.forEach(m => {
    if (!grouped[m.memory_type]) grouped[m.memory_type] = [];
    grouped[m.memory_type].push(m);
  });

  const typeLabels: Record<string, string> = {
    'supplier': '🏭 Leveranciers',
    'model': '🚗 Modellen',
    'salesperson': '👥 Team',
    'market': '📈 Markt',
    'strategy': '🎯 Strategie'
  };

  let context = `\n## 🧠 JOUW BEDRIJFSKENNIS\n\n`;
  for (const [type, mems] of Object.entries(grouped)) {
    const label = typeLabels[type] || type;
    context += `### ${label}\n`;
    mems.forEach(m => {
      context += `• **${m.entity_name}**: ${m.insight}\n`;
    });
    context += '\n';
  }

  return context;
}

/**
 * Get comprehensive data for briefings
 */
async function getBriefingData(supabase: any, briefingType: string) {
  const alerts: any[] = [];
  
  // Get all vehicles
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('*');

  const vehicles = allVehicles || [];
  console.log(`📊 Loaded ${vehicles.length} vehicles`);

  // Calculate date ranges based on briefing type
  const now = new Date();
  let startDate: Date;
  
  if (briefingType === 'daily') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
  } else if (briefingType === 'weekly') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  }

  // B2B/B2C Sales in period
  const soldB2B = vehicles.filter((v: any) => 
    v.status === 'verkocht_b2b' && 
    v.sold_date && 
    new Date(v.sold_date) >= startDate
  );

  const soldB2C = vehicles.filter((v: any) => 
    v.status === 'verkocht_b2c' && 
    v.sold_date && 
    new Date(v.sold_date) >= startDate
  );

  // Calculate metrics
  const calculateMetrics = (soldVehicles: any[]) => {
    const totalRevenue = soldVehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0);
    const purchasePrices = soldVehicles.map(v => {
      const details = v.details as any;
      return v.purchase_price || parseFloat(details?.purchasePrice) || 0;
    });
    const totalCost = purchasePrices.reduce((sum, p) => sum + p, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = soldVehicles.length > 0 ? totalProfit / soldVehicles.length : 0;

    return {
      count: soldVehicles.length,
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit,
      avgMargin
    };
  };

  const b2bMetrics = calculateMetrics(soldB2B);
  const b2cMetrics = calculateMetrics(soldB2C);

  // Stock metrics
  const stockVehicles = vehicles.filter((v: any) => v.status === 'voorraad');
  const avgDaysOnStock = stockVehicles.length > 0 
    ? stockVehicles.reduce((sum: number, v: any) => {
        const days = Math.floor((now.getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / stockVehicles.length
    : 0;

  // Critical alerts
  // Import status alerts
  const thresholdImport = new Date();
  thresholdImport.setDate(thresholdImport.getDate() - THRESHOLDS.IMPORT_STATUS_DAYS);
  const importAlerts = vehicles.filter((v: any) => 
    ['aangemeld', 'goedgekeurd', 'bpm_betaald'].includes(v.import_status) &&
    v.import_updated_at && new Date(v.import_updated_at) < thresholdImport
  );
  if (importAlerts.length > 0) {
    alerts.push({
      type: 'import_status',
      severity: 'critical',
      count: importAlerts.length,
      message: `${importAlerts.length} voertuig(en) staan >9 dagen in dezelfde import status`
    });
  }

  // Transport alerts
  const thresholdTransport = new Date();
  thresholdTransport.setDate(thresholdTransport.getDate() - THRESHOLDS.TRANSPORT_DAYS);
  const transportAlerts = vehicles.filter((v: any) => {
    const details = v.details as any;
    return details?.transportStatus === 'onderweg' && 
           v.purchase_date && new Date(v.purchase_date) < thresholdTransport;
  });
  if (transportAlerts.length > 0) {
    alerts.push({
      type: 'transport',
      severity: 'critical',
      count: transportAlerts.length,
      message: `${transportAlerts.length} voertuig(en) zijn >20 dagen onderweg`
    });
  }

  // Slow movers
  const thresholdSlow = new Date();
  thresholdSlow.setDate(thresholdSlow.getDate() - THRESHOLDS.SLOW_MOVER_DAYS);
  const slowMovers = vehicles.filter((v: any) => 
    v.status === 'voorraad' && new Date(v.created_at) < thresholdSlow
  );
  if (slowMovers.length > 0) {
    alerts.push({
      type: 'slow_mover',
      severity: 'warning',
      count: slowMovers.length,
      message: `${slowMovers.length} voertuig(en) staan >50 dagen op voorraad`
    });
  }

  // Not online alerts
  const notOnline = vehicles.filter((v: any) => {
    const details = v.details as any;
    return v.status === 'voorraad' && 
           details?.transportStatus === 'aangekomen' && 
           details?.showroomOnline !== true;
  });
  if (notOnline.length > 0) {
    alerts.push({
      type: 'not_online',
      severity: 'warning',
      count: notOnline.length,
      message: `${notOnline.length} voertuig(en) binnen maar NIET online`
    });
  }

  // Top suppliers (for weekly/monthly)
  const { data: suppliers } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company_name')
    .eq('type', 'supplier');

  const supplierStats: Record<string, any> = {};
  const soldVehicles = [...soldB2B, ...soldB2C];
  
  soldVehicles.forEach((v: any) => {
    if (v.supplier_id) {
      if (!supplierStats[v.supplier_id]) {
        const supplier = suppliers?.find((s: any) => s.id === v.supplier_id);
        supplierStats[v.supplier_id] = {
          name: supplier ? `${supplier.first_name} ${supplier.last_name}` : 'Onbekend',
          company: supplier?.company_name,
          count: 0,
          totalMargin: 0
        };
      }
      supplierStats[v.supplier_id].count++;
      const details = v.details as any;
      const purchasePrice = v.purchase_price || parseFloat(details?.purchasePrice) || 0;
      supplierStats[v.supplier_id].totalMargin += (v.selling_price || 0) - purchasePrice;
    }
  });

  const topSuppliers = Object.values(supplierStats)
    .map((s: any) => ({
      ...s,
      avgMargin: s.count > 0 ? s.totalMargin / s.count : 0
    }))
    .sort((a: any, b: any) => b.avgMargin - a.avgMargin)
    .slice(0, 5);

  return {
    period: briefingType,
    periodStart: startDate.toISOString(),
    periodEnd: now.toISOString(),
    b2b: b2bMetrics,
    b2c: b2cMetrics,
    total: {
      count: b2bMetrics.count + b2cMetrics.count,
      revenue: b2bMetrics.revenue + b2cMetrics.revenue,
      profit: b2bMetrics.profit + b2cMetrics.profit
    },
    stock: {
      count: stockVehicles.length,
      avgDaysOnStock: Math.round(avgDaysOnStock)
    },
    alerts,
    topSuppliers
  };
}

/**
 * Generate briefing content using AI
 */
async function generateBriefingContent(
  data: any, 
  memories: MemoryRecord[],
  briefingType: string
): Promise<{ content: string; summary: string }> {
  
  const memoryContext = buildMemoryContext(memories);
  const typeLabels: Record<string, string> = {
    daily: 'DAGELIJKSE BRIEFING',
    weekly: 'WEKELIJKSE STRATEGY SESSION',
    monthly: 'MAANDELIJKSE DEEP DIVE'
  };

  const systemPrompt = `Je bent Hendrik, de AI CEO Assistant van een autohandel. 
Je genereert een ${typeLabels[briefingType]} briefing in het Nederlands.

SCHRIJFSTIJL:
- Gebruik emojis voor sectiekoppen
- Wees concreet met cijfers en percentages
- Geef actionable aanbevelingen
- Houd secties kort maar informatief

STRUCTUUR VOOR ${briefingType.toUpperCase()} BRIEFING:
${briefingType === 'daily' ? `
📊 GISTEREN'S PERFORMANCE
🚨 KRITIEKE ALERTS  
🟢 KANSEN
💡 AANBEVELINGEN
✅ ACTIES VOOR VANDAAG
` : briefingType === 'weekly' ? `
📊 WEKELIJKSE PERFORMANCE
🏆 TOP PERFORMERS
⚠️ AANDACHTSPUNTEN
📈 TRENDS
💡 STRATEGISCHE AANBEVELINGEN
✅ ACTIES VOOR VOLGENDE WEEK
` : `
📊 MAANDELIJKSE PERFORMANCE
🚀 GROEI TRACKING
🏆 TOP PERFORMERS
⚠️ BOTTOM PERFORMERS
📈 TRENDS & PATRONEN
💡 STRATEGISCHE INSIGHTS
🎯 STRATEGISCHE AANBEVELINGEN
✅ ACTIES VOOR VOLGENDE MAAND
`}

${memoryContext}`;

  const userPrompt = `Genereer een ${typeLabels[briefingType]} briefing met deze data:

PERIODE: ${new Date(data.periodStart).toLocaleDateString('nl-NL')} - ${new Date(data.periodEnd).toLocaleDateString('nl-NL')}

VERKOPEN:
- B2B: ${data.b2b.count} auto's, €${data.b2b.revenue.toLocaleString()} omzet, €${data.b2b.profit.toLocaleString()} winst
- B2C: ${data.b2c.count} auto's, €${data.b2c.revenue.toLocaleString()} omzet, €${data.b2c.profit.toLocaleString()} winst
- TOTAAL: ${data.total.count} auto's, €${data.total.revenue.toLocaleString()} omzet, €${data.total.profit.toLocaleString()} winst

VOORRAAD:
- ${data.stock.count} auto's op voorraad
- Gemiddeld ${data.stock.avgDaysOnStock} dagen op voorraad

ALERTS (${data.alerts.length}):
${data.alerts.map((a: any) => `- ${a.severity.toUpperCase()}: ${a.message}`).join('\n') || '- Geen kritieke alerts'}

TOP LEVERANCIERS:
${data.topSuppliers.map((s: any, i: number) => `${i + 1}. ${s.name} (${s.company || 'N/A'}): ${s.count} auto's, €${Math.round(s.avgMargin).toLocaleString()} gem. marge`).join('\n') || '- Geen data beschikbaar'}

Genereer nu een complete briefing.`;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('❌ LOVABLE_API_KEY not configured');
    throw new Error('AI Gateway not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices[0].message.content;

  // Generate summary
  const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Vat de briefing samen in 1 zin van max 100 tekens. Nederlands.' },
        { role: 'user', content: content }
      ],
    }),
  });

  let summary = `${data.total.count} verkopen, €${data.total.profit.toLocaleString()} winst, ${data.alerts.length} alerts`;
  
  if (summaryResponse.ok) {
    const summaryData = await summaryResponse.json();
    summary = summaryData.choices[0].message.content.slice(0, 200);
  }

  return { content, summary };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { briefingType }: BriefingRequest = await req.json();
    
    if (!['daily', 'weekly', 'monthly'].includes(briefingType)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid briefingType. Must be daily, weekly, or monthly.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📝 Generating ${briefingType} briefing...`);

    // Get briefing data
    const data = await getBriefingData(supabaseClient, briefingType);
    console.log(`📊 Data loaded: ${data.total.count} sales, ${data.alerts.length} alerts`);

    // Recall memories
    const memories = await recallMemory(supabaseClient);
    console.log(`🧠 Recalled ${memories.length} memories`);

    // Generate briefing content
    const { content, summary } = await generateBriefingContent(data, memories, briefingType);
    console.log(`✍️ Briefing generated: ${content.length} chars`);

    // Save to database
    const today = new Date().toISOString().split('T')[0];
    
    const { data: briefing, error: insertError } = await supabaseClient
      .from('ai_briefings')
      .upsert({
        agent_id: HENDRIK_AGENT_ID,
        briefing_type: briefingType,
        briefing_date: today,
        content,
        summary,
        alerts_included: data.alerts.length,
        memories_used: memories.length,
        is_read: false,
        data_snapshot: data
      }, {
        onConflict: 'agent_id,briefing_type,briefing_date'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to save briefing:', insertError);
      throw insertError;
    }

    console.log(`✅ Briefing saved: ${briefing.id}`);

    return new Response(JSON.stringify({
      success: true,
      briefingType,
      briefingId: briefing.id,
      summary,
      alertsCount: data.alerts.length,
      memoriesUsed: memories.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Briefing generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
