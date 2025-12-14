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
  matchedVariant: string | null;
  triedVariants: string[];
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

// Generate search variants from dealer name
const generateSearchVariants = (dealerName: string): string[] => {
  const variants: string[] = [];
  const original = dealerName.trim();
  
  // 1. Original query
  variants.push(original);
  
  // 2. Remove common prefixes
  const prefixPatterns = [
    /^(autobedrijf|autogroep|automobielbedrijf|garage|autocentrum|autohuis)\s+/i,
    /^(auto\s+)/i,
  ];
  
  let cleaned = original;
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove common suffixes
  cleaned = cleaned
    .replace(/\s+(b\.?v\.?|bv|v\.?o\.?f\.?|vof)$/i, '')
    .replace(/\s+(automotive|auto's|autos)$/i, '')
    .trim();
  
  if (cleaned !== original && cleaned.length >= 2) {
    variants.push(cleaned);
  }
  
  // 3. Extract words
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  
  // 4. Last word only (usually the surname/main name)
  if (words.length > 1) {
    const lastName = words[words.length - 1];
    if (lastName.length >= 3) {
      variants.push(lastName);
    }
  }
  
  // 5. All words concatenated (lowercase, no spaces) - website format
  const noSpaces = cleaned.replace(/\s+/g, '').toLowerCase();
  if (noSpaces.length >= 3 && noSpaces !== cleaned.toLowerCase()) {
    variants.push(noSpaces);
  }
  
  // 6. With "autos" suffix (common in NL dealer websites)
  if (noSpaces.length >= 3 && !noSpaces.endsWith('autos') && !noSpaces.endsWith('auto')) {
    variants.push(`${noSpaces}autos`);
  }
  
  // 7. Last word + "autos"
  if (words.length > 0) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (lastWord.length >= 3 && !lastWord.endsWith('autos')) {
      variants.push(`${lastWord}autos`);
    }
  }
  
  // 8. Without initials (e.g., "A. van Rijswijk" -> "van Rijswijk")
  const withoutInitials = cleaned.replace(/^[A-Z]\.?\s+/g, '').trim();
  if (withoutInitials !== cleaned && withoutInitials.length >= 3) {
    variants.push(withoutInitials);
    // Also concatenated version
    const concatWithoutInitials = withoutInitials.replace(/\s+/g, '').toLowerCase();
    if (concatWithoutInitials.length >= 3) {
      variants.push(concatWithoutInitials);
    }
  }
  
  // Return unique variants
  return [...new Set(variants)];
};

// Search with a single variant
const searchWithVariant = async (
  variant: string, 
  apiToken: string, 
  includeSold: boolean, 
  pageSize: number
): Promise<JPCarsVehicle[] | null> => {
  const params = new URLSearchParams({
    dealer_name: variant,
    include_sold: includeSold.toString(),
    page_size: pageSize.toString(),
    page_index: '0'
  });

  const apiUrl = `https://api.nl.jp.cars/api/cars/list?${params.toString()}`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Variant "${variant}" failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching variant "${variant}":`, error);
    return null;
  }
};

serve(async (req) => {
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

    // Generate search variants
    const variants = generateSearchVariants(dealerName);
    console.log(`Search query: "${dealerName}"`);
    console.log(`Generated ${variants.length} variants:`, variants);

    // Try each variant until we find results
    let data: JPCarsVehicle[] | null = null;
    let matchedVariant: string | null = null;
    const triedVariants: string[] = [];

    for (const variant of variants) {
      console.log(`Trying variant: "${variant}"...`);
      triedVariants.push(variant);
      
      const result = await searchWithVariant(variant, apiToken, includeSold, pageSize);
      
      if (result && result.length > 0) {
        console.log(`✓ Found ${result.length} vehicles with variant: "${variant}"`);
        data = result;
        matchedVariant = variant;
        break;
      } else {
        console.log(`✗ No results for variant: "${variant}"`);
      }
    }

    // Handle empty results
    if (!data || data.length === 0) {
      console.log(`No results found for any variant of: "${dealerName}"`);
      const emptyResult: DealerSearchResult = {
        dealerName: dealerName,
        searchQuery: dealerName,
        matchedVariant: null,
        triedVariants,
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

    const actualDealerName = uniqueDealers.length > 0 ? uniqueDealers[0].name : dealerName;

    console.log(`Found ${uniqueDealers.length} unique dealers:`, uniqueDealers.map(d => d.name));
    console.log(`Matched variant: "${matchedVariant}" → Dealer: "${actualDealerName}"`);

    const result: DealerSearchResult = {
      dealerName: actualDealerName,
      searchQuery: dealerName,
      matchedVariant,
      triedVariants,
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
