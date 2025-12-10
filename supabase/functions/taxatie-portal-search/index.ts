import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  keywords?: string[];
}

interface JPCarsPortalUrls {
  gaspedaal?: string | null;
  autoscout24?: string | null;
  marktplaats?: string | null;
  jpCarsWindow?: string | null;
}

// JP Cars Window item from their API
interface JPCarsWindowItem {
  make?: string;
  model?: string;
  price_local?: number;
  mileage?: number;
  build?: number;
  url?: string;
  dealer_name?: string;
  days_in_stock?: number;
  sold_since?: number;
  options?: string[];
}

interface PortalListing {
  id: string;
  portal: string;
  title: string;
  price: number;
  mileage: number;
  buildYear: number;
  url: string;
  options: string[];
  color?: string;
  isPrimaryComparable: boolean;
  isLogicalDeviation: boolean;
  matchScore: number;
  deviationReason?: string;
}

// Parse filters from a Gaspedaal URL
function parseGaspedaalUrl(url: string): { 
  buildYearFrom?: number; 
  buildYearTo?: number; 
  mileageMax?: number;
  fuelType?: string;
} {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    return {
      buildYearFrom: params.get('bmin') ? parseInt(params.get('bmin')!) : undefined,
      buildYearTo: params.get('bmax') ? parseInt(params.get('bmax')!) : undefined,
      mileageMax: params.get('kmmax') ? parseInt(params.get('kmmax')!) : undefined,
      fuelType: params.get('brandstof') || undefined,
    };
  } catch {
    return {};
  }
}

// Build Gaspedaal search URL from vehicle data (fallback)
function buildGaspedaalUrl(vehicleData: VehicleData): string {
  const brandSlug = vehicleData.brand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = vehicleData.model.toLowerCase().replace(/\s+/g, '-');
  
  const yearFrom = vehicleData.buildYear - 1;
  const yearTo = vehicleData.buildYear + 1;
  const mileageMax = Math.ceil(vehicleData.mileage * 1.15 / 1000) * 1000;
  
  let url = `https://www.gaspedaal.nl/${brandSlug}/${modelSlug}`;
  
  const params = new URLSearchParams();
  params.set('bmin', yearFrom.toString());
  params.set('bmax', yearTo.toString());
  params.set('kmmax', mileageMax.toString());
  params.set('sort', 'prijs-oplopend');
  
  if (vehicleData.fuelType) {
    const fuelMap: Record<string, string> = {
      'Benzine': 'benzine',
      'Diesel': 'diesel',
      'Hybride': 'hybride',
      'Elektrisch': 'elektrisch',
      'LPG': 'lpg',
    };
    if (fuelMap[vehicleData.fuelType]) {
      params.set('brandstof', fuelMap[vehicleData.fuelType]);
    }
  }
  
  return `${url}?${params.toString()}`;
}

function calculateMaxMileage(mileage: number): number {
  return Math.ceil(mileage * 1.15 / 1000) * 1000;
}

// Calculate match score based on vehicle comparison
function calculateMatchScore(listing: any, vehicleData: VehicleData): number {
  let score = 100;
  
  // Year difference penalty (5 points per year)
  const yearDiff = Math.abs((listing.buildYear || vehicleData.buildYear) - vehicleData.buildYear);
  score -= yearDiff * 5;
  
  // Mileage difference penalty (1 point per 5000km difference)
  const mileageDiff = Math.abs((listing.mileage || vehicleData.mileage) - vehicleData.mileage);
  score -= Math.floor(mileageDiff / 5000);
  
  return Math.max(0, Math.min(100, score));
}

// Determine if listing is a primary comparable
function isPrimaryComparable(listing: any, vehicleData: VehicleData): boolean {
  const yearDiff = Math.abs((listing.buildYear || vehicleData.buildYear) - vehicleData.buildYear);
  const mileageDiff = Math.abs((listing.mileage || vehicleData.mileage) - vehicleData.mileage);
  const mileageBuffer = vehicleData.mileage * 0.15;
  
  return yearDiff <= 1 && mileageDiff <= mileageBuffer;
}

