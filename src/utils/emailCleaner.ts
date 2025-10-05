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
