import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// DOM-Based Email Body Decoder
function decodeEmailBody(payload: any): { plain: string; html: string } {
  let plain = '';
  let html = '';

  function findParts(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      plain += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    if (part.parts) {
      part.parts.forEach(findParts);
    }
  }

  findParts(payload);
  return { plain, html };
}

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
  cleanMessage?: string;  // NEW: Schone klantboodschap
  vehicleUrl?: string;    // NEW: Advertentie link
}

// Fase 1.3: Lead Temperature Classification
function classifyLeadTemperature(parsedData: ParsedData): {
  temperature: 'hot' | 'warm' | 'cold' | 'ice';
  type: string;
} {
  
  // 🔥 HOT LEADS (directe actie vereist - hoogste prioriteit)
  if (parsedData.type === 'FinancialLead') {
    return { temperature: 'hot', type: 'financial_approved' };
  }
  if (parsedData.subType === 'Proefritaanvraag') {
    return { temperature: 'hot', type: 'test_drive_request' };
  }
  if (parsedData.type === 'TradeIn') {
    return { temperature: 'hot', type: 'trade_in_request' };
  }
  
  // 🟡 WARM LEADS (standaard opvolging binnen 24u)
  if (parsedData.subType === 'Terugbelverzoek') {
    return { temperature: 'warm', type: 'callback_request' };
  }
  if (parsedData.type === 'Contact' && parsedData.vehicle) {
    return { temperature: 'warm', type: 'vehicle_inquiry' };
  }
  if (parsedData.type === 'Contact') {
    return { temperature: 'warm', type: 'general_inquiry' };
  }
  
  // 🔵 COLD LEADS (opvolging binnen 48u)
  if (parsedData.type === 'MissedCall') {
    return { temperature: 'cold', type: 'missed_call' };
  }
  
  // ❄️ ICE (genegeerd - geen lead)
  if (parsedData.ignored) {
    return { temperature: 'ice', type: 'ignored' };
  }
  
  // Default: warm
  return { temperature: 'warm', type: 'general_inquiry' };
}

// Fase 1.1: Waterdichte De-Duplicatie Helper
function extractPhoneFromBody(body: string): string | null {
  const phoneMatch = body.match(/(\+31\s?6?\s?\d{8,10}|\+31\s?\d{1,2}\s?\d{7,8}|06[-\s]?\d{8})/);
  return phoneMatch ? phoneMatch[1].replace(/\s/g, '') : null;
}

