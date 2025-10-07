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
                               emailContent.match(/van:\s*([^\n]+)/i);
    const messageMatch = emailContent.match(/Je hebt een reactie ontvangen van .+?:\s*\n\s*(.+?)(?:\n\n|\n-|$)/is) ||
                        emailContent.match(/bericht:?\s*\n\s*(.+?)(?:\n\n|\n-|$)/is);
    const advertUrlMatch = emailContent.match(/(https?:\/\/[^\s]+marktplaats[^\s]+)/i);
    const vehicleMatch = subject.match(/reactie op (.+?)$/i) || subject.match(/(.+?)(?:\s*-\s*Marktplaats)?$/i);
    
    return {
      platform: 'Marktplaats',
      platformIcon: '🛒',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerMessage: this.cleanMessage(messageMatch?.[1] || emailContent),
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
    const messageMatch = emailContent.match(/(?:bericht|opmerking|vraag)[^\n]*?:\s*\n\s*(.+?)(?:\n\n|\n-|advertentie|kenteken|prijs|$)/is);
    const priceMatch = emailContent.match(/(?:prijs|price):?\s*€\s*([\d.,]+)/i) ||
                       emailContent.match(/€\s*([\d.,]+)/);
    const kentekenMatch = emailContent.match(/(?:kenteken|license plate):?\s*([A-Z0-9\-]+)/i);
    const advertUrlMatch = emailContent.match(/(https?:\/\/[^\s]*autoscout24[^\s]*)/i);
    const vehicleMatch = subject.match(/(?:voor|over|aanvraag)\s+(.+?)(?:\s*-\s*AutoScout24)?$/i) || 
                        emailContent.match(/advertentie:?\s*\n\s*(.+?)(?:\n|$)/i);
    
    return {
      platform: 'AutoScout24',
      platformIcon: '🚗',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerEmail: customerEmailMatch?.[1]?.trim(),
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: this.cleanMessage(messageMatch?.[1] || emailContent),
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
    const messageMatch = emailContent.match(/(?:bericht|opmerking|vraag)[^\n]*?:\s*\n\s*(.+?)(?:\n\n|car url|advertentie|$)/is);
    const advertUrlMatch = emailContent.match(/(?:car url|advertentie|link):?\s*(https?:\/\/[^\s]+)/i);
    const vehicleMatch = emailContent.match(/(?:interesse in|vraag over):?\s*([^\n]+)/i) ||
                        subject.match(/(?:contactformulier|vraag over)\s+(.+)$/i);
    
    return {
      platform: 'Eigen Website',
      platformIcon: '🌐',
      customerName: customerNameMatch?.[1]?.trim() || 'Onbekend',
      customerEmail: customerEmailMatch?.[1]?.trim(),
      customerPhone: customerPhoneMatch?.[1]?.trim(),
      customerMessage: this.cleanMessage(messageMatch?.[1] || emailContent),
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
    
    return message
      .trim()
      // Remove common email footers and signatures
      .replace(/Met vriendelijke groet[\s\S]*$/i, '')
      .replace(/Klik hier om[\s\S]*$/i, '')
      .replace(/Dit bericht is automatisch gegenereerd[\s\S]*$/i, '')
      .replace(/Voor meer informatie[\s\S]*$/i, '')
      .replace(/Bekijk de advertentie[\s\S]*$/i, '')
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs from message body
      // Clean up formatting
      .replace(/\n\n\n+/g, '\n\n') // Max 2 line breaks
      .replace(/^\s+|\s+$/gm, '') // Trim each line
      .replace(/\t/g, ' ') // Replace tabs
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove HTML entities
      .replace(/_{3,}/g, '') // Remove horizontal lines
      .replace(/-{3,}/g, '')
      .trim()
      .substring(0, 800); // Reasonable length limit
  }
}
