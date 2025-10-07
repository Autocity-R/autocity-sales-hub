export interface ParsedLead {
  platform: string;
  platformIcon: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerMessage: string;
  vehicleTitle?: string;
  vehiclePrice?: string;
  kenteken?: string;
  advertUrl?: string;
  leadType: string;
  priority: number;
}

export class EmailParserService {
  static parseEmail(emailContent: string, subject: string = '', fromAddress: string = ''): ParsedLead {
    const platform = this.detectPlatform(fromAddress, subject, emailContent);
    
    switch (platform) {
      case 'marktplaats':
        return this.parseMarktplaatsEmail(emailContent, subject);
      case 'autoscout24':
        return this.parseAutoScout24Email(emailContent, subject);
      case 'autotrack':
        return this.parseAutoTrackEmail(emailContent, subject);
      case 'website':
        return this.parseWebsiteEmail(emailContent, subject);
      default:
        return this.parseGenericEmail(emailContent, subject);
    }
  }
  
  private static detectPlatform(fromAddress: string, subject: string, emailContent: string): string {
    const lowerFrom = fromAddress.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    const lowerContent = emailContent.toLowerCase();
    
    if (lowerFrom.includes('marktplaats.nl') || lowerSubject.includes('marktplaats') || lowerContent.includes('marktplaats.nl')) return 'marktplaats';
    if (lowerFrom.includes('autoscout24') || lowerSubject.includes('autoscout24') || lowerContent.includes('autoscout24')) return 'autoscout24';
    if (lowerFrom.includes('autotrack.nl') || lowerSubject.includes('autotrack') || lowerContent.includes('autotrack.nl')) return 'autotrack';
    if (lowerFrom.includes('morgeninternet.nl') || lowerSubject.includes('website') || lowerContent.includes('contactformulier')) return 'website';
    
    return 'generic';
  }
  
  private static parseMarktplaatsEmail(emailContent: string, subject: string): ParsedLead {
    const customerNameMatch = emailContent.match(/Je hebt een reactie ontvangen van ([^:]+?):/i) ||
                               emailContent.match(/(?:van|from):\s*([^\n]+)/i);
    
    // Try to extract message content more intelligently
    let messageContent = emailContent;
    const reactieMatch = emailContent.match(/Je hebt een reactie ontvangen van [^:]+?:\s*\n+([\s\S]+?)(?:\n\n-+|advertentie|klik hier|marktplaats\.nl)/is);
    if (reactieMatch) {
      messageContent = reactieMatch[1];
    } else {
      const berichtMatch = emailContent.match(/(?:bericht|reactie)[:\s]*\n+([\s\S]+?)(?:\n\n-+|advertentie|klik hier)/is);
      if (berichtMatch) {
        messageContent = berichtMatch[1];
      }
    }
    
    const advertUrlMatch = emailContent.match(/(https?:\/\/[^\s]+marktplaats[^\s]+)/i);
    const vehicleMatch = subject.match(/reactie op (.+?)$/i) || subject.match(/(.+?)(?:\s*-\s*Marktplaats)?$/i);
    
    return {
      platform: 'Marktplaats',
      platformIcon: '🛒',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerMessage: this.cleanMessage(messageContent),
      vehicleTitle: vehicleMatch?.[1]?.trim() || subject,
      advertUrl: advertUrlMatch?.[1],
      leadType: 'Email Reactie',
      priority: 70
    };
  }
  