// Determine if listing has logical deviation
function hasLogicalDeviation(listing: any, vehicleData: VehicleData): { isDeviation: boolean; reason?: string } {
  const mileageMax = vehicleData.mileage * 1.15;
  
  if (listing.mileage > mileageMax * 1.5) {
    return { isDeviation: true, reason: `Zeer hoge km-stand (${listing.mileage?.toLocaleString('nl-NL')} km)` };
  }
  
  const yearDiff = Math.abs((listing.buildYear || vehicleData.buildYear) - vehicleData.buildYear);
  if (yearDiff > 2) {
    return { isDeviation: true, reason: `Bouwjaar wijkt sterk af (${listing.buildYear})` };
  }
  
  return { isDeviation: false };
}

// Robust JSON parsing with multiple recovery strategies
function parseJsonRobust(text: string): any {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    console.log('📝 Direct parse failed, trying recovery...');
  }
  
  // Strategy 2: Clean common issues
  try {
    const cleaned = text
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('📝 Cleaned parse failed, trying truncation...');
  }
  
  // Strategy 3: Try to find and fix truncated JSON
  try {
    let fixed = text;
    // Count brackets
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    
    // Add missing closing brackets/braces
    fixed = fixed.replace(/,\s*$/, ''); // Remove trailing comma
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    
    return JSON.parse(fixed);
  } catch (e) {
    console.log('📝 Truncation fix failed, trying listing extraction...');
  }
  
  // Strategy 4: Extract individual listings with regex
  try {
    const listingsMatch = text.match(/"listings"\s*:\s*\[([\s\S]*)/);
    if (listingsMatch) {
      const listingsContent = listingsMatch[1];
      const listings: any[] = [];
      
      // Find each object in the listings array
      const objectMatches = listingsContent.matchAll(/\{[^{}]*"title"[^{}]*"price"[^{}]*\}/g);
      for (const match of objectMatches) {
        try {
          const obj = JSON.parse(match[0]);
          if (obj.price && obj.title) {
            listings.push(obj);
          }
        } catch (e) {
          // Skip malformed listing
        }
      }
      
      if (listings.length > 0) {
        console.log(`📝 Extracted ${listings.length} listings via regex`);
        return { listings, extractedViaRegex: true };
      }
    }
  } catch (e) {
    console.log('📝 Regex extraction failed');
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleData, jpCarsUrls, jpCarsWindow } = await req.json() as { 
      vehicleData: VehicleData; 
      jpCarsUrls?: JPCarsPortalUrls;
      jpCarsWindow?: JPCarsWindowItem[];
    };
    
    console.log('🔍 Portal search for:', vehicleData.brand, vehicleData.model, vehicleData.trim);
    console.log('📊 JP Cars Window items received:', jpCarsWindow?.length || 0);

    // Build filter info
    const gaspedaalUrl = jpCarsUrls?.gaspedaal || buildGaspedaalUrl(vehicleData);
    const urlSource = jpCarsUrls?.gaspedaal ? 'JP Cars' : 'Self-calculated';
    const jpCarsWindowUrl = jpCarsUrls?.jpCarsWindow || null;

    // Parse filters from the ACTUAL URL being used
    const parsedFilters = parseGaspedaalUrl(gaspedaalUrl);
    
    // Fallback values if URL parsing fails
    const fallbackYearFrom = vehicleData.buildYear - 1;
    const fallbackYearTo = vehicleData.buildYear + 1;
    const fallbackMileageMax = calculateMaxMileage(vehicleData.mileage);
    
    // Use parsed filters from URL, fallback to calculated values
    const appliedFilters = {
      brand: vehicleData.brand,
      model: vehicleData.model,
      buildYearFrom: parsedFilters.buildYearFrom || fallbackYearFrom,
      buildYearTo: parsedFilters.buildYearTo || fallbackYearTo,
      mileageMax: parsedFilters.mileageMax || fallbackMileageMax,
      fuelType: parsedFilters.fuelType || vehicleData.fuelType,
      transmission: vehicleData.transmission,
      bodyType: vehicleData.bodyType,
      keywords: vehicleData.keywords || [],
      requiredOptions: vehicleData.options || [],
    };

    const directSearchUrls = {
      gaspedaal: gaspedaalUrl,
      autoscout24: jpCarsUrls?.autoscout24 || null,
      marktplaats: jpCarsUrls?.marktplaats || null,
      jpCarsWindow: jpCarsWindowUrl,
    };

    // ============================================
    // PRIMARY: Use JP Cars Window data if available
    // ============================================
    if (jpCarsWindow && jpCarsWindow.length > 0) {
      console.log('✅ Using JP Cars Window data (primary source)');
      console.log('📊 Processing', jpCarsWindow.length, 'listings from JP Cars');

      // Transform JP Cars window data to our listing format
      const listings: PortalListing[] = jpCarsWindow
        .filter((item) => item.price_local && item.price_local > 0)
        .slice(0, 50) // Limit to 50 for performance
        .map((item, index) => {
          const matchScore = calculateMatchScore({
            buildYear: item.build || vehicleData.buildYear,
            mileage: item.mileage || vehicleData.mileage,
          }, vehicleData);
          
          const isPrimary = isPrimaryComparable({
            buildYear: item.build || vehicleData.buildYear,
            mileage: item.mileage || vehicleData.mileage,
          }, vehicleData);
          
          const deviation = hasLogicalDeviation({
            buildYear: item.build || vehicleData.buildYear,
            mileage: item.mileage || vehicleData.mileage,
          }, vehicleData);

          return {
            id: `jpcars-${index + 1}`,
            portal: 'jpcars_window',
            title: `${item.make || vehicleData.brand} ${item.model || vehicleData.model}`,
            price: normalizePrice(item.price_local || 0),
            mileage: item.mileage || 0,
            buildYear: item.build || vehicleData.buildYear,
            url: item.url || '',
            options: item.options || [],
            color: undefined,
            isPrimaryComparable: isPrimary,
            isLogicalDeviation: deviation.isDeviation,
            matchScore,
            deviationReason: deviation.reason,
            // Extra JP Cars data
            dealer: item.dealer_name,
            daysInStock: item.days_in_stock,
            soldSince: item.sold_since,
          };
        });

      // Calculate statistics from JP Cars data
      const prices = listings.map((l) => l.price).filter(p => p > 0).sort((a, b) => a - b);
      const lowestPrice = prices.length > 0 ? prices[0] : 0;
      const highestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
      const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
      const primaryComparableCount = listings.filter(l => l.isPrimaryComparable).length;

      // Find logical deviations
      const logicalDeviations = listings
        .filter(l => l.isLogicalDeviation && l.deviationReason)
        .slice(0, 5)
        .map((l, i) => `Listing #${i + 1}: ${l.deviationReason}`);

      console.log('✅ JP Cars Window analysis complete:', {
        listingCount: listings.length,
        primaryComparableCount,
        lowestPrice,
        medianPrice,
        highestPrice,
        source: 'JP Cars Window (direct)',
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice,
          medianPrice,
          highestPrice,
          listingCount: listings.length,
          primaryComparableCount,
          appliedFilters,
          listings: listings.slice(0, 20), // Return max 20 for UI
          logicalDeviations,
          directSearchUrls,
          dataSource: 'jpcars_window',
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // FALLBACK: Use AI web search if no JP Cars Window data
    // ============================================
    console.log('⚠️ No JP Cars Window data, falling back to AI search...');
    console.log('📡 Gaspedaal URL source:', urlSource);
    console.log('📡 Using Gaspedaal URL:', gaspedaalUrl);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // SIMPLIFIED AI PROMPT - use the exact JP Cars URL
    const searchPrompt = `
OPDRACHT: Open deze EXACTE link en geef de auto listings terug.

LINK (gebruik deze precies): ${gaspedaalUrl}

Deze link heeft al de juiste filters ingesteld:
- Bouwjaar: ${appliedFilters.buildYearFrom} - ${appliedFilters.buildYearTo}
- Max km: ${appliedFilters.mileageMax?.toLocaleString('nl-NL')} km
${appliedFilters.fuelType ? `- Brandstof: ${appliedFilters.fuelType}` : ''}

AUTO ter vergelijking: ${vehicleData.brand} ${vehicleData.model} ${vehicleData.trim || ''}, ${vehicleData.buildYear}, ${vehicleData.mileage.toLocaleString('nl-NL')} km

Geef MAX 10 listings van DEZE pagina in dit JSON format:
{
  "listings": [
    {"title": "Auto titel", "price": 45000, "mileage": 35000, "buildYear": 2023, "url": "https://..."}
  ]
}

REGELS:
- Gebruik ALLEEN listings van de gegeven link
- Maximaal 10 listings
- Prijs in hele euros (45000 niet 45.0)
- Alleen: title, price, mileage, buildYear, url
- Sorteer op prijs laag-hoog
- Alleen JSON, geen tekst
`;

    console.log('📡 Calling OpenAI with simplified prompt...');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: searchPrompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      // Fallback to JP Cars Window
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          appliedFilters,
          listings: [],
          logicalDeviations: ['AI search niet beschikbaar - gebruik JP Cars Window link'],
          directSearchUrls,
          fallbackMode: true,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    console.log('📥 OpenAI response received');

    // Parse output text
    let outputText = '';
    if (aiResponse.output_text) {
      outputText = aiResponse.output_text;
    } else if (aiResponse.output && Array.isArray(aiResponse.output)) {
      for (const item of aiResponse.output) {
        if (item.type === 'message' && item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' || contentItem.type === 'text') {
              outputText = contentItem.text || contentItem.output_text || '';
              break;
            }
          }
        }
      }
    }

    console.log('📝 Output length:', outputText.length);
    console.log('📝 Raw output (first 1000):', outputText.substring(0, 1000));

    if (!outputText) {
      console.error('❌ No output text in response');
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          appliedFilters,
          listings: [],
          logicalDeviations: ['Geen AI response - gebruik handmatige links'],
          directSearchUrls,
          fallbackMode: true,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JSON from response
    let jsonContent = outputText;
    const jsonMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    } else {
      const jsonStartIndex = outputText.indexOf('{');
      const jsonEndIndex = outputText.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonContent = outputText.substring(jsonStartIndex, jsonEndIndex + 1);
      }
    }

    console.log('📝 JSON content length:', jsonContent.length);
    console.log('📝 JSON content (first 500):', jsonContent.substring(0, 500));

    // Use robust JSON parsing
    const analysisData = parseJsonRobust(jsonContent);
    
    if (!analysisData) {
      console.error('❌ All JSON parsing strategies failed');
      console.log('📝 Full JSON content:', jsonContent);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          lowestPrice: 0,
          medianPrice: 0,
          highestPrice: 0,
          listingCount: 0,
          primaryComparableCount: 0,
          appliedFilters,
          listings: [],
          logicalDeviations: ['JSON parsing mislukt - gebruik handmatige links'],
          directSearchUrls,
          fallbackMode: true,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ JSON parsed successfully');

    // Process listings - calculate matchScore and isPrimaryComparable ourselves
    const rawListings = analysisData.listings || [];
    const logicalDeviations: string[] = [];
    
    const listings: PortalListing[] = rawListings
      .filter((l: any) => l.url && l.price && typeof l.price === 'number')
      .map((l: any, index: number) => {
        const matchScore = calculateMatchScore(l, vehicleData);
        const isPrimary = isPrimaryComparable(l, vehicleData);
        const deviation = hasLogicalDeviation(l, vehicleData);
        
        if (deviation.isDeviation && deviation.reason) {
          logicalDeviations.push(`Listing #${index + 1}: ${deviation.reason}`);
        }
        
        return {
          id: `listing-${index + 1}`,
          portal: 'gaspedaal',
          title: l.title || '',
          price: normalizePrice(l.price),
          mileage: l.mileage || 0,
          buildYear: l.buildYear || vehicleData.buildYear,
          url: l.url,
          options: [],
          color: undefined,
          isPrimaryComparable: isPrimary,
          isLogicalDeviation: deviation.isDeviation,
          matchScore,
          deviationReason: deviation.reason,
        };
      });

    // Calculate statistics
    const prices = listings.map((l) => l.price).filter(p => p > 0).sort((a, b) => a - b);
    const lowestPrice = prices.length > 0 ? prices[0] : 0;
    const highestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;
    const primaryComparableCount = listings.filter(l => l.isPrimaryComparable).length;

    console.log('✅ Portal search complete:', {
      listingCount: listings.length,
      primaryComparableCount,
      lowestPrice,
      medianPrice,
      highestPrice,
      deviationsFound: logicalDeviations.length
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        lowestPrice,
        medianPrice,
        highestPrice,
        listingCount: listings.length,
        primaryComparableCount,
        appliedFilters,
        listings,
        logicalDeviations,
        directSearchUrls,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Portal search error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Normalize price - ensure it's a valid whole number in euros
function normalizePrice(price: number): number {
  if (price < 500 && price > 0) {
    return Math.round(price * 1000);
  }
  if (price > 100 && price < 200) {
    return Math.round(price * 1000);
  }
  return Math.round(price);
}
