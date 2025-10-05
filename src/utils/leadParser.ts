import { Lead } from "@/types/leads";

interface ParsedLeadInfo {
  customerName: string;
  email: string;
  phone: string;
  vehicleInterest: string;
  message: string;
  subject: string;
  vehicleYear?: string;
  vehicleMileage?: string;
  vehiclePrice?: string;
}

export function parseLeadData(lead: Lead): ParsedLeadInfo {
  // Combine all text fields to search for information
  const fullText = `${lead.firstName || ''} ${lead.lastName || ''} ${lead.phone || ''} ${lead.email || ''} ${lead.notes || ''}`.toLowerCase();
  
  // Extract customer name (usually after "Hans Augustinus" pattern)
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
    // Look for "interesse in de [vehicle]" or "interested in [vehicle]"
    const vehicleMatch = fullText.match(/interesse in de ([^.?!*]+?)(?:\.|wilt|met vriendelijke|proefritaanvraag|$)/i);
    if (vehicleMatch) {
      vehicleInterest = vehicleMatch[1].trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  // Extract message
  let message = "";
  const messageMatch = fullText.match(/bericht\s+([^*]+?)(?:proefritaanvraag|met vriendelijke|$)/i);
  if (messageMatch) {
    message = messageMatch[1].trim();
  }
  
  // Extract subject (email onderwerp)
  let subject = "";
  const subjectMatch = fullText.match(/(?:autotrack|onderwerp|subject)[:\s|]*([^\n]+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else if (lead.source === 'autotrack') {
    // Fallback: generate subject from available data
    const requestType = fullText.includes('proefrit') ? 'Proefrit verzoek' : 
                        fullText.includes('inruil') ? 'Inruil verzoek' : 
                        'Informatie verzoek';
    subject = `AutoTrack | ${requestType}${vehicleInterest ? ' voor ' + vehicleInterest.split(' ').slice(0, 2).join(' ') : ''}`;
  }
  
  // Extract vehicle year
  let vehicleYear = "";
  const yearMatch = fullText.match(/(?:bouwjaar|jaar)[:\s]*(\d{4})/i);
  if (yearMatch) {
    vehicleYear = yearMatch[1];
  }
  
  // Extract vehicle mileage
  let vehicleMileage = "";
  const mileageMatch = fullText.match(/(?:km[:\s-]*stand|kilometerstand)[:\s]*([\d.]+)/i);
  if (mileageMatch) {
    vehicleMileage = mileageMatch[1].replace(/\./g, '.');
  }
  
  // Extract vehicle price
  let vehiclePrice = "";
  const priceMatch = fullText.match(/(?:prijs|€)[:\s]*€?\s*([\d.]+)/i);
  if (priceMatch) {
    vehiclePrice = `€${priceMatch[1]}`;
  }
  
  return {
    customerName,
    email,
    phone,
    vehicleInterest,
    message,
    subject,
    vehicleYear,
    vehicleMileage,
    vehiclePrice
  };
}
