import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DealerSearchRequest {
  dealerName: string;
  includeSold?: boolean;
  pageSize?: number;
}

interface JPCarsVehicle {
  license_plate: string;
  make: string;
  model: string;
  build_year: number;
  mileage: number;
  price_local: number;
  stock_days: number;
  sold_since: number | null;
  fuel: string;
  body: string;
  url: string;
  clicks: number;
  apr: number;
  dealer_name: string;
}

interface DealerVehicle {
  licensePlate: string;
  brand: string;
  model: string;
  buildYear: number;
  mileage: number;
  price: number;
  stockDays: number;
  soldSince: number | null;
  fuel: string;
  body: string;
  url: string;
  clicks: number;
  apr: number;
}

interface DealerSearchResult {
  dealerName: string;
  searchQuery: string;
  totalVehicles: number;
  inStock: DealerVehicle[];
  sold: DealerVehicle[];
  uniqueDealers: { name: string; count: number }[];
  stats: {
    avgPrice: number;
    avgStockDays: number;
    soldLast30Days: number;
    topBrands: { brand: string; count: number }[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealerName, includeSold = true, pageSize = 200 } = await req.json() as DealerSearchRequest;

    if (!dealerName || dealerName.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Dealer naam moet minimaal 2 karakters zijn' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiToken = Deno.env.get('JPCARS_API_TOKEN');
    if (!apiToken) {
      console.error('JPCARS_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'JP Cars API niet geconfigureerd' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching dealer: "${dealerName}", includeSold: ${includeSold}, pageSize: ${pageSize}`);

    // Build the API URL with dealer_name filter
    const params = new URLSearchParams({
      dealer_name: dealerName.trim(),
      include_sold: includeSold.toString(),
      page_size: pageSize.toString(),
      page_index: '0'
    });

    const apiUrl = `https://api.nl.jp.cars/api/cars/list?${params.toString()}`;
    console.log(`Calling JP Cars API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JP Cars API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `JP Cars API fout: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`JP Cars returned ${data?.length || 0} vehicles`);

    // Handle empty results
    if (!data || !Array.isArray(data) || data.length === 0) {
      const emptyResult: DealerSearchResult = {
        dealerName: dealerName,
        searchQuery: dealerName,
        totalVehicles: 0,
        inStock: [],
        sold: [],
        uniqueDealers: [],
        stats: {
          avgPrice: 0,
          avgStockDays: 0,
          soldLast30Days: 0,
          topBrands: []
        }
      };
      return new Response(JSON.stringify(emptyResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform and split vehicles
    const vehicles: DealerVehicle[] = data.map((v: JPCarsVehicle) => ({
      licensePlate: v.license_plate || '',
      brand: v.make || '',
      model: v.model || '',
      buildYear: v.build_year || 0,
      mileage: v.mileage || 0,
      price: v.price_local || 0,
      stockDays: v.stock_days || 0,
      soldSince: v.sold_since,
      fuel: v.fuel || '',
      body: v.body || '',
      url: v.url || '',
      clicks: v.clicks || 0,
      apr: v.apr || 0
    }));

    // Split into in-stock and sold
    const inStock = vehicles.filter(v => v.soldSince === null || v.soldSince === undefined);
    const sold = vehicles.filter(v => v.soldSince !== null && v.soldSince !== undefined);

    // Calculate statistics
    const allPrices = vehicles.filter(v => v.price > 0).map(v => v.price);
    const avgPrice = allPrices.length > 0 
      ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) 
      : 0;

    const inStockDays = inStock.filter(v => v.stockDays > 0).map(v => v.stockDays);
    const avgStockDays = inStockDays.length > 0 
      ? Math.round(inStockDays.reduce((a, b) => a + b, 0) / inStockDays.length) 
      : 0;

    // Count sold in last 30 days
    const soldLast30Days = sold.filter(v => v.soldSince !== null && v.soldSince <= 30).length;

    // Calculate top brands
    const brandCounts: Record<string, number> = {};
    vehicles.forEach(v => {
      if (v.brand) {
        brandCounts[v.brand] = (brandCounts[v.brand] || 0) + 1;
      }
    });
    
    const topBrands = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get unique dealers from results
    const dealerCounts: Record<string, number> = {};
    data.forEach((v: JPCarsVehicle) => {
      if (v.dealer_name) {
        dealerCounts[v.dealer_name] = (dealerCounts[v.dealer_name] || 0) + 1;
      }
    });
    
    const uniqueDealers = Object.entries(dealerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Get actual dealer name - use the most common one if multiple
    const actualDealerName = uniqueDealers.length > 0 ? uniqueDealers[0].name : dealerName;

    console.log(`Found ${uniqueDealers.length} unique dealers:`, uniqueDealers.map(d => d.name));

    const result: DealerSearchResult = {
      dealerName: actualDealerName,
      searchQuery: dealerName,
      totalVehicles: vehicles.length,
      inStock: inStock.sort((a, b) => a.stockDays - b.stockDays),
      sold: sold.sort((a, b) => (a.soldSince || 0) - (b.soldSince || 0)),
      uniqueDealers,
      stats: {
        avgPrice,
        avgStockDays,
        soldLast30Days,
        topBrands
      }
    };

    console.log(`Returning: ${inStock.length} in stock, ${sold.length} sold, avgPrice: €${avgPrice}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in jpcars-dealer-search:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Onbekende fout bij dealer zoeken' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
