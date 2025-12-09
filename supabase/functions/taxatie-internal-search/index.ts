import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleData {
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  power: number;
  trim: string;
  color: string;
  options: string[];
}

interface SimilarVehicleSale {
  id: string;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  purchasePrice: number;
  sellingPrice: number;
  margin: number;
  daysToSell: number;
  channel: 'B2B' | 'B2C';
  soldAt: string;
}

interface InternalComparison {
  averageMargin: number;
  averageDaysToSell: number;
  soldLastYear: number;
  soldB2C: number;
  soldB2B: number;
  averageDaysToSell_B2C: number | null;
  note: string;
  similarVehicles: SimilarVehicleSale[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleData } = await req.json() as { vehicleData: VehicleData };
    
    console.log('🔍 Internal search for:', vehicleData.brand, vehicleData.model);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date 12 months ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoISO = oneYearAgo.toISOString();

    // Extract first word of model for matching (e.g., "Ioniq 5" from "Ioniq 5 73 kWh Lounge")
    const modelSearchTerm = vehicleData.model.split(' ').slice(0, 2).join(' ').trim();
    console.log(`🔎 Searching for model containing: "${modelSearchTerm}"`);

    // First attempt: search by brand + model
    let { data: soldVehicles, error } = await supabase
      .from('vehicles')
      .select('id, brand, model, year, mileage, purchase_price, selling_price, sold_date, purchase_date, status')
      .in('status', ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'])
      .ilike('brand', vehicleData.brand)
      .ilike('model', `%${modelSearchTerm}%`)
      .gte('sold_date', oneYearAgoISO)
      .not('purchase_price', 'is', null)
      .not('selling_price', 'is', null)
      .order('sold_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    let searchedByModel = true;
    const modelMatchCount = soldVehicles?.length || 0;
    console.log(`📊 Found ${modelMatchCount} sold vehicles matching "${vehicleData.brand} ${modelSearchTerm}"`);

    // Fallback: if <2 model matches, search by brand only
    if (modelMatchCount < 2) {
      console.log('⚠️ Te weinig model-matches, fallback naar merk-zoeken');
      searchedByModel = false;

      const fallbackResult = await supabase
        .from('vehicles')
        .select('id, brand, model, year, mileage, purchase_price, selling_price, sold_date, purchase_date, status')
        .in('status', ['verkocht_b2b', 'verkocht_b2c', 'afgeleverd'])
        .ilike('brand', vehicleData.brand)
        .gte('sold_date', oneYearAgoISO)
        .not('purchase_price', 'is', null)
        .not('selling_price', 'is', null)
        .order('sold_date', { ascending: false })
        .limit(20);

      if (fallbackResult.error) {
        console.error('❌ Fallback query error:', fallbackResult.error);
      } else {
        soldVehicles = fallbackResult.data;
        console.log(`📊 Fallback: Found ${soldVehicles?.length || 0} ${vehicleData.brand} vehicles (all models)`);
      }
    }

    // Process the results
    const similarVehicles: SimilarVehicleSale[] = [];
    let totalMargin = 0;
    let totalDaysToSell = 0;
    let validCount = 0;

    for (const vehicle of (soldVehicles || [])) {
      const purchasePrice = Number(vehicle.purchase_price);
      const sellingPrice = Number(vehicle.selling_price);
      
      if (purchasePrice <= 0 || sellingPrice <= 0) continue;

      const margin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;

      let daysToSell = 21;
      if (vehicle.sold_date && vehicle.purchase_date) {
        const soldDate = new Date(vehicle.sold_date);
        const purchaseDate = new Date(vehicle.purchase_date);
        const diffTime = Math.abs(soldDate.getTime() - purchaseDate.getTime());
        daysToSell = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysToSell > 365) daysToSell = 365;
        if (daysToSell < 1) daysToSell = 1;
      }

      const channel: 'B2B' | 'B2C' = vehicle.status === 'verkocht_b2b' ? 'B2B' : 'B2C';

      similarVehicles.push({
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        buildYear: vehicle.year || vehicleData.buildYear,
        mileage: vehicle.mileage || 0,
        purchasePrice,
        sellingPrice,
        margin: Math.round(margin * 10) / 10,
        daysToSell,
        channel,
        soldAt: vehicle.sold_date || new Date().toISOString(),
      });

      totalMargin += margin;
      totalDaysToSell += daysToSell;
      validCount++;
    }

    const b2cVehicles = similarVehicles.filter(v => v.channel === 'B2C');
    const b2bVehicles = similarVehicles.filter(v => v.channel === 'B2B');

    const averageMargin = validCount > 0 ? Math.round((totalMargin / validCount) * 10) / 10 : 18;
    const averageDaysToSell = validCount > 0 ? Math.round(totalDaysToSell / validCount) : 21;

    const b2cDaysSum = b2cVehicles.reduce((sum, v) => sum + v.daysToSell, 0);
    const averageDaysToSell_B2C = b2cVehicles.length > 0 
      ? Math.round(b2cDaysSum / b2cVehicles.length) 
      : null;

    // Build descriptive note based on search method
    const searchDescription = searchedByModel
      ? `Gezocht op: ${vehicleData.brand} ${modelSearchTerm}`
      : `⚠️ Te weinig "${modelSearchTerm}" data - alle ${vehicleData.brand} modellen getoond`;

    const internalComparison: InternalComparison = {
      averageMargin,
      averageDaysToSell,
      soldLastYear: validCount,
      soldB2C: b2cVehicles.length,
      soldB2B: b2bVehicles.length,
      averageDaysToSell_B2C,
      note: `${searchDescription}. B2B verkopen (${b2bVehicles.length}x) niet meegeteld voor statijd. Gebruik JP Cars ETR als primaire bron.`,
      similarVehicles: similarVehicles.slice(0, 10),
    };

    console.log('✅ Internal comparison complete:', {
      searchedByModel,
      modelSearchTerm,
      soldLastYear: validCount,
      soldB2C: b2cVehicles.length,
      soldB2B: b2bVehicles.length,
      averageMargin: `${averageMargin}%`,
      averageDaysToSell_B2C: averageDaysToSell_B2C ? `${averageDaysToSell_B2C} dagen` : 'geen B2C data'
    });

    return new Response(JSON.stringify({
      success: true,
      data: internalComparison
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Internal search error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal search failed',
      data: {
        averageMargin: 18,
        averageDaysToSell: 21,
        soldLastYear: 0,
        similarVehicles: []
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
