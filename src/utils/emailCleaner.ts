/**
 * Email Text Cleaner - Fase 1.2
 * Removes HTML entities, tags, and normalizes whitespace for clean email display
 */

export function cleanEmailText(rawHtml: string): string {
  if (!rawHtml) return '';
  
  let cleaned = rawHtml;
  
  // Step 1: Decode HTML entities FIRST (most common ones)
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&euro;/gi, '€')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™')
    // Decode numeric entities
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Step 2: Strip HTML tags (but preserve line breaks)
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');
  
  // Step 3: Normalize whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')           // Multiple spaces/tabs -> single space
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Multiple blank lines -> max 2 newlines
    .replace(/^\s+|\s+$/gm, '')        // Trim lines
    .trim();
  
  return cleaned;
}

export function extractPlainText(htmlOrPlain: string): string {
  if (!htmlOrPlain) return '';
  
  // Check if it's HTML or plain text
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(htmlOrPlain);
  
  if (hasHtmlTags) {
    return cleanEmailText(htmlOrPlain);
  }
  
  // If it's already plain text, only decode entities
  return htmlOrPlain
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .trim();
}

/**
 * Preserves email structure while cleaning HTML
 * Useful for displaying in <pre> or whitespace-pre-wrap
 */
export function cleanEmailForDisplay(emailBody: string): string {
  return cleanEmailText(emailBody);
}

/**
 * Portal-specific message cleaning - extracts only customer message
 */
export function extractCustomerMessage(body: string, source: string): string {
  if (!body) return '';
  
  const cleanBody = cleanEmailText(body);
  
  switch (source.toLowerCase()) {
    case 'autoscout24':
      return cleanAutoScout24Message(cleanBody);
    case 'marktplaats':
      return cleanMarktplaatsMessage(cleanBody);
    case 'autotrack':
      return cleanAutoTrackMessage(cleanBody);
    default:
      return cleanBody;
  }
}

function cleanAutoScout24Message(text: string): string {
  // Extract message between "Bericht van de koper:" and "Met vriendelijke groet"
  let message = text;
  
  const berichtMatch = text.match(/(?:Bericht van de koper|Message|Nachricht):\s*([\s\S]*?)(?=Met vriendelijke groet|Bekijk advertentie|View|$)/i);
  if (berichtMatch) {
    message = berichtMatch[1].trim();
  }
  
  // Remove portal footer noise
  message = message
    .replace(/Antwoorden op:[\s\S]*?(?=\n\n|$)/i, '')
    .replace(/Bekijk advertentie[\s\S]*$/i, '')
    .replace(/View (?:vehicle|ad)[\s\S]*$/i, '')
    .trim();
  
  return message || text;
}

function cleanMarktplaatsMessage(text: string): string {
  // Extract message from "Vraag:" or "Bericht:" section
  let message = text;
  
  const vraagMatch = text.match(/(?:Vraag|Bericht):\s*([\s\S]*?)(?=Verkoper|Bekijk advertentie|$)/i);
  if (vraagMatch) {
    message = vraagMatch[1].trim();
  }
  
  // Remove seller info and footer
  message = message
    .replace(/Verkoper[\s\S]*$/i, '')
    .replace(/Bekijk advertentie[\s\S]*$/i, '')
    .replace(/Marktplaats[\s\S]*$/i, '')
    .trim();
  
  return message || text;
}

function cleanAutoTrackMessage(text: string): string {
  // Extract message from "Bericht:" section
  let message = text;
  
  const berichtMatch = text.match(/Bericht:\s*([\s\S]*?)(?=Gewenste|Voertuig|Auto:|$)/i);
  if (berichtMatch) {
    message = berichtMatch[1].trim();
  }
  
  // Remove AutoTrack footer
  message = message
    .replace(/AutoTrack[\s\S]*$/i, '')
    .replace(/Naar de advertentie[\s\S]*$/i, '')
    .trim();
  
  return message || text;
}

/**
 * Extract advertisement URL from email body
 */
export function extractAdvertisementUrl(body: string, source: string): string | null {
  if (!body) return null;
  
  // URL patterns for each portal
  const patterns: Record<string, RegExp[]> = {
    autoscout24: [
      /https?:\/\/(?:www\.)?autoscout24\.nl\/aanbod\/[^\s<>"]+/i,
      /https?:\/\/(?:www\.)?autoscout24\.com\/offers\/[^\s<>"]+/i
    ],
    marktplaats: [
      /https?:\/\/(?:www\.)?marktplaats\.nl\/[alv]\/[^\s<>"]+/i,
      /https?:\/\/link\.marktplaats\.nl\/[^\s<>"]+/i
    ],
    autotrack: [
      /https?:\/\/(?:www\.)?autotrack\.nl\/[^\s<>"]+/i,
      /https?:\/\/(?:auto-city\.)?autotrack\.nl\/[^\s<>"]+/i
    ]
  };
  
  const sourcePatterns = patterns[source.toLowerCase()] || [];
  
  for (const pattern of sourcePatterns) {
    const match = body.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}
