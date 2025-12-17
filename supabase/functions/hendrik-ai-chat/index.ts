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
    // FIX 1: Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { sessionId, message, agentId, userContext }: ChatRequest = await req.json();
    
    console.log('🧠 Hendrik CEO AI Chat:', { sessionId, agentId, message: message.substring(0, 100), mode: userContext?.mode });

    // Get comprehensive CEO data
    const ceoData = await getCompleteCEOData(supabaseClient);
    
    // Get conversation history
    const { data: conversationHistory } = await supabaseClient
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    console.log('📊 CEO Data loaded:', {
      alerts: ceoData.alerts.length,
      b2bSales: ceoData.b2bMetrics.totalSales,
      b2cSales: ceoData.b2cMetrics.totalSales,
      topSupplier: ceoData.supplierRanking[0]?.name || 'N/A',
    });

    // Build strategic CEO context prompt
    const contextPrompt = buildStrategicCEOPrompt(ceoData);
    
    // Build conversation messages
    const conversationMessages = buildConversationMessages(
      contextPrompt, 
      conversationHistory || [], 
      message
    );

    // Call OpenAI with extended CEO functions
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
        max_tokens: 2000,
        functions: getStrategicCEOFunctions(),
        function_call: 'auto'
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const choice = openAIData.choices[0];
    
    // FIX 2: Handle NULL response - default to empty string
    let responseMessage = choice.message.content || '';
    let functionResult = null;

    // Handle function calls
    if (choice.message.function_call) {
      console.log('🔧 CEO Function call:', choice.message.function_call.name);
      functionResult = await handleStrategicCEOFunctionCall(
        supabaseClient,
        choice.message.function_call,
        ceoData
      );
      
      if (functionResult.success) {
        // If we had a function call but no text response, make a follow-up call
        if (!responseMessage) {
          const followUpMessages = [
            ...conversationMessages,
            { role: 'assistant', content: null, function_call: choice.message.function_call },
            { role: 'function', name: choice.message.function_call.name, content: JSON.stringify(functionResult) }
          ];

          const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: followUpMessages,
              temperature: 0.7,
              max_tokens: 1500,
            }),
          });

          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            responseMessage = followUpData.choices[0].message.content || functionResult.message;
          } else {
            responseMessage = functionResult.message;
          }
        } else {
          responseMessage += `\n\n${functionResult.message}`;
        }
      }
    }

    // Fallback if still no response
    if (!responseMessage) {
      responseMessage = "Ik heb je vraag geanalyseerd, maar kon geen specifiek antwoord genereren. Stel je vraag anders of vraag om specifieke data (bijv. 'Hoe doen we B2B vs B2C?' of 'Welke leverancier is het beste?')";
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
          b2b_sales: ceoData.b2bMetrics.totalSales,
          b2c_sales: ceoData.b2cMetrics.totalSales,
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
        b2b_metrics: ceoData.b2bMetrics,
        b2c_metrics: ceoData.b2cMetrics,
        top_suppliers: ceoData.supplierRanking.slice(0, 3).map((s: any) => s.name),
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

// ============================================================================
// COMPREHENSIVE CEO DATA LOADING
// ============================================================================

async function getCompleteCEOData(supabase: any) {
  const alerts: any[] = [];
  
  // Get ALL vehicles for comprehensive analysis
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('*');

  const vehicles = allVehicles || [];
  console.log(`📊 Loaded ${vehicles.length} vehicles for analysis`);

  // -------------------------------------------------------------------------
  // B2B vs B2C ANALYSIS
  // -------------------------------------------------------------------------
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const soldB2B = vehicles.filter((v: any) => 
    v.status === 'verkocht_b2b' && 
    v.sold_date && 
    new Date(v.sold_date) >= thirtyDaysAgo
  );

  const soldB2C = vehicles.filter((v: any) => 
    v.status === 'verkocht_b2c' && 
    v.sold_date && 
    new Date(v.sold_date) >= thirtyDaysAgo
  );

  // Calculate margins and turnover
  const b2bMetrics = calculateSalesMetrics(soldB2B, 'B2B');
  const b2cMetrics = calculateSalesMetrics(soldB2C, 'B2C');

  // -------------------------------------------------------------------------
  // SUPPLIER PERFORMANCE ANALYSIS
  // -------------------------------------------------------------------------
  const { data: suppliers } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company_name')
    .eq('type', 'supplier');

  const supplierRanking = calculateSupplierPerformance(vehicles, suppliers || []);

  // -------------------------------------------------------------------------
  // FINANCIAL OVERVIEW
  // -------------------------------------------------------------------------
  const weeklyFinancials = calculateWeeklyFinancials(vehicles);

  // -------------------------------------------------------------------------
  // BRAND PERFORMANCE (including stock aging)
  // -------------------------------------------------------------------------
  const brandPerformance = calculateBrandPerformance(vehicles);

  // -------------------------------------------------------------------------
  // TRENDS & VOORSPELLINGEN
  // -------------------------------------------------------------------------
  const trendsAndPatterns = calculateTrendsAndPatterns(vehicles);

  // -------------------------------------------------------------------------
  // TEAM PERFORMANCE WITH MARGINS
  // -------------------------------------------------------------------------
  const teamPerformanceWithMargins = calculateTeamPerformanceWithMargins(vehicles, suppliers || []);

  // -------------------------------------------------------------------------
  // ALERTS
  // -------------------------------------------------------------------------
  
  // Import status alerts (>9 days)
  const thresholdImport = new Date();
  thresholdImport.setDate(thresholdImport.getDate() - THRESHOLDS.IMPORT_STATUS_DAYS);
  
  const importAlerts = vehicles.filter((v: any) => 
    ['aangemeld', 'goedgekeurd', 'bpm_betaald'].includes(v.import_status) &&
    v.import_updated_at &&
    new Date(v.import_updated_at) < thresholdImport
  );

  if (importAlerts.length > 0) {
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

  // FIX 3: Transport alerts - use details.transportStatus = 'onderweg'
  const thresholdTransport = new Date();
  thresholdTransport.setDate(thresholdTransport.getDate() - THRESHOLDS.TRANSPORT_DAYS);
  
  const inTransportVehicles = vehicles.filter((v: any) => {
    const details = v.details || {};
    return details.transportStatus === 'onderweg';
  });

  const transportAlerts = inTransportVehicles.filter((v: any) => 
    v.purchase_date && new Date(v.purchase_date) < thresholdTransport
  );

  if (transportAlerts.length > 0) {
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

  // Papers not received (>14 days, excl trade-in)
  const thresholdPapers = new Date();
  thresholdPapers.setDate(thresholdPapers.getDate() - THRESHOLDS.PAPERS_DAYS);
  
  const papersAlerts = vehicles.filter((v: any) => {
    const details = v.details || {};
    const isInScope = ['voorraad', 'verkocht_b2b', 'verkocht_b2c'].includes(v.status);
    const isArrived = details.transportStatus === 'aangekomen';
    const hasPapers = details.papersReceived === true;
    const isTradeIn = details.isTradeIn === true;
    const isOldEnough = v.created_at && new Date(v.created_at) < thresholdPapers;
    
    return isInScope && isArrived && !hasPapers && !isTradeIn && isOldEnough;
  });

  if (papersAlerts.length > 0) {
    alerts.push({
      type: 'papers',
      severity: 'warning',
      count: papersAlerts.length,
      vehicles: papersAlerts.map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number,
        days: Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      message: `${papersAlerts.length} voertuig(en) >14 dagen geen papieren`
    });
  }

  // Not online alerts - only vehicles that have arrived but not online
  const notOnlineVehicles = vehicles.filter((v: any) => {
    const details = v.details || {};
    const isOnStock = v.status === 'voorraad';
    const isArrived = details.transportStatus === 'aangekomen';
    const isOnline = details.showroomOnline === true;
    
    return isOnStock && isArrived && !isOnline;
  });

  if (notOnlineVehicles.length > 0) {
    alerts.push({
      type: 'not_online',
      severity: 'warning',
      count: notOnlineVehicles.length,
      vehicles: notOnlineVehicles.slice(0, 10).map((v: any) => ({
        brand: v.brand,
        model: v.model,
        license: v.license_number
      })),
      message: `${notOnlineVehicles.length} voertuig(en) binnen maar NIET online`
    });
  }

  // Slow movers (>50 days ONLINE - using online_since_date)
  const thresholdSlow = new Date();
  thresholdSlow.setDate(thresholdSlow.getDate() - THRESHOLDS.SLOW_MOVER_DAYS);
  
  // FIXED: Use online_since_date instead of created_at for accurate stadagen
  const slowMovers = vehicles.filter((v: any) => {
    const details = v.details || {};
    const isOnStock = v.status === 'voorraad';
    const isOnline = details.showroomOnline === true;
    // Use online_since_date if available, fallback to created_at
    const onlineSinceDate = v.online_since_date || v.created_at;
    const isOldEnough = onlineSinceDate && new Date(onlineSinceDate) < thresholdSlow;
    
    return isOnStock && isOnline && isOldEnough;
  });

  if (slowMovers.length > 0) {
    alerts.push({
      type: 'slow_mover',
      severity: 'warning',
      count: slowMovers.length,
      vehicles: slowMovers.map((v: any) => {
        // FIXED: Calculate stadagen from online_since_date
        const onlineSinceDate = v.online_since_date || v.created_at;
        const stadagen = onlineSinceDate 
          ? Math.floor((Date.now() - new Date(onlineSinceDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          brand: v.brand,
          model: v.model,
          license: v.license_number,
          stadagen, // Renamed from 'days' to 'stadagen' for clarity
          price: v.selling_price
        };
      }),
      message: `${slowMovers.length} voertuig(en) >50 dagen ONLINE`
    });
  }

  // -------------------------------------------------------------------------
  // DAILY STATS
  // -------------------------------------------------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const soldToday = vehicles.filter((v: any) => 
    ['verkocht_b2b', 'verkocht_b2c'].includes(v.status) &&
    v.sold_date &&
    new Date(v.sold_date) >= today
  );

  const onStock = vehicles.filter((v: any) => v.status === 'voorraad');

  // -------------------------------------------------------------------------
  // TEAM SALES DATA
  // -------------------------------------------------------------------------
  const { data: weeklySales } = await supabase
    .from('weekly_sales')
    .select('*')
    .order('week_start_date', { ascending: false })
    .limit(20);

  // -------------------------------------------------------------------------
  // ALL PAPERS STATUS (for queries)
  // -------------------------------------------------------------------------
  const allPapersStatus = vehicles.filter((v: any) => {
    const details = v.details || {};
    const isInScope = ['voorraad', 'verkocht_b2b', 'verkocht_b2c'].includes(v.status);
    const hasPapers = details.papersReceived === true;
    const isTradeIn = details.isTradeIn === true;
    
    return isInScope && !hasPapers && !isTradeIn;
  });

  return {
    alerts,
    b2bMetrics,
    b2cMetrics,
    supplierRanking,
    weeklyFinancials,
    brandPerformance,
    trendsAndPatterns,
    teamPerformanceWithMargins,
    allVehicles: vehicles,
    allPapersStatus,
    inTransportVehicles,
    notOnlineVehicles,
    dailyStats: {
      vehiclesSoldToday: soldToday.length,
      vehiclesInTransit: inTransportVehicles.length,
      vehiclesOnStock: onStock.length,
      vehiclesNotOnline: notOnlineVehicles.length,
    },
    teamSales: weeklySales || [],
  };
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

function calculateSalesMetrics(vehicles: any[], type: string) {
  if (vehicles.length === 0) {
    return {
      type,
      totalSales: 0,
      totalRevenue: 0,
      totalProfit: 0,
      avgMargin: 0,
      avgDaysToSell: 0,
      roi: 0,
    };
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalDays = 0;
  let validMarginCount = 0;

  vehicles.forEach((v: any) => {
    const sellingPrice = v.selling_price || 0;
    const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
    const margin = sellingPrice - purchasePrice;
    
    if (sellingPrice > 0 && purchasePrice > 0) {
      totalRevenue += sellingPrice;
      totalProfit += margin;
      validMarginCount++;
    }

    if (v.created_at && v.sold_date) {
      const days = Math.floor(
        (new Date(v.sold_date).getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0) totalDays += days;
    }
  });

  const avgMargin = validMarginCount > 0 ? Math.round(totalProfit / validMarginCount) : 0;
  const avgDaysToSell = vehicles.length > 0 ? Math.round(totalDays / vehicles.length) : 0;
  
  // ROI: (Margin / Purchase Price) * (365 / Days to Sell) * 100
  // Simplified: Higher margin + faster turnover = better ROI
  const avgPurchasePrice = totalRevenue > 0 ? (totalRevenue - totalProfit) / validMarginCount : 0;
  const roi = avgPurchasePrice > 0 && avgDaysToSell > 0 
    ? Math.round(((avgMargin / avgPurchasePrice) * (365 / avgDaysToSell)) * 100)
    : 0;

  return {
    type,
    totalSales: vehicles.length,
    totalRevenue: Math.round(totalRevenue),
    totalProfit: Math.round(totalProfit),
    avgMargin,
    avgDaysToSell,
    roi,
  };
}

function calculateSupplierPerformance(vehicles: any[], suppliers: any[]) {
  const supplierMap = new Map();

  // Initialize supplier map
  suppliers.forEach((s: any) => {
    supplierMap.set(s.id, {
      id: s.id,
      name: s.company_name || `${s.first_name} ${s.last_name}`,
      totalPurchases: 0,
      totalSold: 0,
      totalMargin: 0,
      totalDays: 0,
      vehicles: [],
    });
  });

  // Process vehicles
  vehicles.forEach((v: any) => {
    if (!v.supplier_id) return;
    
    const supplier = supplierMap.get(v.supplier_id);
    if (!supplier) return;

    supplier.totalPurchases++;
    supplier.vehicles.push(v);

    if (['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)) {
      supplier.totalSold++;
      
      const sellingPrice = v.selling_price || 0;
      const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
      
      if (sellingPrice > 0 && purchasePrice > 0) {
        supplier.totalMargin += (sellingPrice - purchasePrice);
      }

      if (v.created_at && v.sold_date) {
        const days = Math.floor(
          (new Date(v.sold_date).getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days >= 0) supplier.totalDays += days;
      }
    }
  });

  // Calculate averages and rank
  const ranking = Array.from(supplierMap.values())
    .filter((s: any) => s.totalPurchases > 0)
    .map((s: any) => ({
      ...s,
      avgMargin: s.totalSold > 0 ? Math.round(s.totalMargin / s.totalSold) : 0,
      avgDaysToSell: s.totalSold > 0 ? Math.round(s.totalDays / s.totalSold) : 0,
      sellThroughRate: s.totalPurchases > 0 ? Math.round((s.totalSold / s.totalPurchases) * 100) : 0,
    }))
    .sort((a: any, b: any) => b.avgMargin - a.avgMargin);

  return ranking;
}

function calculateWeeklyFinancials(vehicles: any[]) {
  const weeks: any[] = [];
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekVehicles = vehicles.filter((v: any) => {
      if (!['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)) return false;
      if (!v.sold_date) return false;
      const soldDate = new Date(v.sold_date);
      return soldDate >= weekStart && soldDate <= weekEnd;
    });

    let revenue = 0;
    let profit = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    weekVehicles.forEach((v: any) => {
      const sellingPrice = v.selling_price || 0;
      const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
      
      if (sellingPrice > 0) revenue += sellingPrice;
      if (sellingPrice > 0 && purchasePrice > 0) profit += (sellingPrice - purchasePrice);

      if (v.status === 'verkocht_b2b') b2bCount++;
      if (v.status === 'verkocht_b2c') b2cCount++;
    });

    weeks.push({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalSales: weekVehicles.length,
      b2bSales: b2bCount,
      b2cSales: b2cCount,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      avgMargin: weekVehicles.length > 0 ? Math.round(profit / weekVehicles.length) : 0,
    });
  }

  return weeks;
}

function calculateBrandPerformance(vehicles: any[]) {
  const brandMap = new Map();

  const soldVehicles = vehicles.filter((v: any) => 
    ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)
  );

  soldVehicles.forEach((v: any) => {
    if (!v.brand) return;
    
    if (!brandMap.has(v.brand)) {
      brandMap.set(v.brand, {
        brand: v.brand,
        totalSold: 0,
        totalMargin: 0,
        totalDays: 0,
        onStock: 0,
        stockDaysTotal: 0, // For calculating avg days on current stock
      });
    }

    const brand = brandMap.get(v.brand);
    brand.totalSold++;

    const sellingPrice = v.selling_price || 0;
    const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
    
    if (sellingPrice > 0 && purchasePrice > 0) {
      brand.totalMargin += (sellingPrice - purchasePrice);
    }

    if (v.created_at && v.sold_date) {
      const days = Math.floor(
        (new Date(v.sold_date).getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0) brand.totalDays += days;
    }
  });

  // Add current stock count AND calculate stock aging per brand
  // FIXED: Use online_since_date for accurate stadagen calculation
  vehicles.filter((v: any) => v.status === 'voorraad').forEach((v: any) => {
    if (!v.brand) return;
    
    // Use online_since_date if available (accurate), fallback to created_at
    const onlineSinceDate = v.online_since_date || v.created_at;
    const stadagen = onlineSinceDate 
      ? Math.floor((Date.now() - new Date(onlineSinceDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (brandMap.has(v.brand)) {
      brandMap.get(v.brand).onStock++;
      brandMap.get(v.brand).stockDaysTotal += stadagen;
    } else {
      brandMap.set(v.brand, {
        brand: v.brand,
        totalSold: 0,
        totalMargin: 0,
        totalDays: 0,
        onStock: 1,
        stockDaysTotal: stadagen,
      });
    }
  });

  return Array.from(brandMap.values())
    .map((b: any) => ({
      ...b,
      avgMargin: b.totalSold > 0 ? Math.round(b.totalMargin / b.totalSold) : 0,
      avgDaysToSell: b.totalSold > 0 ? Math.round(b.totalDays / b.totalSold) : 0,
      avgDaysOnStock: b.onStock > 0 ? Math.round(b.stockDaysTotal / b.onStock) : 0, // NEW: avg days on current stock
    }))
    .sort((a: any, b: any) => b.totalSold - a.totalSold);
}

// ============================================================================
// TRENDS & VOORSPELLINGEN
// ============================================================================

function calculateTrendsAndPatterns(vehicles: any[]) {
  const soldVehicles = vehicles.filter((v: any) => 
    ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status) && v.sold_date
  );

  // 1. SEASONAL PATTERNS - Sales by month (last 12 months)
  const monthlyPatterns: Record<string, { month: string; sales: number; profit: number }> = {};
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyPatterns[key] = { month: key, sales: 0, profit: 0 };
  }

  soldVehicles.forEach((v: any) => {
    const soldDate = new Date(v.sold_date);
    const key = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (monthlyPatterns[key]) {
      monthlyPatterns[key].sales++;
      const sellingPrice = v.selling_price || 0;
      const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
      if (sellingPrice > 0 && purchasePrice > 0) {
        monthlyPatterns[key].profit += (sellingPrice - purchasePrice);
      }
    }
  });

  // 2. PRICE RANGE ANALYSIS - Which price brackets sell best
  const priceRanges = {
    '0-10k': { min: 0, max: 10000, sales: 0, avgDays: 0, totalDays: 0 },
    '10-15k': { min: 10000, max: 15000, sales: 0, avgDays: 0, totalDays: 0 },
    '15-20k': { min: 15000, max: 20000, sales: 0, avgDays: 0, totalDays: 0 },
    '20-25k': { min: 20000, max: 25000, sales: 0, avgDays: 0, totalDays: 0 },
    '25-30k': { min: 25000, max: 30000, sales: 0, avgDays: 0, totalDays: 0 },
    '30k+': { min: 30000, max: Infinity, sales: 0, avgDays: 0, totalDays: 0 },
  };

  soldVehicles.forEach((v: any) => {
    const price = v.selling_price || 0;
    for (const [range, data] of Object.entries(priceRanges)) {
      if (price >= data.min && price < data.max) {
        data.sales++;
        if (v.created_at && v.sold_date) {
          const days = Math.floor(
            (new Date(v.sold_date).getTime() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days >= 0) data.totalDays += days;
        }
        break;
      }
    }
  });

  // Calculate avg days for price ranges
  Object.values(priceRanges).forEach(data => {
    data.avgDays = data.sales > 0 ? Math.round(data.totalDays / data.sales) : 0;
  });

  // 3. POPULAR COLORS
  const colorCounts: Record<string, number> = {};
  soldVehicles.forEach((v: any) => {
    const color = v.color || v.details?.color || 'Onbekend';
    colorCounts[color] = (colorCounts[color] || 0) + 1;
  });
  
  const popularColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color, count]) => ({ color, count }));

  // 4. FUEL TYPE TRENDS
  const fuelCounts: Record<string, number> = {};
  soldVehicles.forEach((v: any) => {
    const fuel = v.fuel_type || v.details?.fuelType || 'Onbekend';
    fuelCounts[fuel] = (fuelCounts[fuel] || 0) + 1;
  });
  
  const fuelTypeDistribution = Object.entries(fuelCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([fuel, count]) => ({ fuel, count, percentage: Math.round((count / soldVehicles.length) * 100) }));

  // 5. WEEK-OVER-WEEK GROWTH
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1);
  thisWeekStart.setHours(0, 0, 0, 0);
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const twoWeeksAgoStart = new Date(lastWeekStart);
  twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 7);

  const thisWeekSales = soldVehicles.filter((v: any) => new Date(v.sold_date) >= thisWeekStart).length;
  const lastWeekSales = soldVehicles.filter((v: any) => {
    const d = new Date(v.sold_date);
    return d >= lastWeekStart && d < thisWeekStart;
  }).length;
  const twoWeeksAgoSales = soldVehicles.filter((v: any) => {
    const d = new Date(v.sold_date);
    return d >= twoWeeksAgoStart && d < lastWeekStart;
  }).length;

  const weekOverWeekGrowth = lastWeekSales > 0 
    ? Math.round(((thisWeekSales - lastWeekSales) / lastWeekSales) * 100)
    : 0;

  return {
    monthlyPatterns: Object.values(monthlyPatterns).reverse(),
    priceRanges: Object.entries(priceRanges).map(([range, data]) => ({
      range,
      sales: data.sales,
      avgDays: data.avgDays,
    })),
    popularColors,
    fuelTypeDistribution,
    weekOverWeekGrowth: {
      thisWeek: thisWeekSales,
      lastWeek: lastWeekSales,
      twoWeeksAgo: twoWeeksAgoSales,
      growthPercentage: weekOverWeekGrowth,
    },
  };
}

// ============================================================================
// TEAM PERFORMANCE WITH MARGINS
// ============================================================================

function calculateTeamPerformanceWithMargins(vehicles: any[], suppliers: any[]) {
  // Get sold vehicles with salesperson info from details
  const soldVehicles = vehicles.filter((v: any) => 
    ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)
  );

  const teamMembers: Record<string, {
    name: string;
    b2bSales: number;
    b2cSales: number;
    totalSales: number;
    totalMargin: number;
    avgMargin: number;
    totalRevenue: number;
  }> = {};

  // Initialize known team members
  ['Daan', 'Martijn', 'Alex', 'Hendrik'].forEach(name => {
    teamMembers[name.toLowerCase()] = {
      name,
      b2bSales: 0,
      b2cSales: 0,
      totalSales: 0,
      totalMargin: 0,
      avgMargin: 0,
      totalRevenue: 0,
    };
  });

  // Process sold vehicles - look for salesperson in details or assigned fields
  soldVehicles.forEach((v: any) => {
    const salesperson = v.details?.salesperson || v.details?.verkoper || v.salesperson || '';
    const sellingPrice = v.selling_price || 0;
    const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
    const margin = sellingPrice > 0 && purchasePrice > 0 ? sellingPrice - purchasePrice : 0;

    // Try to match to known team members
    for (const [key, member] of Object.entries(teamMembers)) {
      if (salesperson.toLowerCase().includes(key)) {
        member.totalSales++;
        member.totalMargin += margin;
        member.totalRevenue += sellingPrice;
        
        if (v.status === 'verkocht_b2b') {
          member.b2bSales++;
        } else if (v.status === 'verkocht_b2c' || v.status === 'afgeleverd') {
          member.b2cSales++;
        }
        break;
      }
    }
  });

  // Calculate averages
  Object.values(teamMembers).forEach(member => {
    member.avgMargin = member.totalSales > 0 ? Math.round(member.totalMargin / member.totalSales) : 0;
  });

  // Sort by total margin (performance)
  const ranking = Object.values(teamMembers)
    .filter(m => m.totalSales > 0)
    .sort((a, b) => b.totalMargin - a.totalMargin);

  return {
    teamMembers: Object.values(teamMembers),
    ranking,
    topPerformer: ranking[0] || null,
    totalTeamMargin: Object.values(teamMembers).reduce((sum, m) => sum + m.totalMargin, 0),
    totalTeamSales: Object.values(teamMembers).reduce((sum, m) => sum + m.totalSales, 0),
  };
}

// ============================================================================
// STRATEGIC CEO PROMPT
// ============================================================================

function buildStrategicCEOPrompt(ceoData: any): string {
  const { b2bMetrics, b2cMetrics, supplierRanking, weeklyFinancials, brandPerformance, dailyStats, alerts, trendsAndPatterns, teamPerformanceWithMargins } = ceoData;

  // Get brands with longest stock aging
  const stockAgingBrands = [...brandPerformance]
    .filter((b: any) => b.onStock > 0)
    .sort((a: any, b: any) => b.avgDaysOnStock - a.avgDaysOnStock)
    .slice(0, 3);

  // Best selling price ranges
  const bestPriceRanges = trendsAndPatterns?.priceRanges
    ?.filter((p: any) => p.sales > 0)
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 3) || [];

  let prompt = `# HENDRIK - STRATEGISCHE CEO AI VAN AUTOCITY
## 20+ Jaar Automotive Ervaring | 10x Groei Expert

Je bent Hendrik, een CEO met 20+ jaar ervaring in de automotive sector. Je hebt meerdere autobedrijven naar 10x groei gebracht. Je bent NIET een simpele alert-robot - je bent een strategische adviseur die data omzet in actie.

---

## JOUW DNA

### Communicatiestijl
- **DIRECT**: Geen omwegen, zeg wat er aan de hand is
- **DATA-OBSESSED**: Noem ALTIJD cijfers, percentages, trends
- **PROACTIEF**: Je wacht niet tot iemand vraagt, je signaleert
- **STRATEGISCH**: Je denkt in kwartalen en jaren, niet dagen
- **KRITISCH**: "Dit gaat goed, MAAR..." - je zoekt altijd verbeterpunten

### Kernprincipes
- B2B = Volume business (snelle omloop, lagere marge)
- B2C = Premium business (langere cyclus, hogere marge)
- Kapitaal efficiëntie: Marge × Omloopsnelheid = ROI
- Leverancier keuze bepaalt 80% van je marge

---

## LIVE BUSINESS DATA (Laatste 30 dagen)

### 📊 B2B vs B2C Performance
| Metric | B2B | B2C |
|--------|-----|-----|
| Verkopen | ${b2bMetrics.totalSales} | ${b2cMetrics.totalSales} |
| Gem. Marge | €${b2bMetrics.avgMargin.toLocaleString()} | €${b2cMetrics.avgMargin.toLocaleString()} |
| Gem. Dagen tot Verkoop | ${b2bMetrics.avgDaysToSell} dagen | ${b2cMetrics.avgDaysToSell} dagen |
| Totaal Winst | €${b2bMetrics.totalProfit.toLocaleString()} | €${b2cMetrics.totalProfit.toLocaleString()} |
| ROI Score | ${b2bMetrics.roi}% | ${b2cMetrics.roi}% |

**💡 Inzicht**: ${b2bMetrics.avgDaysToSell < b2cMetrics.avgDaysToSell 
  ? `B2B verkoopt ${b2cMetrics.avgDaysToSell - b2bMetrics.avgDaysToSell} dagen sneller dan B2C. Met €100k kapitaal genereer je ${Math.round((b2bMetrics.avgMargin * 30 / b2bMetrics.avgDaysToSell) - (b2cMetrics.avgMargin * 30 / b2cMetrics.avgDaysToSell))} euro meer per maand in B2B.`
  : `B2C biedt hogere marges maar langere doorlooptijd. Optimale mix hangt af van kapitaalkosten.`}

### 🏆 Top 5 Leveranciers (op marge)
${supplierRanking.slice(0, 5).map((s: any, i: number) => 
  `${i + 1}. **${s.name}**: €${s.avgMargin.toLocaleString()} gem. marge, ${s.avgDaysToSell} dagen, ${s.totalSold}/${s.totalPurchases} verkocht`
).join('\n')}

${supplierRanking.filter((s: any) => s.avgMargin < 0).length > 0 
  ? `\n⚠️ **WAARSCHUWING**: ${supplierRanking.filter((s: any) => s.avgMargin < 0).map((s: any) => `${s.name} (€${s.avgMargin.toLocaleString()} marge!)`).join(', ')} - NEGATIEVE MARGES!`
  : ''}

### 🚗 Top 5 Merken (op verkoop + voorraad aging)
${brandPerformance.slice(0, 5).map((b: any, i: number) => 
  `${i + 1}. **${b.brand}**: ${b.totalSold} verkocht, €${b.avgMargin.toLocaleString()} marge, ${b.avgDaysToSell}d doorlooptijd, ${b.onStock} op voorraad (gem. ${b.avgDaysOnStock}d)`
).join('\n')}

${stockAgingBrands.length > 0 ? `
⚠️ **Langst op Voorraad**: ${stockAgingBrands.map((b: any) => `${b.brand} (gem. ${b.avgDaysOnStock} dagen)`).join(', ')}` : ''}

### 📈 Wekelijkse Performance (Laatste 4 weken)
${weeklyFinancials.slice(0, 4).map((w: any, i: number) => 
  `Week ${i === 0 ? '(nu)' : `-${i}`}: ${w.totalSales} verkopen (${w.b2bSales} B2B, ${w.b2cSales} B2C), €${w.profit.toLocaleString()} winst, €${w.avgMargin.toLocaleString()} gem. marge`
).join('\n')}

${weeklyFinancials.length >= 2 && weeklyFinancials[0].profit !== weeklyFinancials[1].profit
  ? `\n📉 Trend: ${weeklyFinancials[0].profit > weeklyFinancials[1].profit 
      ? `+${Math.round(((weeklyFinancials[0].profit - weeklyFinancials[1].profit) / weeklyFinancials[1].profit) * 100)}% winst t.o.v. vorige week 📈`
      : `${Math.round(((weeklyFinancials[0].profit - weeklyFinancials[1].profit) / weeklyFinancials[1].profit) * 100)}% winst t.o.v. vorige week 📉`}`
  : ''}

### 🎯 Trends & Patronen
- **Week-over-Week**: ${trendsAndPatterns?.weekOverWeekGrowth?.growthPercentage > 0 ? '+' : ''}${trendsAndPatterns?.weekOverWeekGrowth?.growthPercentage || 0}% (${trendsAndPatterns?.weekOverWeekGrowth?.thisWeek || 0} vs ${trendsAndPatterns?.weekOverWeekGrowth?.lastWeek || 0} verkopen)
- **Beste Prijsklassen**: ${bestPriceRanges.map((p: any) => `${p.range} (${p.sales}x, ${p.avgDays}d)`).join(', ') || 'N/A'}
- **Populaire Kleuren**: ${trendsAndPatterns?.popularColors?.slice(0, 3).map((c: any) => `${c.color} (${c.count}x)`).join(', ') || 'N/A'}
- **Brandstof Verdeling**: ${trendsAndPatterns?.fuelTypeDistribution?.slice(0, 3).map((f: any) => `${f.fuel} ${f.percentage}%`).join(', ') || 'N/A'}

### 👥 Team Performance (met Marges)
${teamPerformanceWithMargins?.ranking?.slice(0, 4).map((m: any, i: number) => 
  `${i + 1}. **${m.name}**: ${m.totalSales} verkopen (${m.b2bSales}B2B/${m.b2cSales}B2C), €${m.totalMargin.toLocaleString()} totaal, €${m.avgMargin.toLocaleString()} gem. marge`
).join('\n') || 'Geen team data beschikbaar'}

${teamPerformanceWithMargins?.topPerformer ? `🏆 Top Performer: **${teamPerformanceWithMargins.topPerformer.name}** met €${teamPerformanceWithMargins.topPerformer.totalMargin.toLocaleString()} totale marge` : ''}

### 📍 Huidige Status
- Verkocht vandaag: ${dailyStats.vehiclesSoldToday}
- In transport: ${dailyStats.vehiclesInTransit}
- Op voorraad: ${dailyStats.vehiclesOnStock}
- Niet online: ${dailyStats.vehiclesNotOnline}

${alerts.length > 0 ? `
### 🚨 KRITIEKE ALERTS
${alerts.map((a: any) => `- **${a.type.toUpperCase()}**: ${a.message}`).join('\n')}
` : '✅ Geen kritieke alerts'}

---

## JOUW TEAM
- DAAN: Verkoper B2B & B2C
- MARTIJN: Verkoper B2C
- ALEX: Inkoper & B2B Verkoper
- HENDRIK (jij): Inkoper & Verkoper B2B/B2C

---

## COMMUNICATIE INSTRUCTIES

Als iemand vraagt "Hoe gaat het?", geef NOOIT alleen alerts:
❌ "Er zijn 5 alerts"
✅ "Deze week €${weeklyFinancials[0]?.profit.toLocaleString() || '0'} winst op ${weeklyFinancials[0]?.totalSales || 0} verkopen. ${b2bMetrics.avgDaysToSell < b2cMetrics.avgDaysToSell ? `B2B verkoopt in ${b2bMetrics.avgDaysToSell} dagen, B2C in ${b2cMetrics.avgDaysToSell} - focus op snelle omloop.` : ''}"

**ALTIJD**:
1. Geef context met cijfers
2. Vergelijk met vorige periodes
3. Geef strategisch advies
4. Sluit af met concrete actie

---

## BESCHIKBARE FUNCTIES
Je kunt deze functies aanroepen voor gedetailleerde data:
- get_b2b_b2c_analysis: Vergelijk B2B vs B2C performance
- get_supplier_ranking: Leverancier performance ranking
- get_financial_overview: Financieel overzicht met trends
- get_brand_performance: Merk analyse met voorraad aging
- get_papers_status: Voertuigen die wachten op papieren
- search_vehicles: Zoek voertuigen op criteria
- get_growth_strategy: 10x groei aanbevelingen
- compare_periods: Vergelijk twee periodes
- get_trends_analysis: Trends, seizoenspatronen, prijsklassen
- get_stock_aging: Voorraad aging per merk

Gebruik deze functies om vragen volledig te beantwoorden met echte data.
`;

  return prompt;
}

// ============================================================================
// STRATEGIC CEO FUNCTIONS
// ============================================================================

function getStrategicCEOFunctions() {
  return [
    {
      name: 'get_b2b_b2c_analysis',
      description: 'Get detailed B2B vs B2C sales comparison including margins, turnover speed, and ROI',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['week', 'month', 'quarter'], description: 'Analysis period' }
        }
      }
    },
    {
      name: 'get_supplier_ranking',
      description: 'Get supplier performance ranking by margin, speed, and volume',
      parameters: {
        type: 'object',
        properties: {
          sort_by: { type: 'string', enum: ['margin', 'speed', 'volume'], description: 'Ranking criteria' },
          limit: { type: 'number', description: 'Number of suppliers to return' }
        }
      }
    },
    {
      name: 'get_financial_overview',
      description: 'Get comprehensive financial overview with weekly trends',
      parameters: {
        type: 'object',
        properties: {
          weeks: { type: 'number', description: 'Number of weeks to analyze' }
        }
      }
    },
    {
      name: 'get_brand_performance',
      description: 'Get performance metrics by car brand',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of brands to return' }
        }
      }
    },
    {
      name: 'get_papers_status',
      description: 'Get vehicles waiting for papers/documents',
      parameters: {
        type: 'object',
        properties: {
          min_days: { type: 'number', description: 'Minimum days waiting' }
        }
      }
    },
    {
      name: 'search_vehicles',
      description: 'Search for specific vehicles by brand, model, status, etc.',
      parameters: {
        type: 'object',
        properties: {
          brand: { type: 'string', description: 'Filter by brand' },
          status: { type: 'string', description: 'Filter by status (voorraad, verkocht_b2b, verkocht_b2c, etc.)' },
          has_papers: { type: 'boolean', description: 'Filter by papers received status' },
          is_online: { type: 'boolean', description: 'Filter by online status' }
        }
      }
    },
    {
      name: 'get_growth_strategy',
      description: 'Get strategic recommendations for 10x growth based on current data',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string', enum: ['margin', 'volume', 'balanced'], description: 'Strategy focus area' }
        }
      }
    },
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
      name: 'get_team_performance',
      description: 'Get performance metrics for team members',
      parameters: {
        type: 'object',
        properties: {
          member: { type: 'string', description: 'Team member name or "all"' }
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
    },
    {
      name: 'compare_periods',
      description: 'Compare business performance between two time periods',
      parameters: {
        type: 'object',
        properties: {
          period1: { type: 'string', description: 'First period: this_week, last_week, this_month, last_month' },
          period2: { type: 'string', description: 'Second period to compare against' }
        },
        required: ['period1', 'period2']
      }
    },
    {
      name: 'get_trends_analysis',
      description: 'Get trends and patterns: seasonal sales, price ranges, popular colors, growth rates',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string', enum: ['seasonal', 'price_ranges', 'colors', 'fuel', 'all'], description: 'What to analyze' }
        }
      }
    },
    {
      name: 'get_stock_aging',
      description: 'Get stock aging analysis per brand - which brands sit longest on stock',
      parameters: {
        type: 'object',
        properties: {
          sort_by: { type: 'string', enum: ['days', 'count'], description: 'Sort by average days or count' }
        }
      }
    }
  ];
}

