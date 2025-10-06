import { Lead } from "@/types/leads";

interface ParsedLeadInfo {
  customerName: string;
  email: string;
  phone: string;
  vehicleInterest: string;
  message: string;
  cleanMessage?: string;
  vehicleUrl?: string;
  subject: string;
}

export function parseLeadData(lead: Lead): ParsedLeadInfo {
  // Combine all text fields to search for information
  const fullText = `${lead.firstName || ''} ${lead.lastName || ''} ${lead.phone || ''} ${lead.email || ''} ${lead.notes || ''}`.toLowerCase();
  
  // Extract subject/title from the email
  let subject = "Lead";
  const subjectMatch = fullText.match(/autotrack\s*\|\s*([^*\n]+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
  } else if (lead.source === 'autotrack') {
    subject = "AutoTrack Lead";
  } else if (lead.source === 'website') {
    subject = "Website Aanvraag";
  } else if (lead.source === 'facebook') {
    subject = "Facebook Lead";
  } else if (lead.source === 'marktplaats') {
    subject = "Marktplaats Aanvraag";
  }
  
  // Extract customer name
  let customerName = "Onbekende klant";
  const nameMatch = fullText.match(/(?:^|\*\s*)([a-z]+\s+[a-z]+)(?=\s*\*|$)/i);
  if (nameMatch) {
    customerName = nameMatch[1].trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Extract email
  let email = "";
  const emailMatch = fullText.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  if (emailMatch) {
    email = emailMatch[1];
  }
  
  // Extract phone number
  let phone = "";
  const phoneMatch = fullText.match(/(\+31\s?6?\s?\d{8,10}|\+31\s?\d{1,2}\s?\d{7,8}|06[-\s]?\d{8})/);
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s/g, '');
  }
  
  // Extract vehicle interest
  let vehicleInterest = lead.interestedVehicle || "";
  if (!vehicleInterest) {
    const vehicleMatch = fullText.match(/interesse in de ([^.?!*]+?)(?:\.|wilt|met vriendelijke|proefritaanvraag|$)/i);
    if (vehicleMatch) {
      vehicleInterest = vehicleMatch[1].trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  // Extract full message (entire email text)
  let message = fullText;
  
  // Try to extract from parsed email_messages data
  let cleanMessage: string | undefined;
  let vehicleUrl: string | undefined;
  
  // First, try to get from lead's vehicle_url field (NEW!)
  if ((lead as any).vehicle_url) {
    vehicleUrl = (lead as any).vehicle_url;
  }
  
  // Check if we have email_messages data in the lead object (extended query)
  if ((lead as any).email_messages?.length > 0) {
    const emailMsg = (lead as any).email_messages[0];
    if (emailMsg.parsed_data) {
      cleanMessage = emailMsg.parsed_data.cleanMessage || emailMsg.clean_customer_message;
      if (!vehicleUrl) vehicleUrl = emailMsg.parsed_data.vehicleUrl;
    }
    // Also try direct clean_customer_message field (NEW!)
    if (!cleanMessage && emailMsg.clean_customer_message) {
      cleanMessage = emailMsg.clean_customer_message;
    }
  }
  
  // Fallback: try to extract from notes or message body
  if (!cleanMessage && lead.notes) {
    // For old AutoTrack leads, extract message from notes
    const berichtMatch = lead.notes.match(/Bericht[:\s]+([\s\S]*?)(?=Met vriendelijke groet|Gewenste|$)/i);
    if (berichtMatch) {
      cleanMessage = berichtMatch[1].trim();
    }
  }
  
  // Extract vehicle URL from notes if not found
  if (!vehicleUrl && lead.notes) {
    const urlMatch = lead.notes.match(/(https?:\/\/(?:www\.)?(?:autoscout24|marktplaats|autotrack)[^\s"'<>]+)/i);
    if (urlMatch) vehicleUrl = urlMatch[1];
  }
  
  return {
    customerName,
    email,
    phone,
    vehicleInterest,
    message,
    cleanMessage,
    vehicleUrl,
    subject
  };
}
