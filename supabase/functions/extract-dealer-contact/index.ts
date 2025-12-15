import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract email addresses from HTML content
function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  
  // Filter out common false positives
  const excludePatterns = [
    '@sentry', '@example', '@test', '@localhost', '@domain',
    'wixpress', 'cloudflare', 'googleapis', 'gstatic', 'facebook',
    'twitter', 'instagram', 'linkedin', 'youtube', 'google',
    '.png', '.jpg', '.gif', '.svg', '.css', '.js'
  ];
  
  return [...new Set(matches)].filter(email => {
    const lowerEmail = email.toLowerCase();
    return !excludePatterns.some(pattern => lowerEmail.includes(pattern));
  });
}

// Extract Dutch phone numbers from HTML content
function extractPhones(html: string): string[] {
  // Various Dutch phone number patterns
  const patterns = [
    // +31 format
    /\+31[\s.-]?(?:\(0\))?[\s.-]?\d{1,3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    // 0XX-XXXXXXX format
    /0[1-9]\d[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    // 0XX XXXX XXX format
    /0[1-9]\d[\s.-]?\d{4}[\s.-]?\d{3}/g,
    // 06-XXXXXXXX mobile format
    /06[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    /06[\s.-]?\d{8}/g,
  ];
  
  const allMatches: string[] = [];
  
  for (const pattern of patterns) {
    const matches = html.match(pattern) || [];
    allMatches.push(...matches);
  }
  
  // Clean and normalize phone numbers
  const cleaned = allMatches.map(phone => {
    // Remove extra whitespace
    return phone.replace(/\s+/g, ' ').trim();
  });
  
  return [...new Set(cleaned)];
}

// Get base URL from a listing URL
function getBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

// Build dealer website URL from dealer name
// JP Cars dealer names often contain the actual website domain (e.g., "henkscholten.nl", "bluekens.com")
function buildDealerWebsiteUrl(dealerName: string | null): string | null {
  if (!dealerName) return null;
  
  const cleanName = dealerName.trim().toLowerCase();
  
  // Check if dealer name already looks like a domain
  const domainPatterns = [
    /^(www\.)?([a-z0-9-]+\.(nl|com|be|de|eu|net|org))$/i,
    /([a-z0-9-]+\.(nl|com|be|de|eu|net|org))$/i,
  ];
  
  for (const pattern of domainPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const domain = match[2] || match[1];
      console.log(`   Detected domain in dealer name: ${domain}`);
      return `https://www.${domain.replace(/^www\./, '')}`;
    }
  }
  
  // Check if the name contains a TLD anywhere (e.g., "Auto Dealer henkscholten.nl")
  const tldMatch = cleanName.match(/([a-z0-9-]+\.(nl|com|be|de|eu|net|org))/i);
  if (tldMatch) {
    console.log(`   Found domain in dealer name: ${tldMatch[1]}`);
    return `https://www.${tldMatch[1].replace(/^www\./, '')}`;
  }
  
  // Fallback: try to construct URL from dealer name (remove spaces, add .nl)
  // Only do this if the name looks like it could be a business name
  const simplifiedName = cleanName
    .replace(/\s+(bv|b\.v\.|vof|v\.o\.f\.)$/i, '') // Remove business suffixes
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .trim();
  
  if (simplifiedName.length >= 3 && simplifiedName.length <= 30) {
    console.log(`   Trying constructed URL: www.${simplifiedName}.nl`);
    return `https://www.${simplifiedName}.nl`;
  }
  
  return null;
}

// Fetch HTML content with timeout
async function fetchHtml(url: string, timeoutMs: number = 5000): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    console.log(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Find contact page URL from HTML
function findContactPageUrl(html: string, baseUrl: string): string | null {
  const contactPatterns = [
    /href=["']([^"']*(?:contact|kontakt)[^"']*)["']/gi,
    /href=["']([^"']*(?:over-ons|about|about-us)[^"']*)["']/gi,
  ];
  
  for (const pattern of contactPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let href = match[1];
      
      // Skip external links
      if (href.startsWith('http') && !href.includes(new URL(baseUrl).hostname)) {
        continue;
      }
      
      // Skip tel: and mailto: links
      if (href.startsWith('tel:') || href.startsWith('mailto:')) {
        continue;
      }
      
      // Make relative URLs absolute
      if (href.startsWith('/')) {
        return `${baseUrl}${href}`;
      } else if (!href.startsWith('http')) {
        return `${baseUrl}/${href}`;
      }
      
      return href;
    }
  }
  
  // Try common contact page paths
  const commonPaths = ['/contact', '/contact/', '/contacten', '/over-ons', '/about'];
  for (const path of commonPaths) {
    if (html.toLowerCase().includes(`href="${path}"`) || html.toLowerCase().includes(`href='${path}'`)) {
      return `${baseUrl}${path}`;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listingUrl, dealerName } = await req.json();
    
    console.log(`🔍 Extracting contact for dealer: ${dealerName || 'unknown'}`);
    console.log(`   Listing URL: ${listingUrl}`);
    
    // PRIORITY: Use dealerName to build website URL (JP Cars dealer names often contain the domain)
    // Only fall back to listingUrl if dealerName doesn't work
    let baseUrl = buildDealerWebsiteUrl(dealerName);
    
    if (baseUrl) {
      console.log(`   ✅ Built URL from dealer name: ${baseUrl}`);
    } else if (listingUrl) {
      // Fallback to listing URL (but skip if it's a JP Cars redirect URL)
      const listingBaseUrl = getBaseUrl(listingUrl);
      if (listingBaseUrl && !listingBaseUrl.includes('jp.cars') && !listingBaseUrl.includes('jpcars')) {
        baseUrl = listingBaseUrl;
        console.log(`   ⚠️ Fallback to listing URL: ${baseUrl}`);
      }
    }
    
    if (!baseUrl) {
      console.log('❌ Could not determine dealer website URL');
      return new Response(
        JSON.stringify({ email: null, phone: null, website: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`   🌐 Target website: ${baseUrl}`);
    
    let allEmails: string[] = [];
    let allPhones: string[] = [];
    
    // Step 1: Fetch and parse homepage
    console.log('📄 Fetching homepage...');
    const homepageHtml = await fetchHtml(baseUrl);
    
    if (homepageHtml) {
      const homepageEmails = extractEmails(homepageHtml);
      const homepagePhones = extractPhones(homepageHtml);
      
      allEmails.push(...homepageEmails);
      allPhones.push(...homepagePhones);
      
      console.log(`   Homepage: Found ${homepageEmails.length} emails, ${homepagePhones.length} phones`);
      
      // Step 2: Try to find and fetch contact page
      if (allEmails.length === 0 || allPhones.length === 0) {
        const contactUrl = findContactPageUrl(homepageHtml, baseUrl);
        
        if (contactUrl && contactUrl !== baseUrl) {
          console.log(`📄 Fetching contact page: ${contactUrl}`);
          const contactHtml = await fetchHtml(contactUrl);
          
          if (contactHtml) {
            const contactEmails = extractEmails(contactHtml);
            const contactPhones = extractPhones(contactHtml);
            
            allEmails.push(...contactEmails);
            allPhones.push(...contactPhones);
            
            console.log(`   Contact page: Found ${contactEmails.length} emails, ${contactPhones.length} phones`);
          }
        }
      }
    }
    
    // Step 3: Try common contact page paths if still no results
    if (allEmails.length === 0 && allPhones.length === 0) {
      const fallbackPaths = ['/contact', '/contact/', '/contacten', '/over-ons'];
      
      for (const path of fallbackPaths) {
        const fallbackUrl = `${baseUrl}${path}`;
        console.log(`📄 Trying fallback: ${fallbackUrl}`);
        
        const html = await fetchHtml(fallbackUrl, 3000);
        
        if (html) {
          allEmails.push(...extractEmails(html));
          allPhones.push(...extractPhones(html));
          
          if (allEmails.length > 0 || allPhones.length > 0) {
            console.log(`   Fallback success!`);
            break;
          }
        }
      }
    }
    
    // Deduplicate and get best results
    const uniqueEmails = [...new Set(allEmails)];
    const uniquePhones = [...new Set(allPhones)];
    
    // Prefer info@, contact@, verkoop@, sales@ emails
    const preferredPrefixes = ['info', 'contact', 'verkoop', 'sales', 'algemeen'];
    const sortedEmails = uniqueEmails.sort((a, b) => {
      const aPrefix = a.split('@')[0].toLowerCase();
      const bPrefix = b.split('@')[0].toLowerCase();
      const aScore = preferredPrefixes.findIndex(p => aPrefix.includes(p));
      const bScore = preferredPrefixes.findIndex(p => bPrefix.includes(p));
      
      if (aScore === -1 && bScore === -1) return 0;
      if (aScore === -1) return 1;
      if (bScore === -1) return -1;
      return aScore - bScore;
    });
    
    const result = {
      email: sortedEmails[0] || null,
      phone: uniquePhones[0] || null,
      website: baseUrl,
    };
    
    console.log(`✅ Result for ${dealerName || 'dealer'}:`, result);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error extracting contact:', error);
    
    return new Response(
      JSON.stringify({ 
        email: null, 
        phone: null, 
        website: null,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
