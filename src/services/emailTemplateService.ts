
import { EmailTemplate } from "@/types/email";
import { Vehicle } from "@/types/inventory";

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

export const determineRecipient = (buttonValue: string, vehicleData: Vehicle): { email: string; name: string } | null => {
  switch (buttonValue) {
    case "transport_pickup":
      return vehicleData.transporterContact || null;
    case "cmr_supplier":
      return vehicleData.supplierContact || null;
    case "contract_b2b":
    case "contract_b2c":
    case "vehicle_arrived":
    case "rdw_approved":
    case "bpm_paid":
    case "car_registered":
    case "delivery_appointment":
    case "workshop_update":
    case "payment_reminder":
      return vehicleData.customerContact || null;
    case "bpm_huys":
      return { email: "info@bpmhuys.nl", name: "BPM Huys" };
    case "license_registration":
      return vehicleData.customerContact || null;
    case "reminder_papers":
      return vehicleData.supplierContact || null;
    default:
      return null;
  }
};

export const sendEmailWithTemplate = async (buttonValue: string, vehicleData: Vehicle): Promise<boolean> => {
  const template = getEmailTemplateByButton(buttonValue);
  
  if (!template) {
    console.warn(`Geen email template gevonden voor knop: ${buttonValue}`);
    return false;
  }

  const recipient = determineRecipient(buttonValue, vehicleData);
  if (!recipient) {
    console.warn(`Geen ontvanger gevonden voor knop: ${buttonValue}`);
    return false;
  }

  try {
    // Vervang variabelen in de template
    const processedSubject = replaceVariables(template.subject, vehicleData, recipient);
    const processedContent = replaceVariables(template.content, vehicleData, recipient);

    console.log(`Email verzonden met template: ${template.name}`);
    console.log(`Naar: ${recipient.name} (${recipient.email})`);
    console.log(`Onderwerp: ${processedSubject}`);
    console.log(`Inhoud: ${processedContent}`);
    
    if (template.hasAttachment) {
      console.log(`Bijlage: ${template.attachmentType}`);
    }

    // Hier zou de daadwerkelijke email verzending plaatsvinden
    // await emailAPI.send({ 
    //   to: recipient.email, 
    //   subject: processedSubject, 
    //   content: processedContent,
    //   attachments: template.hasAttachment ? [template.attachmentType] : []
    // });
    
    return true;
  } catch (error) {
    console.error("Fout bij verzenden email:", error);
    return false;
  }
};

const replaceVariables = (text: string, vehicleData: Vehicle, recipient?: { email: string; name: string }): string => {
  let result = text;
  
  // Vervang voertuig variabelen
  result = result.replace(/{voertuig_merk}/g, vehicleData.brand || '');
  result = result.replace(/{voertuig_model}/g, vehicleData.model || '');
  result = result.replace(/{voertuig_vin}/g, vehicleData.vin || '');
  result = result.replace(/{voertuig_kenteken}/g, vehicleData.licenseNumber || '');
  result = result.replace(/{voertuig_locatie}/g, vehicleData.location || '');
  result = result.replace(/{voertuig_kilometerstand}/g, vehicleData.mileage?.toString() || '');
  result = result.replace(/{voertuig_jaar}/g, vehicleData.year?.toString() || '');
  
  // Vervang klant/leverancier/transporteur variabelen
  if (recipient) {
    result = result.replace(/{ontvanger_naam}/g, recipient.name);
    result = result.replace(/{ontvanger_email}/g, recipient.email);
  }
  
  if (vehicleData.customerContact) {
    result = result.replace(/{klant_naam}/g, vehicleData.customerContact.name);
    result = result.replace(/{klant_email}/g, vehicleData.customerContact.email);
  }
  
  if (vehicleData.supplierContact) {
    result = result.replace(/{leverancier_naam}/g, vehicleData.supplierContact.name);
    result = result.replace(/{leverancier_email}/g, vehicleData.supplierContact.email);
  }
  
  if (vehicleData.transporterContact) {
    result = result.replace(/{transporteur_naam}/g, vehicleData.transporterContact.name);
    result = result.replace(/{transporteur_email}/g, vehicleData.transporterContact.email);
  }
  
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

// Functie om nieuwe templates toe te voegen (gebruikt door EmailTemplateManagement)
export const addEmailTemplate = (template: Omit<EmailTemplate, 'id'>): EmailTemplate => {
  const newTemplate = {
    ...template,
    id: Date.now().toString()
  };
  emailTemplates.push(newTemplate);
  return newTemplate;
};

// Functie om templates bij te werken
export const updateEmailTemplate = (id: string, updates: Partial<EmailTemplate>): boolean => {
  const index = emailTemplates.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  emailTemplates[index] = { ...emailTemplates[index], ...updates };
  return true;
};

// Functie om templates te verwijderen
export const deleteEmailTemplate = (id: string): boolean => {
  const index = emailTemplates.findIndex(t => t.id === id);
  if (index === -1) return false;
  
  emailTemplates.splice(index, 1);
  return true;
};

// Functie om alle templates op te halen
export const getAllEmailTemplates = (): EmailTemplate[] => {
  return [...emailTemplates];
};
