import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface DealerLookupResult {
  success: boolean;
  dealerName: string;
  lookupLicensePlate: string;
  totalVehicles: number;
  inStock: DealerVehicle[];
  sold: DealerVehicle[];
  stats: {
    avgPrice: number;
    avgStockDays: number;
    soldLast30Days: number;
    topBrands: { brand: string; count: number }[];
  };
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licensePlate } = await req.json();
    
    if (!licensePlate) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kenteken is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const JPCARS_API_TOKEN = Deno.env.get('JPCARS_API_TOKEN');
    if (!JPCARS_API_TOKEN) {
      throw new Error('JP Cars API token not configured');
    }

    console.log(`[Dealer Lookup] Starting lookup for license plate: ${licensePlate}`);

    // Step 1: Get RDW data first
    const rdwUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${licensePlate.replace(/-/g, '').toUpperCase()}`;
    const rdwResponse = await fetch(rdwUrl);
    const rdwData = await rdwResponse.json();

    if (!rdwData || rdwData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kenteken niet gevonden in RDW' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vehicle = rdwData[0];
    const brand = vehicle.merk || '';
    const model = vehicle.handelsbenaming || '';
    const buildYear = parseInt(vehicle.datum_eerste_toelating?.substring(0, 4) || '2020');
    
    // Get mileage from fuel data (RDW brandstof endpoint for last APK)
    let mileage = 100000; // Default
    try {
      const fuelUrl = `https://opendata.rdw.nl/resource/8ys7-d773.json?kenteken=${licensePlate.replace(/-/g, '').toUpperCase()}`;
      const fuelResponse = await fetch(fuelUrl);
      const fuelData = await fuelResponse.json();
      if (fuelData && fuelData.length > 0) {
        // Try to estimate mileage from APK data or use default
        const currentYear = new Date().getFullYear();
        const vehicleAge = currentYear - buildYear;
        mileage = vehicleAge * 15000; // Estimate 15k per year
      }
    } catch (e) {
      console.log('[Dealer Lookup] Could not get fuel data, using estimated mileage');
    }

    console.log(`[Dealer Lookup] Vehicle: ${brand} ${model} (${buildYear}), estimated mileage: ${mileage}`);

    // Step 2: Call JP Cars valuate/extended endpoint
    const jpCarsUrl = 'https://jpcars.nl/api/valuate/extended';
    const jpCarsBody = {
      make: brand.toUpperCase(),
      model: model.toUpperCase(),
      build: buildYear,
      mileage: mileage,
      plate: licensePlate.replace(/-/g, '').toUpperCase(),
    };

    console.log(`[Dealer Lookup] Calling JP Cars API with:`, jpCarsBody);

    const jpCarsResponse = await fetch(jpCarsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JPCARS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jpCarsBody),
    });

    if (!jpCarsResponse.ok) {
      const errorText = await jpCarsResponse.text();
      console.error(`[Dealer Lookup] JP Cars API error:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `JP Cars API fout: ${jpCarsResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jpCarsData = await jpCarsResponse.json();
    console.log(`[Dealer Lookup] JP Cars response received, window size: ${jpCarsData.window?.length || 0}`);

    // Step 3: Find the dealer from the window data
    const windowData = jpCarsData.window || [];
    
    // Find the entry that matches our license plate to get the dealer name
    const targetVehicle = windowData.find((v: any) => {
      const plateFromWindow = v.plate || v.license_plate || '';
      return plateFromWindow.replace(/-/g, '').toUpperCase() === licensePlate.replace(/-/g, '').toUpperCase();
    });

    if (!targetVehicle || !targetVehicle.dealer_name) {
      // Try to find any dealer from the window
      const anyDealerVehicle = windowData.find((v: any) => v.dealer_name);
      
      if (!anyDealerVehicle) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Geen dealer informatie gevonden voor dit kenteken. Mogelijk is het voertuig niet actief bij een dealer.',
            windowSize: windowData.length 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[Dealer Lookup] License plate not found in window, but found ${windowData.length} comparable vehicles`);
    }

    const dealerName = targetVehicle?.dealer_name || '';
    console.log(`[Dealer Lookup] Target dealer: "${dealerName}"`);

    // Step 4: Filter all window vehicles by this dealer
    const dealerVehicles = dealerName 
      ? windowData.filter((v: any) => v.dealer_name === dealerName)
      : windowData;

    console.log(`[Dealer Lookup] Found ${dealerVehicles.length} vehicles for dealer "${dealerName}"`);

    // Step 5: Process and categorize vehicles
    const inStock: DealerVehicle[] = [];
    const sold: DealerVehicle[] = [];

    for (const v of dealerVehicles) {
      const vehicle: DealerVehicle = {
        licensePlate: v.plate || v.license_plate || '',
        brand: v.make || '',
        model: v.model || '',
        buildYear: v.build || 0,
        mileage: v.mileage || 0,
        price: v.price_local || v.price || 0,
        stockDays: v.days_in_stock || 0,
        soldSince: v.sold_since || null,
        fuel: v.fuel || '',
        body: v.body || '',
        url: v.url || '',
        clicks: v.clicks || 0,
        apr: v.apr || 0,
      };

      if (v.sold_since !== null && v.sold_since !== undefined) {
        sold.push(vehicle);
      } else {
        inStock.push(vehicle);
      }
    }

    // Sort by stock days / sold days
    inStock.sort((a, b) => b.stockDays - a.stockDays);
    sold.sort((a, b) => (a.soldSince || 0) - (b.soldSince || 0));

    // Calculate stats
    const allVehicles = [...inStock, ...sold];
    const avgPrice = allVehicles.length > 0 
      ? Math.round(allVehicles.reduce((sum, v) => sum + v.price, 0) / allVehicles.length)
      : 0;
    const avgStockDays = inStock.length > 0
      ? Math.round(inStock.reduce((sum, v) => sum + v.stockDays, 0) / inStock.length)
      : 0;
    const soldLast30Days = sold.filter(v => (v.soldSince || 0) <= 30).length;

    // Top brands
    const brandCounts = allVehicles.reduce((acc: Record<string, number>, v) => {
      acc[v.brand] = (acc[v.brand] || 0) + 1;
      return acc;
    }, {});
    const topBrands = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const result: DealerLookupResult = {
      success: true,
      dealerName: dealerName || 'Onbekende dealer',
      lookupLicensePlate: licensePlate,
      totalVehicles: allVehicles.length,
      inStock,
      sold,
      stats: {
        avgPrice,
        avgStockDays,
        soldLast30Days,
        topBrands,
      },
      message: dealerName 
        ? `Dealer "${dealerName}" gevonden via kenteken ${licensePlate}. ${allVehicles.length} vergelijkbare voertuigen in de window data.`
        : `Kenteken niet direct gekoppeld aan dealer, maar ${allVehicles.length} vergelijkbare voertuigen gevonden.`,
    };

    console.log(`[Dealer Lookup] Success! Dealer: "${dealerName}", In stock: ${inStock.length}, Sold: ${sold.length}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Dealer Lookup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
