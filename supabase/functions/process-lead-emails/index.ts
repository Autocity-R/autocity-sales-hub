import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id: string;
}

interface ParsedData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  vehicle?: string;
  companyName?: string;
  tradeIn?: {
    kenteken?: string;
    mileage?: string;
    remarks?: string;
    [key: string]: string | undefined;
  };
  source: string;
  type: string; // 'Contact', 'TradeIn', 'FinancialLead', 'MissedCall', 'Ignored'
  subType?: string;
  ignored?: boolean;
  rawBody?: string;
}

// Financial Partner Parser (Blokweg Groep + FinancialLease.nl)
function parseFinancialPartner(body: string, from: string): ParsedData | null {
  console.log('💰 Parsing Financial Partner email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Detect source
  const lowerFrom = from.toLowerCase();
  const source = lowerFrom.includes('financiallease.nl') ? 'FinancialLease.nl' : 
                 lowerFrom.includes('blokweggroep.nl') ? 'BlokwegGroep' : 'FinancialPartner';
  
  // Extract fields (can have "De heer" / "Mevrouw" prefix)
  const nameMatch = cleanBody.match(/Naam:\s*(?:De heer|Mevrouw)?\s*([^\n]+)/i);
  const emailMatch = cleanBody.match(/E-mail:\s*([^\s<>]+)/i);
  const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
  const companyMatch = cleanBody.match(/Bedrijfsnaam:\s*([^\n]+)/i);
  const vehicleMatch = cleanBody.match(/(?:Voertuig|Interesse in):\s*([^\n]+)/i);
  
  if (!nameMatch || !emailMatch) {
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  let message = `🔥 FINANCIAL LEASE GOEDGEKEURD (${source})\nFinanciering is al akkoord - directe verkoopkans!`;
  if (vehicleMatch) message += `\n\nVoertuig: ${vehicleMatch[1].trim()}`;
  
  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: emailMatch[1].trim(),
    phone: phoneMatch?.[1]?.trim(),
    companyName: companyMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    message: message,
    source: source,
    type: 'FinancialLead',
    rawBody: cleanBody
  };
}

// Website Parser (morgeninternet.nl)
function parseWebsite(body: string, subject: string): ParsedData | null {
  console.log('🌐 Parsing Website email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const isTradeIn = cleanBody.includes('Inruilaanvraag') || subject.toLowerCase().includes('inruil');
  
  const nameMatch = cleanBody.match(/Naam:\s*([^\n]+)/i);
  const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
  const emailMatch = cleanBody.match(/E-Mailadres:\s*([^\s<>]+)/i);
  
  if (!nameMatch || !emailMatch) {
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: emailMatch[1].trim(),
    phone: phoneMatch?.[1]?.trim(),
    source: 'Website',
    type: isTradeIn ? 'TradeIn' : 'Contact',
    rawBody: cleanBody
  };
  
  if (isTradeIn) {
    const kentekenMatch = cleanBody.match(/Kenteken:\s*([^\n]+)/i);
    const kmMatch = cleanBody.match(/Kilometerstand:\s*([^\n]+)/i);
    const remarksMatch = cleanBody.match(/(?:Eventuele opmerkingen|Opmerkingen):\s*([^\n]+)/i);
    
    result.tradeIn = {
      kenteken: kentekenMatch?.[1]?.trim(),
      mileage: kmMatch?.[1]?.trim(),
      remarks: remarksMatch?.[1]?.trim()
    };
    result.message = `Inruilaanvraag via website - ${kentekenMatch?.[1]?.trim() || 'kenteken onbekend'}`;
  }
  
  return result;
}

// Enhanced AutoTrack Parser
function parseAutoTrackEnhanced(body: string, subject: string): ParsedData | null {
  console.log('🏁 Parsing AutoTrack email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // TRIAGE 1: Oproep ontvangen - negeren
  if (cleanBody.includes('Oproep ontvangen') || subject.includes('Oproep ontvangen')) {
    console.log('📞 AutoTrack Oproep ontvangen - ignoring');
    return { source: 'AutoTrack', type: 'IgnoredCall', ignored: true };
  }
  
  // TRIAGE 2: Oproep gemist - speciaal geval
  if (cleanBody.includes('Oproep gemist') || subject.includes('Oproep gemist')) {
    console.log('📵 AutoTrack Oproep gemist - extracting phone');
    
    const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
    const vehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
    
    if (phoneMatch) {
      return {
        phone: phoneMatch[1].trim(),
        vehicle: vehicleMatch?.[1]?.trim(),
        source: 'AutoTrack',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via AutoTrack`,
        rawBody: cleanBody
      };
    }
  }
  
  // SUBTYPE DETECTIE
  let subType = 'Contact';
  if (cleanBody.includes('Inruilaanvraag')) subType = 'Inruilaanvraag';
  else if (cleanBody.includes('Terugbelverzoek')) subType = 'Terugbelverzoek';
  else if (cleanBody.includes('Proefritaanvraag')) subType = 'Proefritaanvraag';
  
  const nameMatch = cleanBody.match(/Naam:\s*([^\n]+)/i);
  const emailMatch = cleanBody.match(/E-mailadres:\s*([^\s<>]+)/i);
  const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
  const vehicleMatch = cleanBody.match(/(?:Voertuig|Auto):\s*([^\n]+)/i) ||
                       subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
  
  if (!nameMatch || !emailMatch) {
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: emailMatch[1].trim(),
    phone: phoneMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    source: 'AutoTrack',
    type: subType === 'Inruilaanvraag' ? 'TradeIn' : 'Contact',
    subType: subType,
    rawBody: cleanBody
  };
  
  if (subType === 'Inruilaanvraag') {
    const kentekenMatch = cleanBody.match(/Kenteken:\s*([^\n]+)/i);
    const kmMatch = cleanBody.match(/Kilometerstand:\s*([^\n]+)/i);
    const stateMatch = cleanBody.match(/Staat van inruilauto:\s*([^\n]+)/i);
    const descMatch = cleanBody.match(/Beschrijving inruilauto:\s*([^\n]+)/i);
    
    result.tradeIn = {
      kenteken: kentekenMatch?.[1]?.trim(),
      mileage: kmMatch?.[1]?.trim(),
      state: stateMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim()
    };
    result.message = `Inruilaanvraag via AutoTrack`;
  } else if (subType === 'Terugbelverzoek') {
    const dagMatch = cleanBody.match(/Gewenste dag:\s*([^\n]+)/i);
    const tijdMatch = cleanBody.match(/Gewenste tijd:\s*([^\n]+)/i);
    result.message = `Terugbelverzoek - ${dagMatch?.[1]?.trim() || ''} ${tijdMatch?.[1]?.trim() || ''}`.trim();
  } else if (subType === 'Proefritaanvraag') {
    const dagMatch = cleanBody.match(/Gewenste dag:\s*([^\n]+)/i);
    result.message = `Proefritaanvraag - ${dagMatch?.[1]?.trim() || ''}`.trim();
  }
  
  return result;
}

// Marktplaats Parser - Multiple email types
function parseMarktplaats(body: string, subject: string): ParsedData | null {
  console.log('🛒 Parsing Marktplaats email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const lowerSubject = subject.toLowerCase();
  
  // TRIAGE: Ignore "Reactie ontvangen" en "Gesprek gevoerd"
  if (lowerSubject.includes('je hebt een reactie ontvangen') || 
      lowerSubject.includes('gesprek gevoerd')) {
    console.log('💬 Marktplaats reactie/gesprek - ignoring');
    return { source: 'Marktplaats', type: 'Ignored', ignored: true };
  }
  
  // SUBTYPE detectie
  let subType = 'Contact';
  if (lowerSubject.includes('gemiste oproep')) subType = 'MissedCall';
  else if (lowerSubject.includes('inruilverzoek')) subType = 'TradeIn';
  else if (lowerSubject.includes('vraag over')) subType = 'Question';
  
  // GEMISTE OPROEP - alleen telefoonnummer
  if (subType === 'MissedCall') {
    const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
    const vehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
    
    if (phoneMatch) {
      return {
        phone: phoneMatch[1].trim(),
        vehicle: vehicleMatch?.[1]?.trim(),
        source: 'Marktplaats',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via Marktplaats`,
        rawBody: cleanBody
      };
    }
  }
  
  // NORMALE PARSING
  const nameMatch = cleanBody.match(/(?:Naam|Van):\s*([^\n]+)/i);
  const emailMatch = cleanBody.match(/E-mailadres:\s*([^\s<>]+)/i);
  const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n]+)/i);
  const vehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i) ||
                       cleanBody.match(/(?:Voertuig|Advertentie):\s*([^\n]+)/i);
  const messageMatch = cleanBody.match(/(?:Vraag|Bericht):\s*([^\n]+)/i);
  
  if (!nameMatch || !emailMatch) {
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: emailMatch[1].trim(),
    phone: phoneMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    message: messageMatch?.[1]?.trim(),
    source: 'Marktplaats',
    type: subType === 'TradeIn' ? 'TradeIn' : 'Contact',
    subType: subType,
    rawBody: cleanBody
  };
  
  // INRUILVERZOEK
  if (subType === 'TradeIn') {
    const kentekenMatch = cleanBody.match(/Kenteken:\s*([^\n]+)/i);
    const kmMatch = cleanBody.match(/Kilometerstand:\s*([^\n]+)/i);
    const remarksMatch = cleanBody.match(/Mankementen:\s*([^\n]+)/i);
    
    result.tradeIn = {
      kenteken: kentekenMatch?.[1]?.trim(),
      mileage: kmMatch?.[1]?.trim(),
      remarks: remarksMatch?.[1]?.trim()
    };
    result.message = `Inruilverzoek via Marktplaats`;
  }
  
  return result;
}