  private static parseAutoScout24Email(emailContent: string, subject: string): ParsedLead {
    const customerNameMatch = emailContent.match(/(?:Nieuwe aanvraag|aanvraag|van)\s+(?:van\s+)?([^\n]+?)\s+(?:voor|via)/i) ||
                               emailContent.match(/naam:?\s*([^\n]+)/i);
    const customerEmailMatch = emailContent.match(/(?:e-?mail|email):?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                                emailContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const customerPhoneMatch = emailContent.match(/(?:telefoon|tel|phone):?\s*([\d\s\+\-\(\)]+)/i);
    
    // Better message extraction
    let messageContent = emailContent;
    const berichtMatch = emailContent.match(/(?:bericht van de koper|bericht|opmerking|vraag)[^\n]*?:\s*\n+([\s\S]+?)(?:\n\n(?:kenteken|prijs|advertentie|voor meer info)|$)/is);
    if (berichtMatch) {
      messageContent = berichtMatch[1];
    }
    
    const priceMatch = emailContent.match(/(?:prijs|price):?\s*€\s*([\d.,]+)/i) ||
                       emailContent.match(/€\s*([\d.,]+)/);
    const kentekenMatch = emailContent.match(/(?:kenteken|license plate):?\s*([A-Z0-9\-]+)/i);
    const advertUrlMatch = emailContent.match(/(https?:\/\/[^\s]*autoscout24[^\s]*)/i);
    const vehicleMatch = subject.match(/(?:voor|over|aanvraag)\s+(.+?)(?:\s*-\s*AutoScout24)?$/i) || 
                        emailContent.match(/(?:advertentie|voertuig):?\s*\n\s*(.+?)(?:\n|$)/i);
    
    return {
      platform: 'AutoScout24',
      platformIcon: '🚗',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerEmail: customerEmailMatch?.[1]?.trim(),
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: this.cleanMessage(messageContent),
      vehicleTitle: vehicleMatch?.[1]?.trim() || subject,
      vehiclePrice: priceMatch?.[1]?.replace(/\./g, '').replace(',', '.'),
      kenteken: kentekenMatch?.[1]?.trim(),
      advertUrl: advertUrlMatch?.[1],
      leadType: 'Email Aanvraag',
      priority: 85
    };
  }
  
  private static parseAutoTrackEmail(emailContent: string, subject: string): ParsedLead {
    const customerNameMatch = emailContent.match(/(?:naam|name):?\s*([^\n]+)/i);
    const customerEmailMatch = emailContent.match(/(?:e-?mail|email):?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const customerPhoneMatch = emailContent.match(/(?:telefoon|tel|phone):?\s*([\d\s\+\-\(\)]+)/i);
    const messageMatch = emailContent.match(/(?:bericht|opmerking|vraag)[^\n]*?:\s*\n\s*(.+?)(?:\n\n|\nadvertentie|$)/is);
    const vehicleMatch = emailContent.match(/(?:Het gaat om de volgende )?advertentie:?\s*\n\s*(.+?)(?:\n|$)/i) ||
                        subject.match(/(?:vraag over|informatie)\s+(.+?)(?:\s*-\s*AutoTrack)?$/i);
    const priceMatch = emailContent.match(/(?:prijs|price):?\s*€\s*([\d.,]+)/i);
    const advertUrlMatch = emailContent.match(/(https?:\/\/[^\s]*autotrack[^\s]*)/i);
    
    return {
      platform: 'AutoTrack',
      platformIcon: '🔍',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerEmail: customerEmailMatch?.[1]?.trim(),
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: this.cleanMessage(messageMatch?.[1] || emailContent),
      vehicleTitle: vehicleMatch?.[1]?.trim() || subject,
      vehiclePrice: priceMatch?.[1]?.replace(/\./g, '').replace(',', '.'),
      advertUrl: advertUrlMatch?.[1],
      leadType: 'Email Aanvraag',
      priority: 80
    };
  }
  
  private static parseWebsiteEmail(emailContent: string, subject: string): ParsedLead {
    const customerNameMatch = emailContent.match(/(?:naam|name):?\s*([^\n]+)/i);
    const customerEmailMatch = emailContent.match(/(?:e-?mail|email):?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const customerPhoneMatch = emailContent.match(/(?:telefoon|tel|phone):?\s*([\d\s\+\-\(\)]+)/i);
    
    // Better message extraction for website forms
    let messageContent = emailContent;
    const berichtMatch = emailContent.match(/(?:bericht|opmerking|vraag)[^\n]*?:\s*\n+([\s\S]+?)(?:\n\n(?:car url|advertentie|met vriendelijke)|$)/is);
    if (berichtMatch) {
      messageContent = berichtMatch[1];
    }
    
    const advertUrlMatch = emailContent.match(/(?:car url|advertentie|link):?\s*(https?:\/\/[^\s]+)/i);
    const vehicleMatch = emailContent.match(/(?:interesse in|vraag over|onderwerp):?\s*([^\n]+)/i) ||
                        subject.match(/(?:contactformulier|vraag over)\s+(.+)$/i);
    
    return {
      platform: 'Eigen Website',
      platformIcon: '🌐',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerEmail: customerEmailMatch?.[1]?.trim(),
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: this.cleanMessage(messageContent),
      vehicleTitle: vehicleMatch?.[1]?.trim(),
      advertUrl: advertUrlMatch?.[1],
      leadType: 'Website Reactie',
      priority: 90
    };
  }
  
  private static parseGenericEmail(emailContent: string, subject: string): ParsedLead {
    const customerEmailMatch = emailContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const customerPhoneMatch = emailContent.match(/(?:telefoon|tel|phone):?\s*([\d\s\+\-\(\)]{10,})/i);
    const cleanContent = this.cleanMessage(emailContent);
    
    return {
      platform: 'Email',
      platformIcon: '📧',
      customerName: 'Onbekend',
      customerEmail: customerEmailMatch?.[1],
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: cleanContent,
      vehicleTitle: subject,
      leadType: 'Email',
      priority: 50
    };
  }
  
  private static cleanMessage(message: string): string {
    if (!message) return 'Geen bericht beschikbaar';
    
    let cleaned = message;
    
    // Remove HTML tags but preserve structure
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
    cleaned = cleaned.replace(/<p[^>]*>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/div>/gi, '\n');
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/&amp;/g, '&');
    cleaned = cleaned.replace(/&lt;/g, '<');
    cleaned = cleaned.replace(/&gt;/g, '>');
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, '');
    
    // Remove email signatures and footers (common patterns)
    const footerPatterns = [
      /Met vriendelijke groet[\s\S]*$/i,
      /Klik hier om[\s\S]*$/i,
      /Dit bericht is automatisch gegenereerd[\s\S]*$/i,
      /Voor meer informatie[\s\S]*$/i,
      /Bekijk de advertentie[\s\S]*$/i,
      /Je ontvangt deze e-mail[\s\S]*$/i,
      /Afmelden[\s\S]*$/i,
      /Unsubscribe[\s\S]*$/i,
      /--+[\s\S]*$/m,
      /_{3,}[\s\S]*$/m,
      /Verzonden vanaf[\s\S]*$/i,
      /Sent from[\s\S]*$/i,
      /Get Outlook for[\s\S]*$/i,
      /Disclaimer[\s\S]*$/i,
    ];
    
    for (const pattern of footerPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Remove platform-specific junk
    cleaned = cleaned.replace(/\[cid:[^\]]+\]/g, ''); // Remove CID references
    cleaned = cleaned.replace(/\[image:[^\]]+\]/gi, ''); // Remove image references
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ''); // Remove URLs
    