// Financial Partner Parser (Blokweg Groep + FinancialLease.nl)
function parseFinancialPartner(body: string, from: string, replyTo?: string): ParsedData | null {
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
function parseWebsite(body: string, subject: string, replyTo?: string): ParsedData | null {
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

// Enhanced AutoTrack Parser - DOM Based
function parseAutoTrackEnhanced(plainBody: string, htmlBody: string, subject: string, replyTo?: string): ParsedData | null {
  console.log('🏁 Parsing AutoTrack email (DOM-based v2)');
  
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  const subjectLower = subject.toLowerCase();
  
  // Extract customer email
  let customerEmail = replyTo;
  if (!customerEmail) {
    const emailMatch = plainBody.match(/\*E-mailadres:\*\s*([^\s<>\*]+@[^\s<>\*]+)/i) ||
                       plainBody.match(/E-mailadres:\s*([^\s<>\*]+@[^\s<>\*]+)/i);
    if (emailMatch) customerEmail = emailMatch[1].trim();
  }
  
  // Extract advertisement URL
  let vehicleUrl = '';
  if (doc) {
    const links = Array.from(doc.querySelectorAll('a'));
    const autotrackLink = links.find(a => a.getAttribute('href')?.includes('autotrack.nl/a/'));
    if (autotrackLink) {
      vehicleUrl = autotrackLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/www\.autotrack\.nl\/a\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // Extract clean customer message
  let cleanMessage = '';
  const berichtMatch = plainBody.match(/\*?Bericht\*?[:\s]+([\s\S]*?)(?=\*?Met vriendelijke groet|Gewenste|Wat vond je|©|autotrack is onderdeel|$)/i);
  if (berichtMatch) {
    cleanMessage = berichtMatch[1]
      .replace(/\*Naam\*?:.*$/im, '')
      .replace(/\*E-mailadres\*?:.*$/im, '')
      .replace(/\*Telefoonnummer\*?:.*$/im, '')
      .replace(/autotrack is onderdeel van.*$/i, '')
      .replace(/postbus.*$/i, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  // TRIAGE 1: Oproep ontvangen - negeren
  if (plainBody.includes('Oproep ontvangen') || subjectLower.includes('oproep ontvangen')) {
    console.log('📞 AutoTrack Oproep ontvangen - ignoring');
    return { source: 'AutoTrack', type: 'IgnoredCall', ignored: true };
  }
  
  // TRIAGE 2: Oproep gemist - speciaal geval
  if (plainBody.includes('Oproep gemist') || subjectLower.includes('oproep gemist')) {
    console.log('📵 AutoTrack Oproep gemist - extracting phone');
    
    const phoneMatch = plainBody.match(/Telefoonnummer:\s*([^\n]+)/i);
    const vehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
    
    if (phoneMatch) {
      return {
        phone: phoneMatch[1].trim(),
        vehicle: vehicleMatch?.[1]?.trim(),
        source: 'AutoTrack',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via AutoTrack`,
        rawBody: plainBody
      };
    }
  }
  
  // SUBTYPE DETECTIE
  let subType = 'Contact';
  if (plainBody.includes('Inruilaanvraag')) subType = 'Inruilaanvraag';
  else if (plainBody.includes('Terugbelverzoek')) subType = 'Terugbelverzoek';
  else if (plainBody.includes('Proefritaanvraag')) subType = 'Proefritaanvraag';
  
  // Match name
  const nameMatch = plainBody.match(/\*Naam:\*\s*([^\n\*]+)/i) ||
                    plainBody.match(/Naam:\s*([^\n\*]+)/i);
  
  // Match phone
  const phoneMatch = plainBody.match(/\*Telefoonnummer:\*\s*([^\n\*\s]+)/i) ||
                     plainBody.match(/Telefoonnummer:\s*([^\n\*\s]+)/i);
  
  const vehicleMatch = plainBody.match(/(?:Voertuig|Auto):\s*([^\n]+)/i) ||
                       subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
  
  if (!nameMatch || !customerEmail) {
    console.log('❌ AutoTrack parse failed - missing name or email');
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: customerEmail,
    phone: phoneMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    cleanMessage: cleanMessage,      // Schone boodschap!
    vehicleUrl: vehicleUrl || undefined,  // Advertentie link!
    source: 'AutoTrack',
    type: subType === 'Inruilaanvraag' ? 'TradeIn' : 'Contact',
    subType: subType,
    rawBody: plainBody
  };
  
  if (subType === 'Inruilaanvraag') {
    const kentekenMatch = plainBody.match(/Kenteken:\s*([^\n]+)/i);
    const kmMatch = plainBody.match(/Kilometerstand:\s*([^\n]+)/i);
    const stateMatch = plainBody.match(/Staat van inruilauto:\s*([^\n]+)/i);
    const descMatch = plainBody.match(/Beschrijving inruilauto:\s*([^\n]+)/i);
    
    result.tradeIn = {
      kenteken: kentekenMatch?.[1]?.trim(),
      mileage: kmMatch?.[1]?.trim(),
      state: stateMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim()
    };
    result.message = `Inruilaanvraag via AutoTrack`;
  } else if (subType === 'Terugbelverzoek') {
    const dagMatch = plainBody.match(/Gewenste dag:\s*([^\n]+)/i);
    const tijdMatch = plainBody.match(/Gewenste tijd:\s*([^\n]+)/i);
    result.message = `Terugbelverzoek - ${dagMatch?.[1]?.trim() || ''} ${tijdMatch?.[1]?.trim() || ''}`.trim();
  } else if (subType === 'Proefritaanvraag') {
    const dagMatch = plainBody.match(/Gewenste dag:\s*([^\n]+)/i);
    result.message = `Proefritaanvraag - ${dagMatch?.[1]?.trim() || ''}`.trim();
  }
  
  return result;
}

// Marktplaats Parser - DOM Based
function parseMarktplaats(plainBody: string, htmlBody: string, subject: string, replyTo?: string): ParsedData | null {
  console.log('🛒 Parsing Marktplaats email (DOM-based v2)');
  
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  const lowerSubject = subject.toLowerCase();
  
  // Extract customer email
  let customerEmail = replyTo;
  if (!customerEmail) {
    const emailMatch = plainBody.match(/E-mailadres:\s*([^\s<>]+@[^\s<>]+)/i);
    if (emailMatch) customerEmail = emailMatch[1].trim();
  }
  
  // Extract advertisement URL
  let vehicleUrl = '';
  if (doc) {
    const links = Array.from(doc.querySelectorAll('a'));
    const mpLink = links.find(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('marktplaats.nl') && (href.includes('/a/') || href.includes('/v/') || href.includes('/l/'));
    });
    if (mpLink) {
      vehicleUrl = mpLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/(?:www\.)?marktplaats\.nl\/[alv]\/[^\s<>"]+/i)?.[0] || 
                 htmlBody.match(/https?:\/\/link\.marktplaats\.nl\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // Extract clean customer message
  let cleanMessage = '';
  const vraagMatch = plainBody.match(/(?:Vraag|Bericht)[:\s]+([\s\S]*?)(?=Verkoper|Bekijk advertentie|$)/i);
  if (vraagMatch) {
    cleanMessage = vraagMatch[1]
      .replace(/Verkoper[\s\S]*$/i, '')
      .replace(/Bekijk advertentie[\s\S]*$/i, '')
      .trim();
  }
  
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
    const mpPhoneMatch = plainBody.match(/Telefoonnummer:\s*([^\n]+)/i);
    const mpVehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i);
    
    if (mpPhoneMatch) {
      return {
        phone: mpPhoneMatch[1].trim(),
        vehicle: mpVehicleMatch?.[1]?.trim(),
        source: 'Marktplaats',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via Marktplaats`,
        rawBody: plainBody
      };
    }
  }
  
  // NORMALE PARSING
  const nameMatch = plainBody.match(/(?:Naam|Van):\s*([^\n]+)/i);
  const phoneMatch = plainBody.match(/Telefoonnummer:\s*([^\n]+)/i);
  const vehicleMatch = subject.match(/voor\s+(.+?)(?:\s*-|$)/i) ||
                       plainBody.match(/(?:Voertuig|Advertentie):\s*([^\n]+)/i);
  
  if (!nameMatch || !customerEmail) {
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: customerEmail,
    phone: phoneMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    cleanMessage: cleanMessage,          // Schone boodschap!
    vehicleUrl: vehicleUrl || undefined, // Advertentie link!
    source: 'Marktplaats',
    type: subType === 'TradeIn' ? 'TradeIn' : 'Contact',
    subType: subType,
    rawBody: plainBody
  };
  
  // INRUILVERZOEK
  if (subType === 'TradeIn') {
    const kentekenMatch = plainBody.match(/Kenteken:\s*([^\n]+)/i);
    const kmMatch = plainBody.match(/Kilometerstand:\s*([^\n]+)/i);
    const remarksMatch = plainBody.match(/Mankementen:\s*([^\n]+)/i);
    
    result.tradeIn = {
      kenteken: kentekenMatch?.[1]?.trim(),
      mileage: kmMatch?.[1]?.trim(),
      remarks: remarksMatch?.[1]?.trim()
    };
    result.message = `Inruilverzoek via Marktplaats`;
  }
  
  return result;
}

// Enhanced AutoScout24 Parser - DOM Based
function parseAutoScout24Enhanced(plainBody: string, htmlBody: string, subject: string, replyTo?: string): ParsedData | null {
  console.log('🚗 Parsing AutoScout24 email (DOM-based v2)');
  
  // Use DOMParser for intelligent extraction
  const doc = new DOMParser().parseFromString(htmlBody, 'text/html');
  if (!doc) {
    console.log('⚠️ Could not parse HTML, falling back to plain text');
  }
  
  const subjectLower = subject.toLowerCase();
  
  // TRIAGE: Ignore "aangenomen oproep"
  if (subjectLower.includes('aangenomen oproep')) {
    console.log('📞 AutoScout24 Aangenomen oproep - ignoring');
    return { source: 'AutoScout24', type: 'IgnoredCall', ignored: true };
  }
  
  // Extract customer email (most reliable method)
  let customerEmail = replyTo;
  if (!customerEmail && doc) {
    // Look for "Antwoorden op:" text and grab the link after it
    const elements = Array.from(doc.querySelectorAll('td, span, div'));
    const replyToElement = elements.find(el => el.textContent.includes('Antwoorden op:'));
    if (replyToElement) {
      const mailtoLink = replyToElement.querySelector('a[href^="mailto:"]');
      if (mailtoLink) {
        customerEmail = mailtoLink.getAttribute('href')?.replace('mailto:', '');
      }
    }
  }
  // Fallback to plain text regex
  if (!customerEmail) {
    const emailMatch = plainBody.match(/E-mailadres:\s*([^\s<>]+)/i);
    if (emailMatch) customerEmail = emailMatch[1];
  }
  
  // Extract clean customer message
  let cleanMessage = '';
  if (doc) {
    const messageHeader = Array.from(doc.querySelectorAll('td, div')).find(el => 
      el.textContent.includes('Bericht van de koper')
    );
    if (messageHeader) {
      let nextElement = messageHeader.nextElementSibling;
      while(nextElement && nextElement.textContent.trim().length < 2) {
        nextElement = nextElement.nextElementSibling;
      }
      if(nextElement) {
        cleanMessage = nextElement.textContent.trim();
      }
    }
  }
  // Fallback to plain text regex
  if (!cleanMessage) {
    const msgMatch = plainBody.match(/Bericht van de koper\s*([\s\S]*?)(?=Met vriendelijke groet|Bekijk advertentie)/i);
    if (msgMatch) cleanMessage = msgMatch[1].trim();
  }
  
  // Extract advertisement URL
  let vehicleUrl = '';
  if (doc) {
    const adLink = Array.from(doc.querySelectorAll('a')).find(el => 
      el.textContent.includes('Bekijk advertentie')
    );
    if (adLink) {
      vehicleUrl = adLink.getAttribute('href') || '';
    }
  }
  if (!vehicleUrl) {
    vehicleUrl = htmlBody.match(/https?:\/\/(?:www\.)?autoscout24\.(?:nl|com)\/aanbod\/[^\s<>"]+/i)?.[0] || '';
  }
  
  // TRIAGE: Gemiste oproep - speciaal geval
  if (subjectLower.includes('gemiste oproep')) {
    console.log('📵 AutoScout24 Gemiste oproep - extracting phone');
    
    const missedCallPhone = plainBody.match(/Telefoonnummer:\s*([^\n\s]+)/i);
    const vehicleMatch = subject.match(/:\s*(.+?)(?:\s*\||$)/i);
    
    if (missedCallPhone) {
      return {
        phone: missedCallPhone[1].trim(),
        vehicle: vehicleMatch?.[1]?.trim(),
        source: 'AutoScout24',
        type: 'MissedCall',
        message: `Gemiste oproep - klant gebeld via AutoScout24`,
        rawBody: plainBody
      };
    }
  }
  
  // Extract other data from plain text
  let nameMatch = plainBody.match(/(?:Nieuwe aanvraag van|Naam|Name):\s*([^\n;]+)/i);
  const phoneMatch = plainBody.match(/(?:Telefoon(?:nummer)?|Phone):\s*([^\n;]+)/i);
  
  // Try name from closing if not found
  if (!nameMatch) {
    const greetingMatch = plainBody.match(/(?:Met vriendelijke groet|bvd,?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (greetingMatch) nameMatch = [greetingMatch[0], greetingMatch[1]];
  }
  
  const vehicleMatch = subject.match(/voor uw\s+(.+?)(?:\s*-|\s*\||$)/i) ||
                       plainBody.match(/voor uw\s+([^\n;]+?)(?:\s+met|;|$)/i);
  
  const isTradeIn = plainBody.includes('Inruilaanvraag') || plainBody.includes('Trade-in');
  
  // Validate minimum data
  if (!nameMatch || !customerEmail) {
    console.log('❌ AutoScout24 - Missing name or email');
    return null;
  }
  
  const nameParts = nameMatch[1].trim().split(' ');
  const result: ParsedData = {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(' ') || nameParts[0],
    email: customerEmail,
    phone: phoneMatch?.[1]?.trim(),
    vehicle: vehicleMatch?.[1]?.trim(),
    cleanMessage: cleanMessage,     // Schone boodschap!
    vehicleUrl: vehicleUrl || undefined,  // Advertentie link!
    source: 'AutoScout24',
    type: isTradeIn ? 'TradeIn' : 'Contact',
    rawBody: plainBody
  };
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
function parseGenericLead(body: string, subject: string, replyTo?: string): ParsedData | null {
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


// Master Email Router - DOM Based
function parseEmail(plainBody: string, htmlBody: string, subject: string, from: string, replyTo?: string): ParsedData | null {
  const lowerFrom = from.toLowerCase();
  
  // === FINANCIAL PARTNERS ===
  if (lowerFrom.includes('blokweggroep.nl') || lowerFrom.includes('financiallease.nl')) {
    return parseFinancialPartner(plainBody, from, replyTo);
  }
  
  // === AUTOSCOUT24 ===
  if (lowerFrom.includes('autoscout24.com')) {
    return parseAutoScout24Enhanced(plainBody, htmlBody, subject, replyTo);
  }
  
  // === AUTOTRACK ===
  if (lowerFrom.includes('autotrack.nl')) {
    return parseAutoTrackEnhanced(plainBody, htmlBody, subject, replyTo);
  }
  
  // === MARKTPLAATS ===
  if (lowerFrom.includes('marktplaats.nl')) {
    return parseMarktplaats(plainBody, htmlBody, subject, replyTo);
  }
  
  // === WEBSITE ===
  if (lowerFrom.includes('morgeninternet.nl')) {
    return parseWebsite(plainBody, subject, replyTo);
  }
  
  // === FALLBACK ===
  console.log(`⚠️ No specific parser for: ${from}`);
  return parseGenericLead(plainBody, subject, replyTo);
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
async function fetchWithRetry(url: string, options: RequestInit, retries = 5): Promise<Response> {
  const backoffs = [2000, 5000, 15000, 30000, 60000];
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Handle Gmail rate limits (429) and quota/userRateLimitExceeded (403 with body)
      if (response.status === 429 || response.status === 403) {
        let isRateLimit = response.status === 429;
        if (response.status === 403) {
          const bodyText = await response.clone().text().catch(() => '');
          isRateLimit = /rate.*limit|quota.*exceeded|userRateLimitExceeded/i.test(bodyText);
        }
        if (isRateLimit) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryMs = retryAfterHeader
            ? Math.min(Number(retryAfterHeader) * 1000, 60000)
            : backoffs[Math.min(attempt - 1, backoffs.length - 1)];
          console.log(`⏳ Rate limited (${attempt}/${retries}). Waiting ${Math.round(retryMs/1000)}s...`);
          await new Promise(r => setTimeout(r, retryMs));
          continue;
        }
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`❌ Gmail API error ${response.status}:`, errorBody);
      }

      return response;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      const delay = backoffs[Math.min(attempt - 1, backoffs.length - 1)];
      console.warn(`⚠️ Fetch attempt ${attempt}/${retries} failed. Retrying in ${Math.round(delay/1000)}s...`, err?.message || err);
      await new Promise(r => setTimeout(r, delay));
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
  const MAX_MESSAGES_TO_PROCESS = 5;
  const MESSAGE_FETCH_DELAY_MS = 350;
  
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
    const query = 'is:unread newer_than:2d to:verkoop@auto-city.nl (from:autoscout24.com OR from:autotrack.nl OR from:mail.marktplaats.nl OR from:call.marktplaats.nl OR from:morgeninternet.nl OR from:financiallease.nl OR from:blokweggroep.nl) -subject:"Je hebt een reactie ontvangen" -subject:"Gesprek gevoerd" -subject:"uw verkoopkansen" -subject:"advertentiekwaliteit"';
    
    console.log('🔍 Searching for lead emails...');
    
    let messages = [];
    try {
      const searchResponse = await fetchWithRetry(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`,
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
        // Small delay to avoid Gmail burst detection
        await new Promise((resolve) => setTimeout(resolve, MESSAGE_FETCH_DELAY_MS));
        const headers = messageData.payload.headers;
        
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const replyTo = headers.find((h: any) => h.name.toLowerCase() === 'reply-to')?.value || '';
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
        const threadId = messageData.threadId;
        const messageId = messageData.id;
        const internalDate = new Date(parseInt(messageData.internalDate));

        // Decode email body (both plain and HTML)
        const { plain: plainBody, html: htmlBody } = decodeEmailBody(messageData.payload);

        console.log(`\n📧 Processing: ${subject} from ${from}`);
        if (replyTo && replyTo !== from) {
          console.log(`📬 Reply-To found: ${replyTo}`);
        }

        // Parse the email with DOM-based parser (passes both plain and HTML)
        const parsedData = parseEmail(plainBody, htmlBody, subject, from, replyTo);
        
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

        // Fase 1.1: Waterdichte De-Duplicatie
        // STAP 1 & 2: Check op threadId (native of inReplyTo)
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
        let isNewLead = false;

        if (existingThread) {
          // Thread exists, use existing lead
          leadId = existingThread.lead_id;
          threadDbId = existingThread.id;
          
          console.log(`🔗 Thread match found - reusing lead: ${leadId}`);

          // Update thread stats
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
          // STAP 3 & 4: No thread found, check for existing lead by email/phone
          const emailToCheck = parsedData.email;
          const phoneToCheck = parsedData.phone || extractPhoneFromBody(body);
          
          let existingLead = null;
          
          if (emailToCheck && phoneToCheck) {
            // Check email OR phone
            const { data } = await supabase
              .from('leads')
              .select('id')
              .or(`email.eq.${emailToCheck},phone.eq.${phoneToCheck}`)
              .maybeSingle();
            existingLead = data;
            if (existingLead) console.log('👤 Contact match (email/phone) - reusing lead:', existingLead.id);
          } else if (emailToCheck) {
            // Check only email
            const { data } = await supabase
              .from('leads')
              .select('id')
              .eq('email', emailToCheck)
              .maybeSingle();
            existingLead = data;
            if (existingLead) console.log('📧 Email-only match - reusing lead:', existingLead.id);
          }
          
          if (existingLead) {
            // Existing lead found - link to new thread
            leadId = existingLead.id;
            isNewLead = false;
          } else {
            // STAP 5: No match - create new lead
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
          
          // Fase 1.3: Use intelligent classification
          const classification = classifyLeadTemperature(parsedData);
          const urgency = classification.temperature === 'hot' ? 'high' : 
                         classification.temperature === 'warm' ? 'medium' : 'low';
          const intent = parsedData.type === 'TradeIn' ? 'inruil_aanvraag' : 
                        parsedData.type === 'FinancialLead' ? 'financiering_aanvraag' :
                        'informatie_aanvraag';
          
          console.log(`🌡️ Lead classified as ${classification.temperature.toUpperCase()} - Type: ${classification.type}`);
          
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
              lead_temperature: classification.temperature,
              lead_type: classification.type,
              status: 'new',
              priority: urgency === 'high' ? 'high' : 'medium',
              interested_vehicle: null,
              vehicle_url: parsedData.vehicleUrl || null,  // NEW: Advertentie link!
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
          }
          
          // Create or link thread
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

        // Store message with cleaned body and HTML
        const { error: messageError } = await supabase
          .from('email_messages')
          .insert({
            thread_id: threadDbId,
            lead_id: leadId,
            message_id: messageId,
            sender: from,
            recipient: 'verkoop@auto-city.nl',
            subject: subject,
            body: plainBody,           // Plain text body
            html_body: htmlBody,       // HTML body
            clean_customer_message: parsedData.cleanMessage || null,  // NEW: Schone klantboodschap!
            received_at: internalDate,
            is_from_customer: true,
            portal_source: parsedData.source,
            parsed_data: {
              name: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
              email: parsedData.email,
              phone: parsedData.phone,
              vehicle: parsedData.vehicle,
              vehicleUrl: parsedData.vehicleUrl,
              companyName: parsedData.companyName,
              type: parsedData.type,
              subType: parsedData.subType,
              cleanMessage: parsedData.cleanMessage,
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
