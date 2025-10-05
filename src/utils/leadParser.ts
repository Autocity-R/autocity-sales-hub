import { Lead } from "@/types/leads";

interface ParsedLeadInfo {
  customerName: string;
  email: string;
  phone: string;
  vehicleInterest: string;
  message: string;
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
  
  return {
    customerName,
    email,
    phone,
    vehicleInterest,
    message,
    subject
  };
}