    // Remove portal metadata lines
    const metadataPatterns = [
      /^(Van|From|To|Aan|Subject|Onderwerp|Date|Datum|CC|BCC):.*/gmi,
      /^Verzonden op.*/gmi,
      /^Sent on.*/gmi,
      /^[A-Z]{2,}\s*:\s*.*/gm, // Lines like "NAAM: John"
    ];
    
    for (const pattern of metadataPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Clean up whitespace while preserving paragraph structure
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
    cleaned = cleaned.replace(/\n[ \t]+/g, '\n'); // Remove spaces at start of lines
    cleaned = cleaned.replace(/[ \t]+\n/g, '\n'); // Remove spaces at end of lines
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n'); // Max 3 line breaks (= 2 empty lines)
    cleaned = cleaned.replace(/^\n+/, ''); // Remove leading newlines
    cleaned = cleaned.replace(/\n+$/, ''); // Remove trailing newlines
    
    // Extract the actual customer message (remove boilerplate)
    const messageMarkers = [
      /(?:bericht|opmerking|vraag|message)(?:\s+van\s+(?:de\s+)?klant)?[:\s]*\n+(.+)/is,
      /(?:klant|customer)\s+(?:schrijft|wrote|zegt|says)[:\s]*\n+(.+)/is,
      /(?:reactie|reply|response)[:\s]*\n+(.+)/is,
    ];
    
    for (const marker of messageMarkers) {
      const match = cleaned.match(marker);
      if (match && match[1]) {
        cleaned = match[1];
        break;
      }
    }
    
    cleaned = cleaned.trim();
    
    // If message is still too long or contains too much junk, try to extract first meaningful paragraphs
    if (cleaned.length > 1000) {
      const paragraphs = cleaned.split(/\n\n+/);
      const meaningfulParagraphs = paragraphs.filter(p => {
        // Filter out paragraphs that are likely metadata or junk
        const lowerP = p.toLowerCase().trim();
        return p.length > 20 && 
               !lowerP.startsWith('http') &&
               !lowerP.includes('====') &&
               !lowerP.includes('----') &&
               !lowerP.includes('unsubscribe') &&
               !lowerP.includes('disclaimer');
      });
      
      if (meaningfulParagraphs.length > 0) {
        cleaned = meaningfulParagraphs.slice(0, 5).join('\n\n'); // Max 5 paragraphs
      }
    }
    
    // Final length limit
    if (cleaned.length > 1200) {
      cleaned = cleaned.substring(0, 1200).trim() + '...';
    }
    
    return cleaned || 'Geen bericht beschikbaar';
  }
}
