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

// Browser-like headers with cookie consent and referer
function getHeaders(): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/',
    'Cookie': 'CookieConsent=true; euconsent-v2=CPxxxxxAA; OptanonAlertBoxClosed=2024-01-01T00:00:00.000Z; OptanonConsent=isGpcEnabled=0&datestamp=2024-01-01&version=202401&landingPath=NotLandingPage&groups=C0001:1,C0002:1,C0003:1,C0004:1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

// Generate fingerprint for vehicle matching
function generateFingerprint(vehicle: ScrapedVehicle): string {
  const brand = (vehicle.brand || '').toUpperCase().trim();
  const model = (vehicle.model || '').toUpperCase().trim();
  const year = vehicle.buildYear || 0;
  const mileageBucket = Math.floor((vehicle.mileage || 0) / 2000);
  const color = (vehicle.color || 'ONBEKEND').toUpperCase().trim();
  
  return `${brand}|${model}|${year}|${mileageBucket}|${color}`;
}

// Parse AutoWereld HTML to extract vehicles
function parseAutoWereldVehicles(html: string, baseUrl: string): ScrapedVehicle[] {
  const vehicles: ScrapedVehicle[] = [];
  
  // Split by vehicle entries - multiple patterns for different page structures
  const sections = html.split(/<article|<div[^>]*data-vehicle|<div[^>]*class="[^"]*vehicle-item[^"]*"|<div[^>]*class="[^"]*car-item[^"]*"|<li[^>]*class="[^"]*result[^"]*"/gi);
  
  for (const section of sections) {
    if (section.length < 100) continue;
    
    // Extract URL
    const urlMatch = section.match(/href="([^"]*(?:\/auto\/|\/details|\/voertuig|\/occasion)[^"]*)"/i);
    if (!urlMatch) continue;
    
    let url = urlMatch[1];
    if (!url.startsWith('http')) {
      try {
        url = new URL(url, baseUrl).toString();
      } catch {
        continue;
      }
    }
    
    // Extract title (brand + model)
    const titleMatch = section.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i) 
      || section.match(/title="([^"]+)"/i)
      || section.match(/alt="([^"]+)"/i)
      || section.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
    
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const titleParts = title.split(/\s+/);
    const brand = titleParts[0] || 'Onbekend';
    const model = titleParts.slice(1, 3).join(' ') || 'Onbekend';
    const variant = titleParts.slice(3).join(' ') || undefined;
    
    // Extract price
    const priceMatch = section.match(/€\s*([\d.,]+)/) || section.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€/);
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
    else if (/handgeschakeld|manueel/i.test(section)) transmission = 'Handgeschakeld';
    
    // Extract color
    const colorMatch = section.match(/(?:kleur|color)[:\s]*([a-zA-Z]+)/i);
    const color = colorMatch ? colorMatch[1] : undefined;
    
    // Extract image
    const imgMatch = section.match(/src="([^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i)
      || section.match(/data-src="([^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i);
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
  
  console.log(`[Scraper] Parsed ${vehicles.length} vehicles from HTML section`);
  return vehicles;
}

// Check if there's a next page
function hasNextPage(html: string, currentPage: number): boolean {
  // Look for pagination links
  const nextPageNum = currentPage + 1;
  
  // Common pagination patterns
  const patterns = [
    new RegExp(`page=${nextPageNum}`, 'i'),
    new RegExp(`pagina=${nextPageNum}`, 'i'),
    new RegExp(`p=${nextPageNum}`, 'i'),
    new RegExp(`/page/${nextPageNum}`, 'i'),
    new RegExp(`class="[^"]*pagination[^"]*"[^>]*>[\\s\\S]*?>${nextPageNum}<`, 'i'),
    /class="[^"]*next[^"]*"/i,
    />volgende</i,
    /›|»/,
  ];
  
  return patterns.some(p => p.test(html));
}

// Build paginated URL
function buildPageUrl(baseUrl: string, page: number): string {
  if (page === 1) return baseUrl;
  
  const url = new URL(baseUrl);
  
  // Check if URL already has pagination parameter
  if (url.searchParams.has('page')) {
    url.searchParams.set('page', page.toString());
  } else if (url.searchParams.has('pagina')) {
    url.searchParams.set('pagina', page.toString());
  } else if (url.searchParams.has('p')) {
    url.searchParams.set('p', page.toString());
  } else {
    // Add page parameter
    url.searchParams.set('page', page.toString());
  }
  
  return url.toString();
}

// Fetch a single page with retry logic
async function fetchPage(url: string, attempt = 1): Promise<string> {
  console.log(`[Scraper] Fetching: ${url} (attempt ${attempt})`);
  
  const headers = getHeaders();
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.log(`[Scraper] Response status: ${response.status}, headers:`, Object.fromEntries(response.headers.entries()));
      
      if (attempt < 3) {
        // Retry with different headers
        console.log(`[Scraper] Retrying with alternative headers...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        
        const altHeaders = attempt === 2 
          ? { 
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html',
              'Referer': 'https://www.google.com/',
            }
          : {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'nl-NL,nl;q=0.9',
              'Cookie': 'CookieConsent=true',
            };
        
        const retryResponse = await fetch(url, { headers: altHeaders });
        if (retryResponse.ok) {
          return await retryResponse.text();
        }
      }
      
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    if (attempt < 3) {
      console.log(`[Scraper] Fetch error, retrying: ${error.message}`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return fetchPage(url, attempt + 1);
    }
    throw error;
  }
}

// Scrape all pages for a dealer
async function scrapeAllPages(baseUrl: string): Promise<ScrapedVehicle[]> {
  const allVehicles: ScrapedVehicle[] = [];
  const seenUrls = new Set<string>();
  let page = 1;
  const maxPages = 25;
  
  while (page <= maxPages) {
    const pageUrl = buildPageUrl(baseUrl, page);
    console.log(`[Scraper] Fetching page ${page}: ${pageUrl}`);
    
    try {
      const html = await fetchPage(pageUrl);
      console.log(`[Scraper] Page ${page}: received ${html.length} bytes`);
      
      // Check for cookie consent popup blocking content
      if (html.includes('cookie-consent') && html.length < 5000) {
        console.log(`[Scraper] Cookie consent popup detected, content may be blocked`);
      }
      
      const vehicles = parseAutoWereldVehicles(html, baseUrl);
      
      // Deduplicate by URL
      let newVehicles = 0;
      for (const v of vehicles) {
        if (!seenUrls.has(v.externalUrl)) {
          seenUrls.add(v.externalUrl);
          allVehicles.push(v);
          newVehicles++;
        }
      }
      
      console.log(`[Scraper] Page ${page}: ${vehicles.length} vehicles found, ${newVehicles} new`);
      
      // Stop if no new vehicles found (reached end or duplicate page)
      if (newVehicles === 0) {
        console.log(`[Scraper] No new vehicles on page ${page}, stopping pagination`);
        break;
      }
      
      // Check if there's a next page
      if (!hasNextPage(html, page)) {
        console.log(`[Scraper] No next page found after page ${page}`);
        break;
      }
      
      page++;
      
      // Small delay between pages to avoid rate limiting
      if (page <= maxPages) {
        await new Promise(r => setTimeout(r, 750));
      }
      
    } catch (error) {
      console.error(`[Scraper] Error fetching page ${page}:`, error.message);
      // If first page fails, throw error. Otherwise, stop pagination.
      if (page === 1) throw error;
      break;
    }
  }
  
  console.log(`[Scraper] Total: ${allVehicles.length} unique vehicles from ${page} page(s)`);
  return allVehicles;
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
    
    console.log(`[Scraper] Dealer: ${dealer.name}, URL: ${dealer.scrape_url}`);
    
    // Scrape all pages
    const scrapedVehicles = await scrapeAllPages(dealer.scrape_url);
    console.log(`[Scraper] Total scraped: ${scrapedVehicles.length} vehicles`);
    
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
          console.log(`[Scraper] Reappeared: ${scraped.brand} ${scraped.model}`);
        }
        
        // Check price change
        if (scraped.price && existing.price && scraped.price !== existing.price) {
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