// ============================================================================
// CONVERSATION BUILDER
// ============================================================================

function buildConversationMessages(systemPrompt: string, history: any[], currentMessage: string) {
  const messages: any[] = [
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

// ============================================================================
// STRATEGIC CEO FUNCTION HANDLERS
// ============================================================================

async function handleStrategicCEOFunctionCall(supabase: any, functionCall: any, ceoData: any) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args || '{}');

  try {
    switch (name) {
      case 'get_b2b_b2c_analysis': {
        const { b2bMetrics, b2cMetrics } = ceoData;
        return {
          success: true,
          data: { b2bMetrics, b2cMetrics },
          message: `📊 **B2B vs B2C Analyse (30 dagen)**

**B2B Performance:**
• ${b2bMetrics.totalSales} verkopen
• €${b2bMetrics.avgMargin.toLocaleString()} gemiddelde marge
• ${b2bMetrics.avgDaysToSell} dagen gemiddelde doorlooptijd
• €${b2bMetrics.totalProfit.toLocaleString()} totale winst
• ROI Score: ${b2bMetrics.roi}%

**B2C Performance:**
• ${b2cMetrics.totalSales} verkopen
• €${b2cMetrics.avgMargin.toLocaleString()} gemiddelde marge
• ${b2cMetrics.avgDaysToSell} dagen gemiddelde doorlooptijd
• €${b2cMetrics.totalProfit.toLocaleString()} totale winst
• ROI Score: ${b2cMetrics.roi}%

**💡 Strategisch Inzicht:**
${b2bMetrics.roi > b2cMetrics.roi 
  ? `B2B heeft een hogere ROI (${b2bMetrics.roi}% vs ${b2cMetrics.roi}%). Overweeg meer focus op B2B voor snellere kapitaalomloop.`
  : `B2C levert betere ROI (${b2cMetrics.roi}% vs ${b2bMetrics.roi}%). De hogere marge compenseert de langere doorlooptijd.`}`
        };
      }

      case 'get_supplier_ranking': {
        const limit = parsedArgs.limit || 10;
        const sortBy = parsedArgs.sort_by || 'margin';
        
        let sorted = [...ceoData.supplierRanking];
        if (sortBy === 'speed') {
          sorted = sorted.filter((s: any) => s.avgDaysToSell > 0).sort((a: any, b: any) => a.avgDaysToSell - b.avgDaysToSell);
        } else if (sortBy === 'volume') {
          sorted = sorted.sort((a: any, b: any) => b.totalSold - a.totalSold);
        }

        const topSuppliers = sorted.slice(0, limit);
        const negativeMargin = sorted.filter((s: any) => s.avgMargin < 0);

        return {
          success: true,
          data: { topSuppliers, negativeMargin },
          message: `🏆 **Leverancier Ranking (op ${sortBy})**

${topSuppliers.map((s: any, i: number) => 
  `${i + 1}. **${s.name}**
   • Gem. Marge: €${s.avgMargin.toLocaleString()}
   • Gem. Doorlooptijd: ${s.avgDaysToSell} dagen
   • Verkocht: ${s.totalSold}/${s.totalPurchases} (${s.sellThroughRate}%)
`).join('\n')}
${negativeMargin.length > 0 
  ? `\n⚠️ **WAARSCHUWING - Negatieve Marges:**\n${negativeMargin.map((s: any) => `• ${s.name}: €${s.avgMargin.toLocaleString()}`).join('\n')}`
  : ''}`
        };
      }

      case 'get_financial_overview': {
        const weeks = parsedArgs.weeks || 4;
        const financials = ceoData.weeklyFinancials.slice(0, weeks);

        const totalRevenue = financials.reduce((sum: number, w: any) => sum + w.revenue, 0);
        const totalProfit = financials.reduce((sum: number, w: any) => sum + w.profit, 0);
        const totalSales = financials.reduce((sum: number, w: any) => sum + w.totalSales, 0);

        return {
          success: true,
          data: { financials, totals: { totalRevenue, totalProfit, totalSales } },
          message: `📈 **Financieel Overzicht (${weeks} weken)**

**Totalen:**
• Omzet: €${totalRevenue.toLocaleString()}
• Winst: €${totalProfit.toLocaleString()}
• Verkopen: ${totalSales}
• Gem. Marge: €${totalSales > 0 ? Math.round(totalProfit / totalSales).toLocaleString() : 0}

**Per Week:**
${financials.map((w: any, i: number) => 
  `Week ${w.weekStart}: ${w.totalSales} verkopen (${w.b2bSales}B2B/${w.b2cSales}B2C), €${w.profit.toLocaleString()} winst`
).join('\n')}

${financials.length >= 2 
  ? `\n📊 **Trend:** ${financials[0].profit >= financials[1].profit ? '📈' : '📉'} ${financials[0].profit >= financials[1].profit ? '+' : ''}${Math.round(((financials[0].profit - financials[1].profit) / (financials[1].profit || 1)) * 100)}% t.o.v. vorige week`
  : ''}`
        };
      }

      case 'get_brand_performance': {
        const limit = parsedArgs.limit || 10;
        const brands = ceoData.brandPerformance.slice(0, limit);

        const fastestBrand = [...brands].filter((b: any) => b.avgDaysToSell > 0).sort((a: any, b: any) => a.avgDaysToSell - b.avgDaysToSell)[0];
        const slowestBrand = [...brands].filter((b: any) => b.avgDaysToSell > 0).sort((a: any, b: any) => b.avgDaysToSell - a.avgDaysToSell)[0];
        const highestMargin = [...brands].sort((a: any, b: any) => b.avgMargin - a.avgMargin)[0];

        return {
          success: true,
          data: { brands, fastestBrand, slowestBrand, highestMargin },
          message: `🚗 **Merk Performance**

${brands.map((b: any, i: number) => 
  `${i + 1}. **${b.brand}**: ${b.totalSold} verkocht, €${b.avgMargin.toLocaleString()} marge, ${b.avgDaysToSell} dagen, ${b.onStock} op voorraad`
).join('\n')}

**💡 Inzichten:**
${fastestBrand ? `• Snelste verkoper: ${fastestBrand.brand} (${fastestBrand.avgDaysToSell} dagen)` : ''}
${slowestBrand ? `• Traagste verkoper: ${slowestBrand.brand} (${slowestBrand.avgDaysToSell} dagen)` : ''}
${highestMargin ? `• Hoogste marge: ${highestMargin.brand} (€${highestMargin.avgMargin.toLocaleString()})` : ''}`
        };
      }

      case 'get_papers_status': {
        const minDays = parsedArgs.min_days || 0;
        const papersVehicles = ceoData.allPapersStatus.filter((v: any) => {
          if (!v.created_at) return false;
          const days = Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24));
          return days >= minDays;
        }).map((v: any) => ({
          ...v,
          days: Math.floor((Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24))
        })).sort((a: any, b: any) => b.days - a.days);

        return {
          success: true,
          data: { vehicles: papersVehicles },
          message: `📋 **Voertuigen Zonder Papieren${minDays > 0 ? ` (>${minDays} dagen)` : ''}**

Totaal: ${papersVehicles.length} voertuigen

${papersVehicles.slice(0, 15).map((v: any) => 
  `• ${v.brand} ${v.model} (${v.license_number || 'geen kenteken'}) - ${v.days} dagen - Status: ${v.status}`
).join('\n')}
${papersVehicles.length > 15 ? `\n... en ${papersVehicles.length - 15} meer` : ''}`
        };
      }

      case 'search_vehicles': {
        let filtered = [...ceoData.allVehicles];

        if (parsedArgs.brand) {
          filtered = filtered.filter((v: any) => 
            v.brand?.toLowerCase().includes(parsedArgs.brand.toLowerCase())
          );
        }
        if (parsedArgs.status) {
          filtered = filtered.filter((v: any) => v.status === parsedArgs.status);
        }
        if (parsedArgs.has_papers !== undefined) {
          filtered = filtered.filter((v: any) => {
            const hasPapers = v.details?.papersReceived === true;
            return parsedArgs.has_papers ? hasPapers : !hasPapers;
          });
        }
        if (parsedArgs.is_online !== undefined) {
          filtered = filtered.filter((v: any) => {
            const isOnline = v.details?.showroomOnline === true;
            return parsedArgs.is_online ? isOnline : !isOnline;
          });
        }

        return {
          success: true,
          data: { count: filtered.length, vehicles: filtered.slice(0, 20) },
          message: `🔍 **Zoekresultaten**

Gevonden: ${filtered.length} voertuigen

${filtered.slice(0, 15).map((v: any) => 
  `• ${v.brand} ${v.model} (${v.license_number || 'n/a'}) - ${v.status} - €${v.selling_price?.toLocaleString() || 'n/a'}`
).join('\n')}
${filtered.length > 15 ? `\n... en ${filtered.length - 15} meer` : ''}`
        };
      }

      case 'get_growth_strategy': {
        const { b2bMetrics, b2cMetrics, supplierRanking, brandPerformance } = ceoData;
        const focus = parsedArgs.focus || 'balanced';

        const topSuppliers = supplierRanking.filter((s: any) => s.avgMargin > 3000).slice(0, 3);
        const topBrands = brandPerformance.filter((b: any) => b.avgDaysToSell < 20 && b.avgDaysToSell > 0).slice(0, 3);
        const negativeSuppliers = supplierRanking.filter((s: any) => s.avgMargin < 0);

        return {
          success: true,
          data: { topSuppliers, topBrands, negativeSuppliers, b2bMetrics, b2cMetrics },
          message: `🚀 **10x Groei Strategie (Focus: ${focus})**

**1. Optimaliseer Leverancier Mix**
${topSuppliers.length > 0 
  ? `✅ Schaal op: ${topSuppliers.map((s: any) => `${s.name} (€${s.avgMargin.toLocaleString()} marge)`).join(', ')}`
  : '⚠️ Geen leveranciers met >€3k marge gevonden'}
${negativeSuppliers.length > 0 
  ? `❌ Stop inkoop bij: ${negativeSuppliers.map((s: any) => `${s.name} (€${s.avgMargin.toLocaleString()})`).join(', ')}`
  : ''}

**2. B2B vs B2C Strategie**
${focus === 'margin' 
  ? `Focus op B2C voor hogere marges (€${b2cMetrics.avgMargin.toLocaleString()} vs €${b2bMetrics.avgMargin.toLocaleString()})`
  : focus === 'volume'
  ? `Focus op B2B voor snellere omloop (${b2bMetrics.avgDaysToSell} vs ${b2cMetrics.avgDaysToSell} dagen)`
  : `Gebalanceerde mix: ${Math.round((b2bMetrics.totalSales / (b2bMetrics.totalSales + b2cMetrics.totalSales)) * 100)}% B2B, ${Math.round((b2cMetrics.totalSales / (b2bMetrics.totalSales + b2cMetrics.totalSales)) * 100)}% B2C`}

**3. Merk Focus**
${topBrands.length > 0 
  ? `Snelste verkopers (<20 dagen): ${topBrands.map((b: any) => `${b.brand} (${b.avgDaysToSell}d)`).join(', ')}`
  : 'Analyseer merkdata voor optimale mix'}

**4. Concrete Acties Deze Week**
1. Review leveranciers met negatieve marge
2. Zet alle binnenkomende auto's binnen 24 uur online
3. Focus inkoop op top 3 leveranciers
4. ${b2bMetrics.avgDaysToSell < 10 ? 'B2B draait goed - schaal volume op' : 'Verbeter B2B doorlooptijd'}`
        };
      }

      case 'get_transport_details': {
        const inTransport = ceoData.inTransportVehicles;
        const delayed = inTransport.filter((v: any) => {
          if (!v.purchase_date) return false;
          const days = Math.floor((Date.now() - new Date(v.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
          return days > THRESHOLDS.TRANSPORT_DAYS;
        });

        return {
          success: true,
          data: { total: inTransport.length, delayed: delayed.length },
          message: `📦 **Transport Overzicht**

Totaal onderweg: ${inTransport.length}
Vertraagd (>20 dagen): ${delayed.length}

${inTransport.slice(0, 10).map((v: any) => {
  const days = v.purchase_date 
    ? Math.floor((Date.now() - new Date(v.purchase_date).getTime()) / (1000 * 60 * 60 * 24))
    : '?';
  return `• ${v.brand} ${v.model} (${v.license_number || 'n/a'}) - ${days} dagen`;
}).join('\n')}
${inTransport.length > 10 ? `\n... en ${inTransport.length - 10} meer` : ''}
${inTransport.length === 0 ? '✅ Geen voertuigen onderweg' : ''}`
        };
      }

      case 'get_team_performance': {
        const teamData = ceoData.teamPerformanceWithMargins;
        
        if (!teamData || !teamData.ranking || teamData.ranking.length === 0) {
          // Fallback to old method
          const teamMembers = ['Daan', 'Martijn', 'Alex', 'Hendrik'];
          let report = '👥 **Team Performance (Recent)**\n\n';
          
          teamMembers.forEach(member => {
            const memberSales = ceoData.teamSales?.filter((s: any) => 
              s.salesperson_name?.toLowerCase().includes(member.toLowerCase())
            ) || [];
            const b2b = memberSales.reduce((sum: number, s: any) => sum + (s.b2b_sales || 0), 0);
            const b2c = memberSales.reduce((sum: number, s: any) => sum + (s.b2c_sales || 0), 0);
            report += `**${member}**: ${b2b} B2B, ${b2c} B2C (totaal: ${b2b + b2c})\n`;
          });
          
          return { success: true, message: report };
        }

        return {
          success: true,
          data: teamData,
          message: `👥 **Team Performance (met Marges)**

${teamData.ranking.map((m: any, i: number) => 
  `${i + 1}. **${m.name}**
   • Verkopen: ${m.totalSales} (${m.b2bSales} B2B, ${m.b2cSales} B2C)
   • Totale Marge: €${m.totalMargin.toLocaleString()}
   • Gem. Marge: €${m.avgMargin.toLocaleString()}
   • Omzet: €${m.totalRevenue.toLocaleString()}
`).join('\n')}

**📊 Team Totalen:**
• Totale Team Marge: €${teamData.totalTeamMargin.toLocaleString()}
• Totale Team Verkopen: ${teamData.totalTeamSales}

${teamData.topPerformer ? `🏆 **Top Performer**: ${teamData.topPerformer.name} met €${teamData.topPerformer.totalMargin.toLocaleString()} marge` : ''}`
        };
      }

      case 'get_slow_movers': {
        const minDays = parsedArgs.min_days || THRESHOLDS.SLOW_MOVER_DAYS;
        const slowAlert = ceoData.alerts.find((a: any) => a.type === 'slow_mover');
        
        if (slowAlert) {
          const filtered = slowAlert.vehicles.filter((v: any) => v.days >= minDays);
          return {
            success: true,
            message: `🐌 **Slow Movers (>${minDays} dagen)**

${filtered.slice(0, 15).map((v: any) => 
  `• ${v.brand} ${v.model} (${v.license || 'n/a'}) - ${v.days} dagen - €${v.price?.toLocaleString() || 'n/a'}`
).join('\n')}
${filtered.length > 15 ? `\n... en ${filtered.length - 15} meer` : ''}
${filtered.length === 0 ? `✅ Geen voertuigen >${minDays} dagen op voorraad` : ''}`
          };
        }
        return { success: true, message: '✅ Geen slow movers gevonden' };
      }

      case 'get_vehicles_not_online': {
        const notOnline = ceoData.notOnlineVehicles;
        return {
          success: true,
          data: { count: notOnline.length },
          message: `🌐 **Niet Online (${notOnline.length} voertuigen)**

${notOnline.slice(0, 15).map((v: any) => 
  `• ${v.brand} ${v.model} (${v.license_number || 'n/a'})`
).join('\n')}
${notOnline.length > 15 ? `\n... en ${notOnline.length - 15} meer` : ''}
${notOnline.length === 0 ? '✅ Alle binnenkomende voorraad is online' : ''}`
        };
      }

      case 'compare_periods': {
        const { period1, period2 } = parsedArgs;
        const vehicles = ceoData.allVehicles;
        
        // Helper to get period dates
        const getPeriodDates = (period: string) => {
          const now = new Date();
          const start = new Date();
          const end = new Date();
          
          switch (period) {
            case 'this_week':
              start.setDate(now.getDate() - now.getDay() + 1);
              start.setHours(0, 0, 0, 0);
              end.setTime(now.getTime());
              break;
            case 'last_week':
              start.setDate(now.getDate() - now.getDay() - 6);
              start.setHours(0, 0, 0, 0);
              end.setDate(now.getDate() - now.getDay());
              end.setHours(23, 59, 59, 999);
              break;
            case 'this_month':
              start.setDate(1);
              start.setHours(0, 0, 0, 0);
              end.setTime(now.getTime());
              break;
            case 'last_month':
              start.setMonth(now.getMonth() - 1);
              start.setDate(1);
              start.setHours(0, 0, 0, 0);
              end.setMonth(now.getMonth());
              end.setDate(0);
              end.setHours(23, 59, 59, 999);
              break;
            default:
              start.setDate(now.getDate() - 7);
              end.setTime(now.getTime());
          }
          return { start, end };
        };

        const p1Dates = getPeriodDates(period1);
        const p2Dates = getPeriodDates(period2);

        const getMetrics = (start: Date, end: Date) => {
          const sold = vehicles.filter((v: any) => {
            if (!['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'].includes(v.status)) return false;
            if (!v.sold_date) return false;
            const d = new Date(v.sold_date);
            return d >= start && d <= end;
          });

          let revenue = 0, profit = 0, b2b = 0, b2c = 0;
          sold.forEach((v: any) => {
            const sellingPrice = v.selling_price || 0;
            const purchasePrice = v.purchase_price || (v.details?.purchasePrice) || 0;
            revenue += sellingPrice;
            if (sellingPrice > 0 && purchasePrice > 0) profit += (sellingPrice - purchasePrice);
            if (v.status === 'verkocht_b2b') b2b++;
            else b2c++;
          });

          return {
            sales: sold.length,
            b2b,
            b2c,
            revenue,
            profit,
            avgMargin: sold.length > 0 ? Math.round(profit / sold.length) : 0,
          };
        };

        const m1 = getMetrics(p1Dates.start, p1Dates.end);
        const m2 = getMetrics(p2Dates.start, p2Dates.end);

        const salesChange = m2.sales > 0 ? Math.round(((m1.sales - m2.sales) / m2.sales) * 100) : 0;
        const profitChange = m2.profit > 0 ? Math.round(((m1.profit - m2.profit) / m2.profit) * 100) : 0;

        return {
          success: true,
          data: { period1: m1, period2: m2 },
          message: `📊 **Periode Vergelijking: ${period1} vs ${period2}**

| Metric | ${period1} | ${period2} | Verschil |
|--------|------------|------------|----------|
| Verkopen | ${m1.sales} | ${m2.sales} | ${salesChange > 0 ? '+' : ''}${salesChange}% |
| B2B | ${m1.b2b} | ${m2.b2b} | ${m1.b2b - m2.b2b} |
| B2C | ${m1.b2c} | ${m2.b2c} | ${m1.b2c - m2.b2c} |
| Winst | €${m1.profit.toLocaleString()} | €${m2.profit.toLocaleString()} | ${profitChange > 0 ? '+' : ''}${profitChange}% |
| Gem. Marge | €${m1.avgMargin.toLocaleString()} | €${m2.avgMargin.toLocaleString()} | €${(m1.avgMargin - m2.avgMargin).toLocaleString()} |

**💡 Conclusie**: ${profitChange >= 0 
  ? `Goede groei! Winst ${profitChange > 0 ? `+${profitChange}%` : 'stabiel'} vergeleken met ${period2}.`
  : `Let op: winst ${profitChange}% lager dan ${period2}. Analyseer de oorzaak.`}`
        };
      }

      case 'get_trends_analysis': {
        const trends = ceoData.trendsAndPatterns;
        const focus = parsedArgs.focus || 'all';

        let message = '📈 **Trends & Patronen Analyse**\n\n';

        if (focus === 'all' || focus === 'seasonal') {
          message += `**Seizoenspatronen (laatste 6 maanden)**\n${
            trends.monthlyPatterns.slice(0, 6).map((m: any) => 
              `• ${m.month}: ${m.sales} verkopen, €${m.profit.toLocaleString()} winst`
            ).join('\n')
          }\n\n`;
        }

        if (focus === 'all' || focus === 'price_ranges') {
          message += `**Best Verkopende Prijsklassen**\n${
            trends.priceRanges.filter((p: any) => p.sales > 0)
              .sort((a: any, b: any) => b.sales - a.sales)
              .map((p: any) => `• ${p.range}: ${p.sales} verkopen, gem. ${p.avgDays} dagen`)
              .join('\n')
          }\n\n`;
        }

        if (focus === 'all' || focus === 'colors') {
          message += `**Populaire Kleuren**\n${
            trends.popularColors.map((c: any) => `• ${c.color}: ${c.count}x verkocht`).join('\n')
          }\n\n`;
        }

        if (focus === 'all' || focus === 'fuel') {
          message += `**Brandstof Verdeling**\n${
            trends.fuelTypeDistribution.map((f: any) => `• ${f.fuel}: ${f.percentage}% (${f.count}x)`).join('\n')
          }\n\n`;
        }

        message += `**Week-over-Week Groei**: ${trends.weekOverWeekGrowth.growthPercentage > 0 ? '+' : ''}${trends.weekOverWeekGrowth.growthPercentage}% (${trends.weekOverWeekGrowth.thisWeek} vs ${trends.weekOverWeekGrowth.lastWeek})`;

        return { success: true, data: trends, message };
      }

      case 'get_stock_aging': {
        const sortBy = parsedArgs.sort_by || 'days';
        
        let stockBrands = ceoData.brandPerformance.filter((b: any) => b.onStock > 0);
        
        if (sortBy === 'days') {
          stockBrands = stockBrands.sort((a: any, b: any) => b.avgDaysOnStock - a.avgDaysOnStock);
        } else {
          stockBrands = stockBrands.sort((a: any, b: any) => b.onStock - a.onStock);
        }

        const critical = stockBrands.filter((b: any) => b.avgDaysOnStock > 50);
        const warning = stockBrands.filter((b: any) => b.avgDaysOnStock > 30 && b.avgDaysOnStock <= 50);

        return {
          success: true,
          data: { stockBrands, critical, warning },
          message: `📦 **Voorraad Aging per Merk** (gesorteerd op ${sortBy === 'days' ? 'dagen' : 'aantal'})

${stockBrands.slice(0, 10).map((b: any, i: number) => 
  `${i + 1}. **${b.brand}**: ${b.onStock} op voorraad, gem. ${b.avgDaysOnStock} dagen${b.avgDaysOnStock > 50 ? ' 🔴' : b.avgDaysOnStock > 30 ? ' 🟡' : ' 🟢'}`
).join('\n')}

${critical.length > 0 ? `\n🔴 **Kritiek (>50 dagen)**: ${critical.map((b: any) => b.brand).join(', ')}` : ''}
${warning.length > 0 ? `\n🟡 **Waarschuwing (>30 dagen)**: ${warning.map((b: any) => b.brand).join(', ')}` : ''}

**💡 Advies**: ${critical.length > 0 
  ? `Focus prijsacties op ${critical[0].brand} - gemiddeld ${critical[0].avgDaysOnStock} dagen op voorraad.`
  : 'Voorraad veroudering onder controle.'}`
        };
      }

      default:
        return { success: false, error: `Unknown function: ${name}` };
    }
  } catch (error) {
    console.error(`CEO function error (${name}):`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
