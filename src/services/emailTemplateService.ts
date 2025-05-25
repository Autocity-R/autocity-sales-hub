
import { EmailTemplate } from "@/types/email";

// Mock email templates - in productie zou dit vanuit een API komen
let emailTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "CMR Leverancier",
    subject: "CMR Document - {voertuig_merk} {voertuig_model}",
    content: "Beste leverancier,\n\nBijgevoegd vindt u het CMR document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- VIN: {voertuig_vin}\n- Kenteken: {voertuig_kenteken}\n\nMet vriendelijke groet,\n{gebruiker_naam}",
    linkedButton: "cmr_supplier",
    hasAttachment: true,
    attachmentType: "CMR"
  },
  {
    id: "2", 
    name: "Transport Pickup",
    subject: "Pickup Document - {voertuig_merk} {voertuig_model}",
    content: "Beste transporteur,\n\nHierbij het pickup document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- Locatie: {voertuig_locatie}\n- VIN: {voertuig_vin}\n\nGraag contact opnemen voor planning.\n\nMet vriendelijke groet,\n{gebruiker_naam}",
    linkedButton: "transport_pickup",
    hasAttachment: true,
    attachmentType: "Pickup Document"
  }
];

export const getEmailTemplateByButton = (buttonValue: string): EmailTemplate | null => {
  return emailTemplates.find(template => template.linkedButton === buttonValue) || null;
};

export const sendEmailWithTemplate = async (buttonValue: string, vehicleData: any): Promise<boolean> => {
  const template = getEmailTemplateByButton(buttonValue);
  
  if (!template) {
    console.warn(`Geen email template gevonden voor knop: ${buttonValue}`);
    return false;
  }

  try {
    // Vervang variabelen in de template
    const processedSubject = replaceVariables(template.subject, vehicleData);
    const processedContent = replaceVariables(template.content, vehicleData);

    console.log(`Email verzonden met template: ${template.name}`);
    console.log(`Onderwerp: ${processedSubject}`);
    console.log(`Inhoud: ${processedContent}`);
    
    if (template.hasAttachment) {
      console.log(`Bijlage: ${template.attachmentType}`);
    }

    // Hier zou de daadwerkelijke email verzending plaatsvinden
    // await emailAPI.send({ subject: processedSubject, content: processedContent, ... });
    
    return true;
  } catch (error) {
    console.error("Fout bij verzenden email:", error);
    return false;
  }
};

const replaceVariables = (text: string, vehicleData: any): string => {
  let result = text;
  
  // Vervang voertuig variabelen
  result = result.replace(/{voertuig_merk}/g, vehicleData.brand || '');
  result = result.replace(/{voertuig_model}/g, vehicleData.model || '');
  result = result.replace(/{voertuig_vin}/g, vehicleData.vin || '');
  result = result.replace(/{voertuig_kenteken}/g, vehicleData.licenseNumber || '');
  result = result.replace(/{voertuig_locatie}/g, vehicleData.location || '');
  result = result.replace(/{voertuig_kilometerstand}/g, vehicleData.mileage?.toString() || '');
  result = result.replace(/{voertuig_jaar}/g, vehicleData.year?.toString() || '');
  
  // Vervang gebruiker/bedrijf variabelen (mock data)
  result = result.replace(/{gebruiker_naam}/g, 'Jan Jansen');
  result = result.replace(/{gebruiker_email}/g, 'jan@autobedrijf.nl');
  result = result.replace(/{bedrijf_naam}/g, 'Auto Import Nederland');
  result = result.replace(/{datum_vandaag}/g, new Date().toLocaleDateString('nl-NL'));
  
  return result;
};

export const isButtonLinkedToTemplate = (buttonValue: string): boolean => {
  return emailTemplates.some(template => template.linkedButton === buttonValue);
};