// Enhanced AutoScout24 Parser
function parseAutoScout24Enhanced(body: string, subject: string): ParsedData | null {
  console.log('🚗 Parsing AutoScout24 email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/;/g, ' ').replace(/\s+/g, ' ').trim();
  
  // TRIAGE 1: Aangenomen oproep - negeren
  if (cleanBody.includes('Aangenomen oproep') || subject.includes('Aangenomen oproep')) {
    console.log('📞 AutoScout24 Aangenomen oproep - ignoring');
    return { source: 'AutoScout24', type: 'IgnoredCall', ignored: true };
  }
  
  // TRIAGE 2: Gemiste oproep - speciaal geval
  if (cleanBody.includes('Gemiste oproep') || subject.includes('Gemiste oproep')) {
    console.log('📵 AutoScout24 Gemiste oproep - extracting phone');
    
    const phoneMatch = cleanBody.match(/Telefoonnummer:\s*([^\n\s]+)/i);
    const vehicleMatch = subject.match(/:\s*(.+?)(?:\s*\||$)/i);
    
    if (phoneMatch) {
      return {
        phone: phoneMatch[1].trim(),
        vehicle: vehicleMatch?.[1]?.trim(),
        source: 'AutoScout24',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via AutoScout24`,
        rawBody: cleanBody
      };
    }
  }
  
  // HOOFD-PARSING: Nieuwe aanvraag
  let nameMatch = cleanBody.match(/(?:Nieuwe aanvraag van|Naam|Name):\s*([^\n;]+)/i);
  const emailMatch = cleanBody.match(/(?:E[-\s]?mail(?:adres)?|Email):\s*([^\s<>;]+)/i);
  const phoneMatch = cleanBody.match(/(?:Telefoon(?:nummer)?|Phone):\s*([^\n;]+)/i);
  const messageMatch = cleanBody.match(/(?:Bericht van de koper|Nachricht|Message):\s*([^\n]+)/i);
  
  // Probeer naam uit closing indien niet gevonden
  if (!nameMatch) {
    const greetingMatch = cleanBody.match(/(?:Met vriendelijke groet|bvd,?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (greetingMatch) nameMatch = [greetingMatch[0], greetingMatch[1]];
  }
  
  const vehicleMatch = subject.match(/voor uw\s+(.+?)(?:\s*-|\s*\||$)/i) ||
                       cleanBody.match(/voor uw\s+([^\n;]+?)(?:\s+met|;|$)/i);
  
  const isTradeIn = cleanBody.includes('Inruilaanvraag') || cleanBody.includes('Trade-in');
  
  if (nameMatch && emailMatch) {
    const nameParts = nameMatch[1].trim().split(' ');
    const result: ParsedData = {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: emailMatch[1].trim(),
      phone: phoneMatch?.[1]?.trim(),
      vehicle: vehicleMatch?.[1]?.trim(),
      message: messageMatch?.[1]?.trim(),
      source: 'AutoScout24',
      type: isTradeIn ? 'TradeIn' : 'Contact',
      rawBody: cleanBody
    };
    
    if (isTradeIn) {
      const kentekenMatch = cleanBody.match(/Kenteken:\s*([^\n;]+)/i);
      const mileageMatch = cleanBody.match(/Kilometerstand:\s*([^\n;]+)/i);
      
      result.tradeIn = {
        kenteken: kentekenMatch?.[1]?.trim(),
        mileage: mileageMatch?.[1]?.trim()
      };
    }
    
    return result;
  }
  
  return null;
}

// Generic Lead Parser (fallback)
function parseGenericLead(body: string, subject: string): ParsedData | null {
  console.log('📧 Parsing generic lead email');
  
  const cleanBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const emailMatch = cleanBody.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = cleanBody.match(/(\+?\d[\d\s-]{8,})/);
  const nameMatch = cleanBody.match(/(?:Naam|Name|Van|From):\s*([^\n]+)/i);
  const vehicleMatch = subject.match(/(?:interesse in|vraag over|voor uw)\s+(.+?)(?:\s+-|$)/i);
  
  if (emailMatch) {
    const nameParts = nameMatch?.[1]?.trim().split(' ') || ['Onbekend'];
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || '',
      email: emailMatch[1],
      phone: phoneMatch?.[0],
      vehicle: vehicleMatch?.[1]?.trim(),
      source: 'Website',
      type: 'Contact',
      message: `Generieke lead. Onderwerp: ${subject}. ${cleanBody.substring(0, 300)}...`,
      rawBody: cleanBody
    };
  }
  return null;
}


// Master Email Router
function parseEmail(body: string, subject: string, from: string): ParsedData | null {
  const lowerFrom = from.toLowerCase();
  
  // === FINANCIAL PARTNERS ===
  if (lowerFrom.includes('blokweggroep.nl') || lowerFrom.includes('financiallease.nl')) {
    return parseFinancialPartner(body, from);
  }
  
  // === AUTOSCOUT24 ===
  if (lowerFrom.includes('autoscout24.com')) {
    return parseAutoScout24Enhanced(body, subject);
  }
  
  // === AUTOTRACK ===
  if (lowerFrom.includes('autotrack.nl')) {
    return parseAutoTrackEnhanced(body, subject);
  }
  
  // === MARKTPLAATS ===
  if (lowerFrom.includes('marktplaats.nl')) {
    return parseMarktplaats(body, subject);
  }
  
  // === WEBSITE ===
  if (lowerFrom.includes('morgeninternet.nl')) {
    return parseWebsite(body, subject);
  }
  
  // === FALLBACK ===
  console.log(`⚠️ No specific parser for: ${from}`);
  return parseGenericLead(body, subject);
}

// Gmail API authentication with jose library
async function createJWTAssertion(serviceAccount: ServiceAccount): Promise<string> {
  const userToImpersonate = 'verkoop@auto-city.nl';
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
  ].join(' ');

  // jose library handles PEM->DER conversion automatically
  const privateKey = await jose.importPKCS8(
    serviceAccount.private_key.replace(/\\n/g, '\n'), 
    'RS256'
  );
  
  const jwt = await new jose.SignJWT({ scope: scopes })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id })
    .setIssuedAt()
    .setIssuer(serviceAccount.client_email)
    .setSubject(userToImpersonate)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(privateKey);

  return jwt;
}

async function getAccessToken(serviceAccount: ServiceAccount, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const jwt = await createJWTAssertion(serviceAccount);
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gmail Auth Failed (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error('No access token in response');
      }
      
      console.log('✅ Gmail authentication successful');
      return data.access_token;
    } catch (error) {
      console.error(`❌ Access token attempt ${attempt}/${retries}:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`Failed to get access token after ${retries} attempts: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  throw new Error('Failed to get access token');
}

// Helper function for Gmail API calls with retry logic
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let rateLimitCount = 0;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Handle rate limiting - early exit na 2 keer om timeout te voorkomen
      if (response.status === 429) {
        rateLimitCount++;
        if (rateLimitCount >= 2) {
          console.warn(`⚠️ Rate limited ${rateLimitCount} keer - gestopt om timeout te voorkomen`);
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        const retryAfter = Math.min(parseInt(response.headers.get('Retry-After') || '5'), 5);
        console.log(`⏳ Rate limited (${rateLimitCount}/${retries}), waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      // Log andere HTTP errors met status en body voor betere diagnostiek
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Gmail API error ${response.status}:`, errorBody);
      }
      
      return response;
    } catch (error) {
      // Re-throw RATE_LIMIT_EXCEEDED errors
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        throw error;
      }
      
      console.error(`❌ Fetch attempt ${attempt}/${retries}:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }
  
  throw new Error('Fetch failed after all retries');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_PROCESSING_TIME = 18000; // 18 seconds
  const MAX_MESSAGES_TO_PROCESS = 15;
  
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    parseErrors: 0,
    ignoredNonLead: 0,
    ignoredMarktplaats: 0,
    ignoredCalls: 0,
    missedCalls: 0,
    tradeIns: 0,
    financialLeads: 0,
    rateLimitSkipped: 0,
    errorDetails: [] as string[],
    sourceBreakdown: {} as Record<string, { processed: number; created: number }>
  };

  try {
    console.log('🚀 Starting lead email processing... (v3 - Enhanced parsing + triage)');
    
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    
    console.log('🔑 Getting Gmail API access token...');
    const accessToken = await getAccessToken(serviceAccount);

    // Search for unread emails - SENDER-BASED with exclusions
    // Single-line query with correct Gmail syntax: each domain needs its own from:, and exclusions are individual -subject: statements
    const query = 'is:unread to:verkoop@auto-city.nl (from:autoscout24.com OR from:autotrack.nl OR from:mail.marktplaats.nl OR from:call.marktplaats.nl OR from:morgeninternet.nl OR from:financiallease.nl OR from:blokweggroep.nl) -subject:"Je hebt een reactie ontvangen" -subject:"Gesprek gevoerd" -subject:"uw verkoopkansen" -subject:"advertentiekwaliteit"';
    
    console.log('🔍 Searching for lead emails...');
    
    let messages = [];
    try {
      const searchResponse = await fetchWithRetry(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=15`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`Gmail search failed (${searchResponse.status}): ${errorText}`);
      }

      const searchData = await searchResponse.json();
      messages = searchData.messages || [];
    } catch (error) {
      // Graceful handling van Gmail API errors met specifieke fout-differentiatie
      console.error('❌ Gmail search error:', error.message);
      
      let errorType = 'gmail_search_error';
      // Alleen rate_limit_exceeded als het ECHT die specifieke error is
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        errorType = 'rate_limit_exceeded';
      } else if (error.message.includes('Fetch failed')) {
        errorType = 'gmail_api_timeout';
      }
      // Alle andere errors (400, 403, etc.) blijven 'gmail_search_error' met details in logs
      
      return new Response(
        JSON.stringify({
          success: false,
          errorType,
          error: error.message,
          processed: 0,
          created: 0,
          updated: 0,
          rateLimitSkipped: 0,
          message: errorType === 'rate_limit_exceeded' 
            ? 'Gmail API rate limit bereikt. Probeer over een paar minuten opnieuw.'
            : 'Gmail API tijdelijk niet bereikbaar. Probeer later opnieuw.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    console.log(`📬 Found ${messages.length} potential lead emails`);

    for (const message of messages) {
      // Check timeboxing limits
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > MAX_PROCESSING_TIME || stats.processed >= MAX_MESSAGES_TO_PROCESS) {
        console.log(`⏰ Timeboxing limit bereikt: ${Math.round(elapsedTime/1000)}s / ${stats.processed} messages verwerkt`);
        console.log(`📭 ${messages.length - messages.indexOf(message)} emails overgeslagen - worden bij volgende sync opgepakt`);
        break;
      }
      
      try {
        // Get full message details with retry
        const messageResponse = await fetchWithRetry(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!messageResponse.ok) {
          const errorText = await messageResponse.text();
          throw new Error(`Failed to fetch message (${messageResponse.status}): ${errorText}`);
        }

        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers;
        
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
        const threadId = messageData.threadId;
        const messageId = messageData.id;
        const internalDate = new Date(parseInt(messageData.internalDate));

        // Get email body (prefer text/plain, fallback to text/html stripped)
        let body = '';
        function decodeB64Url(data: string) {
          return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        function extractText(payload: any): string {
          if (!payload) return '';
          if (payload.mimeType === 'text/plain' && payload.body?.data) {
            return decodeB64Url(payload.body.data);
          }
          if (payload.mimeType === 'text/html' && payload.body?.data) {
            const html = decodeB64Url(payload.body.data);
            // Strip HTML tags to plain text
            return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          if (Array.isArray(payload.parts)) {
            // Try to find text/plain first
            const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain');
            if (plain?.body?.data) return decodeB64Url(plain.body.data);
            // Then any nested parts
            for (const part of payload.parts) {
              const txt = extractText(part);
              if (txt) return txt;
            }
          }
          return '';
        }
        if (messageData.payload.body?.data) {
          body = decodeB64Url(messageData.payload.body.data);
        } else {
          body = extractText(messageData.payload);
        }

        console.log(`\n📧 Processing: ${subject} from ${from}`);

        // Parse the email with new master parser
        const parsedData = parseEmail(body, subject, from);
        
        // Check voor expliciet genegeerde emails
        if (parsedData?.ignored) {
          console.log(`📋 Email ignored: ${parsedData.type} from ${parsedData.source}`);
          stats.ignoredNonLead++;
          if (parsedData.type === 'IgnoredCall') stats.ignoredCalls++;
          if (parsedData.source === 'Marktplaats') stats.ignoredMarktplaats++;
          
          // Track source
          if (!stats.sourceBreakdown[parsedData.source]) {
            stats.sourceBreakdown[parsedData.source] = { processed: 0, created: 0 };
          }
          stats.sourceBreakdown[parsedData.source].processed++;
          
          // Mark as read
          await fetchWithRetry(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
            }
          );
          
          stats.processed++;
          continue;
        }
        
        if (!parsedData) {
          console.warn(`⚠️ Could not parse email from: ${from}`);
          console.log(`Subject: ${subject}`);
          console.log(`Body preview: ${body.substring(0, 300)}`);
          stats.parseErrors++;
          stats.errorDetails.push(`Failed to parse: ${subject} (from: ${from})`);
          continue;
        }

        // Track statistics
        if (parsedData.type === 'MissedCall') stats.missedCalls++;
        if (parsedData.type === 'TradeIn') stats.tradeIns++;
        if (parsedData.type === 'FinancialLead') stats.financialLeads++;
        
        if (!stats.sourceBreakdown[parsedData.source]) {
          stats.sourceBreakdown[parsedData.source] = { processed: 0, created: 0 };
        }
        stats.sourceBreakdown[parsedData.source].processed++;

        console.log(`✅ Successfully parsed ${parsedData.type} from ${parsedData.source}:`, parsedData.email || parsedData.phone);

        // Check if thread already exists
        const { data: existingThread, error: threadCheckError } = await supabase
          .from('email_threads')
          .select('id, lead_id')
          .eq('thread_id', threadId)
          .maybeSingle();

        if (threadCheckError) {
          throw new Error(`Database error checking thread: ${threadCheckError.message}`);
        }

        let leadId: string;
        let threadDbId: string;

        if (existingThread) {
          // Thread exists, use existing lead
          leadId = existingThread.lead_id;
          threadDbId = existingThread.id;
          
          console.log(`📌 Existing thread found, using lead: ${leadId}`);

          // Update thread stats - eerst SELECT huidige message_count
          const { data: currentThread, error: selectError } = await supabase
            .from('email_threads')
            .select('message_count')
            .eq('id', threadDbId)
            .single();
          
          if (selectError) {
            throw new Error(`Failed to get thread count: ${selectError.message}`);
          }
          
          const { error: updateError } = await supabase
            .from('email_threads')
            .update({
              last_message_date: internalDate,
              message_count: (currentThread?.message_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', threadDbId);

          if (updateError) {
            throw new Error(`Failed to update thread: ${updateError.message}`);
          }
          
          stats.updated++;
        } else {
          // New thread, create lead
          console.log('🆕 Creating new lead...');
          
          // Build comprehensive notes
          let notes = `Lead van ${parsedData.source}`;
          if (parsedData.type) notes += ` - Type: ${parsedData.type}`;
          if (parsedData.subType) notes += ` (${parsedData.subType})`;
          
          // Add trade-in data if present
          if (parsedData.tradeIn) {
            notes += `\n\n--- INRUILVOORSTEL ---`;
            if (parsedData.tradeIn.kenteken) notes += `\nKenteken: ${parsedData.tradeIn.kenteken}`;
            if (parsedData.tradeIn.mileage) notes += `\nKM-stand: ${parsedData.tradeIn.mileage}`;
            if (parsedData.tradeIn.remarks) notes += `\nOpmerkingen: ${parsedData.tradeIn.remarks}`;
            notes += `\n--------------------`;
          }
          
          // Add vehicle interest
          if (parsedData.vehicle) notes += `\n\nInteresse in: ${parsedData.vehicle}`;
          
          // Add company name for financial leads
          if (parsedData.companyName) notes += `\n\nBedrijf: ${parsedData.companyName}`;
          
          // Add customer message
          if (parsedData.message) notes += `\n\nBericht: ${parsedData.message}`;
          
          // Determine urgency and intent
          const urgency = parsedData.type === 'MissedCall' ? 'high' : 'medium';
          const intent = parsedData.type === 'TradeIn' ? 'inruil_aanvraag' : 
                        parsedData.type === 'FinancialLead' ? 'financiering_aanvraag' :
                        'informatie_aanvraag';
          
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              first_name: parsedData.firstName || 'Onbekend',
              last_name: parsedData.lastName || '',
              email: parsedData.email || null,
              phone: parsedData.phone || null,
              source_email: from,
              email_thread_id: threadId,
              intent_classification: intent,
              urgency_level: urgency,
              status: 'new',
              priority: urgency === 'high' ? 'high' : 'medium',
              interested_vehicle: null,
            })
            .select()
            .single();

          if (leadError) {
            throw new Error(`Failed to create lead: ${leadError.message}`);
          }
          
          if (!newLead) {
            throw new Error('Lead creation returned no data');
          }
          
          leadId = newLead.id;
          stats.created++;
          stats.sourceBreakdown[parsedData.source].created++;

          console.log(`✅ Lead created: ${leadId} (${parsedData.type})`);

          // Create thread record
          const { data: newThread, error: threadError } = await supabase
            .from('email_threads')
            .insert({
              thread_id: threadId,
              lead_id: leadId,
              subject: subject,
              participants: [from, 'verkoop@auto-city.nl'],
              first_message_date: internalDate,
              last_message_date: internalDate,
              message_count: 1
            })
            .select()
            .single();

          if (threadError) {
            throw new Error(`Failed to create thread: ${threadError.message}`);
          }
          
          if (!newThread) {
            throw new Error('Thread creation returned no data');
          }
          
          threadDbId = newThread.id;
        }

        // Store message
        const { error: messageError } = await supabase
          .from('email_messages')
          .insert({
            thread_id: threadDbId,
            lead_id: leadId,
            message_id: messageId,
            sender: from,
            recipient: 'verkoop@auto-city.nl',
            subject: subject,
            body: body,
            received_at: internalDate,
            is_from_customer: true,
            portal_source: parsedData.source,
            parsed_data: {
              name: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
              email: parsedData.email,
              phone: parsedData.phone,
              vehicle: parsedData.vehicle,
              companyName: parsedData.companyName,
              type: parsedData.type,
              subType: parsedData.subType,
              tradeIn: parsedData.tradeIn,
              message: parsedData.message
            }
          });

        if (messageError) {
          throw new Error(`Failed to store message: ${messageError.message}`);
        }

        // Mark email as read
        await fetchWithRetry(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              removeLabelIds: ['UNREAD']
            })
          }
        );

        stats.processed++;
        console.log(`✅ Processed and marked as read`);

      } catch (error) {
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
          console.warn(`⏭️ Skipping message ${message.id} door rate limiting - probeer later opnieuw`);
          stats.rateLimitSkipped = (stats.rateLimitSkipped || 0) + 1;
        } else {
          console.error(`❌ Error processing message ${message.id}:`, error);
          stats.errorDetails.push(`${message.id}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Email Triage Complete:');
    console.log(`  📧 Totaal verwerkt: ${stats.processed}`);
    console.log(`  ✅ Nieuwe leads: ${stats.created}`);
    console.log(`  🔄 Bestaande threads: ${stats.updated}`);
    console.log(`  ⏭️ Marktplaats (genegeerd): ${stats.ignoredMarktplaats}`);
    console.log(`  📞 Gemiste oproepen: ${stats.missedCalls}`);
    console.log(`  🔁 Inruilaanvragen: ${stats.tradeIns}`);
    console.log(`  💼 Financial Lease: ${stats.financialLeads}`);
    console.log('\n📈 Per Bron:', stats.sourceBreakdown);

    return new Response(
      JSON.stringify({
        success: true,
        processed: stats.processed,
        created: stats.created,
        updated: stats.updated,
        parseErrors: stats.parseErrors,
        ignoredNonLead: stats.ignoredNonLead,
        ignoredMarktplaats: stats.ignoredMarktplaats,
        ignoredCalls: stats.ignoredCalls,
        missedCalls: stats.missedCalls,
        tradeIns: stats.tradeIns,
        financialLeads: stats.financialLeads,
        rateLimitSkipped: stats.rateLimitSkipped || 0,
        sourceBreakdown: stats.sourceBreakdown,
        errorDetails: stats.errorDetails.slice(0, 10)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Critical function error:', error);
    
    // Altijd 200 teruggeven met success:false voor betere CORS handling
    return new Response(
      JSON.stringify({ 
        success: false,
        errorType: 'critical_error',
        error: error.message,
        processed: stats.processed || 0,
        created: stats.created || 0,
        updated: stats.updated || 0,
        rateLimitSkipped: stats.rateLimitSkipped || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
