import { EmailTemplate } from "@/types/email";
import { Vehicle, VehicleFile } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { generateContract } from "./contractService";
import { fetchVehicleFiles } from "./inventoryService";

// Mock email templates - in productie zou dit vanuit een API komen
let emailTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "CMR Leverancier",
    subject: "CMR Document - {voertuig_merk} {voertuig_model}",
    content: "Beste leverancier,\n\nBijgevoegd vindt u het CMR document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- VIN: {voertuig_vin}\n- Kenteken: {voertuig_kenteken}\n\nMet vriendelijke groet,\n{gebruiker_naam}",
    linkedButton: "cmr_supplier",
    hasAttachment: true,
    attachmentType: "auto-upload",
    staticAttachmentType: "CMR"
  },
  {
    id: "2", 
    name: "Transport Pickup",
    subject: "Pickup Document - {voertuig_merk} {voertuig_model}",
    content: "Beste transporteur,\n\nHierbij het pickup document voor:\n- Voertuig: {voertuig_merk} {voertuig_model}\n- Locatie: {voertuig_locatie}\n- VIN: {voertuig_vin}\n\nGraag contact opnemen voor planning.\n\nMet vriendelijke groet,\n{gebruiker_naam}",
    linkedButton: "transport_pickup",
    hasAttachment: true,
    attachmentType: "auto-upload",
    staticAttachmentType: "Pickup Document"
  },
  {
    id: "3",
    name: "Koopcontract B2B - Digitaal",
    subject: "Koopcontract voor ondertekening - {voertuig_merk} {voertuig_model}",
    content: "Beste {klant_naam},\n\nBijgevoegd vindt u het koopcontract voor uw voertuig:\n\n- Voertuig: {voertuig_merk} {voertuig_model}\n- Kenteken: {voertuig_kenteken}\n- Verkoopprijs: €{voertuig_prijs}\n\nU kunt het contract digitaal ondertekenen via onderstaande link:\n[ONDERTEKENINGSLINK]\n\nDe link is 7 dagen geldig. Na ondertekening ontvangt u automatisch een bevestiging.\n\nMet vriendelijke groet,\nAutoCity\nTel: 010-2623980",
    linkedButton: "contract_b2b_digital",
    hasAttachment: true,
    attachmentType: "generated-contract"
  },
  {
    id: "4",
    name: "Koopcontract B2C - Digitaal", 
    subject: "Uw autocontract voor digitale ondertekening - {voertuig_merk} {voertuig_model}",
    content: "Beste {klant_naam},\n\nHartelijk dank voor uw aankoop bij AutoCity!\n\nBijgevoegd vindt u het koopcontract voor:\n- {voertuig_merk} {voertuig_model} ({voertuig_kenteken})\n- Kilometer: {voertuig_kilometerstand} km\n- Totaalprijs: €{voertuig_prijs}\n\nU kunt het contract eenvoudig digitaal ondertekenen via deze beveiligde link:\n[ONDERTEKENINGSLINK]\n\nNa ondertekening plannen wij graag de aflevering met u in.\n\nVragen? Bel ons op 010-2623980\n\nMet vriendelijke groet,\nHet AutoCity team",
    linkedButton: "contract_b2c_digital",
    hasAttachment: true,
    attachmentType: "generated-contract"
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
    case "contract_b2b_digital":
    case "contract_b2c_digital":
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

export const sendEmailWithTemplate = async (
  buttonValue: string, 
  vehicleData: Vehicle,
  contractOptions?: ContractOptions,
  signatureUrl?: string
): Promise<boolean> => {
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
    let processedSubject = replaceVariables(template.subject, vehicleData, recipient);
    let processedContent = replaceVariables(template.content, vehicleData, recipient);
    
    // Add signature URL for digital contracts
    if (signatureUrl && (buttonValue.includes("digital") || buttonValue.includes("contract"))) {
      processedContent = processedContent.replace("[ONDERTEKENINGSLINK]", signatureUrl);
    }

    console.log(`Email verzonden met template: ${template.name}`);
    console.log(`Naar: ${recipient.name} (${recipient.email})`);
    console.log(`Onderwerp: ${processedSubject}`);
    console.log(`Inhoud: ${processedContent}`);
    
    // Handle attachments based on template type
    if (template.hasAttachment) {
      const attachments = await getEmailAttachments(template, vehicleData, contractOptions, signatureUrl);
      if (attachments.length > 0) {
        console.log(`Bijlagen (${attachments.length}):`, attachments.map(a => a.name));
      } else if (template.attachmentType === "auto-upload") {
        console.warn(`Geen documenten gevonden voor ${template.staticAttachmentType} van voertuig ${vehicleData.id}`);
        return false;
      }
    }

    // Hier zou de daadwerkelijke email verzending plaatsvinden
    // await emailAPI.send({ 
    //   to: recipient.email, 
    //   subject: processedSubject, 
    //   content: processedContent,
    //   attachments: attachments
    // });
    
    return true;
  } catch (error) {
    console.error("Fout bij verzenden email:", error);
    return false;
  }
};

const getEmailAttachments = async (
  template: EmailTemplate, 
  vehicleData: Vehicle,
  contractOptions?: ContractOptions,
  signatureUrl?: string
): Promise<{ name: string; url: string; content?: string }[]> => {
  const attachments: { name: string; url: string; content?: string }[] = [];

  if (!template.hasAttachment) return attachments;

  switch (template.attachmentType) {
    case "auto-upload":
      // Get documents from vehicle files
      const files = await fetchVehicleFiles(vehicleData.id);
      const relevantFiles = getRelevantDocuments(files, template.staticAttachmentType || "");
      
      attachments.push(...relevantFiles.map(file => ({
        name: file.name,
        url: file.url
      })));
      break;

    case "generated-contract":
      // Generate contract document
      if (contractOptions) {
        const contractType = template.linkedButton.includes("b2b") ? "b2b" : "b2c";
        const contract = await generateContract(vehicleData, contractType, contractOptions, signatureUrl);
        
        attachments.push({
          name: contract.fileName,
          url: contract.pdfUrl || "",
          content: contract.content
        });
      }
      break;

    case "static-file":
      // Handle static files (legacy support)
      if (template.staticAttachmentType) {
        attachments.push({
          name: template.staticAttachmentType,
          url: `https://example.com/static/${template.staticAttachmentType}`
        });
      }
      break;
  }

  return attachments;
};

const getRelevantDocuments = (files: VehicleFile[], documentType: string): VehicleFile[] => {
  switch (documentType) {
    case "CMR":
      return files.filter(file => file.category === "cmr");
    case "Pickup Document":
      return files.filter(file => file.category === "pickup");
    default:
      return [];
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
  result = result.replace(/{voertuig_prijs}/g, vehicleData.sellingPrice?.toLocaleString('nl-NL') || '0');
  
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
