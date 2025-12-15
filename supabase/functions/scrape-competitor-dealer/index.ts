import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedVehicle {
  externalUrl: string;
  brand: string;
  model: string;
  variant?: string;
  buildYear?: number;
  mileage?: number;
  price?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  imageUrl?: string;
}

// Generate fingerprint for vehicle matching
function generateFingerprint(vehicle: ScrapedVehicle): string {
  const brand = (vehicle.brand || '').toUpperCase().trim();
  const model = (vehicle.model || '').toUpperCase().trim();
  const year = vehicle.buildYear || 0;
  const mileageBucket = Math.floor((vehicle.mileage || 0) / 2000); // Per 2000km bucket
  const color = (vehicle.color || 'ONBEKEND').toUpperCase().trim();
  
  return `${brand}|${model}|${year}|${mileageBucket}|${color}`;
}

// Parse AutoWereld HTML to extract vehicles
function parseAutoWereldVehicles(html: string, baseUrl: string): ScrapedVehicle[] {
  const vehicles: ScrapedVehicle[] = [];
  
  // Match vehicle listings - AutoWereld uses a consistent structure
  // Look for vehicle cards with data
  const vehicleMatches = html.matchAll(/<div[^>]*class="[^"]*vehicle-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi);
  
  // Alternative: match individual vehicle links with their data
  const linkPattern = /<a[^>]*href="([^"]*\/auto\/[^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
  const pricePattern = /€\s*([\d.,]+)/g;
  const yearPattern = /\b(19\d{2}|20\d{2})\b/g;
  const mileagePattern = /([\d.,]+)\s*km/gi;
  
  // Parse the page sections for vehicle data
  // Split by vehicle entries
  const sections = html.split(/<article|<div[^>]*data-vehicle/gi);
  
  for (const section of sections) {
    if (section.length < 100) continue; // Skip empty sections
    
    // Extract URL
    const urlMatch = section.match(/href="([^"]*(?:\/auto\/|\/details|\/voertuig)[^"]*)"/i);
    if (!urlMatch) continue;
    
    let url = urlMatch[1];
    if (!url.startsWith('http')) {
      url = new URL(url, baseUrl).toString();
    }
    
    // Extract title (brand + model)
    const titleMatch = section.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i) 
      || section.match(/title="([^"]+)"/i)
      || section.match(/alt="([^"]+)"/i);
    
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const titleParts = title.split(/\s+/);
    const brand = titleParts[0] || 'Onbekend';
    const model = titleParts.slice(1, 3).join(' ') || 'Onbekend';
    const variant = titleParts.slice(3).join(' ') || undefined;
    
    // Extract price
    const priceMatch = section.match(/€\s*([\d.,]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : undefined;
    
    // Extract year
    const yearMatch = section.match(/\b(20\d{2}|19\d{2})\b/);
    const buildYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
    
    // Extract mileage
    const mileageMatch = section.match(/([\d.,]+)\s*km/i);
    const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/\./g, '').replace(',', '')) : undefined;
    
    // Extract fuel type
    let fuelType: string | undefined;
    if (/benzine/i.test(section)) fuelType = 'Benzine';
    else if (/diesel/i.test(section)) fuelType = 'Diesel';
    else if (/elektrisch/i.test(section)) fuelType = 'Elektrisch';
    else if (/hybride/i.test(section)) fuelType = 'Hybride';
    else if (/lpg/i.test(section)) fuelType = 'LPG';
    
    // Extract transmission
    let transmission: string | undefined;
    if (/automaat/i.test(section)) transmission = 'Automaat';
    else if (/handgeschakeld/i.test(section)) transmission = 'Handgeschakeld';
    
    // Extract color
    const colorMatch = section.match(/(?:kleur|color)[:\s]*([a-zA-Z]+)/i);
    const color = colorMatch ? colorMatch[1] : undefined;
    
    // Extract image
    const imgMatch = section.match(/src="([^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;
    
    vehicles.push({
      externalUrl: url,
      brand,
      model,
      variant,
      buildYear,
      mileage,
      price,
      fuelType,
      transmission,
      color,
      imageUrl,
    });
  }
  
  console.log(`[Scraper] Parsed ${vehicles.length} vehicles from HTML`);
  return vehicles;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { dealerId } = await req.json();
    
    if (!dealerId) {
      return new Response(
        JSON.stringify({ success: false, message: 'dealerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Scraper] Starting scrape for dealer: ${dealerId}`);
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get dealer info
    const { data: dealer, error: dealerError } = await supabase
      .from('competitor_dealers')
      .select('*')
      .eq('id', dealerId)
      .single();
    
    if (dealerError || !dealer) {
      console.error('[Scraper] Dealer not found:', dealerError);
      return new Response(
        JSON.stringify({ success: false, message: 'Dealer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Scraper] Fetching URL: ${dealer.scrape_url}`);
    
    // Fetch the dealer page
    const response = await fetch(dealer.scrape_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`[Scraper] Received ${html.length} bytes of HTML`);
    
    // Parse vehicles from HTML
    const scrapedVehicles = parseAutoWereldVehicles(html, dealer.scrape_url);
    console.log(`[Scraper] Found ${scrapedVehicles.length} vehicles`);
    
    // Get existing vehicles for this dealer
    const { data: existingVehicles, error: vehiclesError } = await supabase
      .from('competitor_vehicles')
      .select('*')
      .eq('dealer_id', dealerId);
    
    if (vehiclesError) {
      throw new Error(`Failed to fetch existing vehicles: ${vehiclesError.message}`);
    }
    
    const existingByFingerprint = new Map(
      (existingVehicles || []).map(v => [v.fingerprint, v])
    );
    
    let vehiclesNew = 0;
    let vehiclesReappeared = 0;
    let priceChanges = 0;
    const seenFingerprints = new Set<string>();
    
    // Process scraped vehicles
    for (const scraped of scrapedVehicles) {
      const fingerprint = generateFingerprint(scraped);
      seenFingerprints.add(fingerprint);
      
      const existing = existingByFingerprint.get(fingerprint);
      
      if (!existing) {
        // NEW VEHICLE
        const { error: insertError } = await supabase
          .from('competitor_vehicles')
          .insert({
            dealer_id: dealerId,
            fingerprint,
            external_url: scraped.externalUrl,
            brand: scraped.brand,
            model: scraped.model,
            variant: scraped.variant,
            build_year: scraped.buildYear,
            mileage: scraped.mileage,
            mileage_bucket: Math.floor((scraped.mileage || 0) / 2000),
            price: scraped.price,
            fuel_type: scraped.fuelType,
            transmission: scraped.transmission,
            color: scraped.color,
            image_url: scraped.imageUrl,
            status: 'in_stock',
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            consecutive_missing_scrapes: 0,
            total_stock_days: 0,
            reappeared_count: 0,
          });
        
        if (insertError) {
          console.error(`[Scraper] Insert error for ${fingerprint}:`, insertError);
        } else {
          vehiclesNew++;
          console.log(`[Scraper] New vehicle: ${scraped.brand} ${scraped.model}`);
        }
      } else {
        // EXISTING VEHICLE
        const updates: Record<string, unknown> = {
          last_seen_at: new Date().toISOString(),
          consecutive_missing_scrapes: 0,
          external_url: scraped.externalUrl,
        };
        
        // Check if was sold but reappeared
        if (existing.status === 'sold') {
          updates.status = 'in_stock';
          updates.sold_at = null;
          updates.reappeared_count = (existing.reappeared_count || 0) + 1;
          vehiclesReappeared++;
          console.log(`[Scraper] Reappeared: ${scraped.brand} ${scraped.model} (count: ${updates.reappeared_count})`);
        }
        
        // Check price change
        if (scraped.price && existing.price && scraped.price !== existing.price) {
          // Log price change
          await supabase.from('competitor_price_history').insert({
            vehicle_id: existing.id,
            old_price: existing.price,
            new_price: scraped.price,
            price_change: scraped.price - existing.price,
          });
          
          updates.price = scraped.price;
          priceChanges++;
          console.log(`[Scraper] Price change: ${existing.price} -> ${scraped.price}`);
        }
        
        await supabase
          .from('competitor_vehicles')
          .update(updates)
          .eq('id', existing.id);
      }
    }
    
    // Check for vehicles NOT seen (potentially sold)
    let vehiclesSold = 0;
    for (const existing of existingVehicles || []) {
      if (existing.status !== 'in_stock') continue;
      
      if (!seenFingerprints.has(existing.fingerprint)) {
        const missedScrapes = (existing.consecutive_missing_scrapes || 0) + 1;
        
        if (missedScrapes >= 2) {
          // Mark as SOLD after 2+ missed scrapes
          await supabase
            .from('competitor_vehicles')
            .update({
              status: 'sold',
              sold_at: new Date().toISOString(),
              consecutive_missing_scrapes: missedScrapes,
            })
            .eq('id', existing.id);
          
          vehiclesSold++;
          console.log(`[Scraper] Marked as sold: ${existing.brand} ${existing.model}`);
        } else {
          // Just increment counter
          await supabase
            .from('competitor_vehicles')
            .update({
              consecutive_missing_scrapes: missedScrapes,
            })
            .eq('id', existing.id);
          
          console.log(`[Scraper] Missed scrape (${missedScrapes}): ${existing.brand} ${existing.model}`);
        }
      }
    }
    
    // Update stock days for all in_stock vehicles
    await supabase.rpc('update_competitor_stock_days', { dealer_uuid: dealerId }).catch(() => {
      // RPC might not exist yet, update manually
      console.log('[Scraper] RPC not available, skipping stock days update');
    });
    
    // Log the scrape
    const duration = Date.now() - startTime;
    await supabase.from('competitor_scrape_logs').insert({
      dealer_id: dealerId,
      status: 'success',
      vehicles_found: scrapedVehicles.length,
      vehicles_new: vehiclesNew,
      vehicles_sold: vehiclesSold,
      vehicles_reappeared: vehiclesReappeared,
      duration_ms: duration,
    });
    
    // Update dealer
    await supabase
      .from('competitor_dealers')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: 'success',
        last_scrape_vehicles_count: scrapedVehicles.length,
      })
      .eq('id', dealerId);
    
    const result = {
      success: true,
      message: `Scrape voltooid: ${scrapedVehicles.length} voertuigen gevonden, ${vehiclesNew} nieuw, ${vehiclesSold} verkocht, ${vehiclesReappeared} herplaatst`,
      stats: {
        vehiclesFound: scrapedVehicles.length,
        vehiclesNew,
        vehiclesSold,
        vehiclesReappeared,
        priceChanges,
        durationMs: duration,
      },
    };
    
    console.log('[Scraper] Complete:', result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Scraper] Error:', error);
    
    const duration = Date.now() - startTime;
    
    // Try to log the error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { dealerId } = await req.json().catch(() => ({}));
      if (dealerId) {
        await supabase.from('competitor_scrape_logs').insert({
          dealer_id: dealerId,
          status: 'error',
          error_message: error.message,
          duration_ms: duration,
        });
        
        await supabase
          .from('competitor_dealers')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: 'error',
          })
          .eq('id', dealerId);
      }
    } catch (e) {
      console.error('[Scraper] Failed to log error:', e);
    }
    
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
