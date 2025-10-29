import { EmailTemplate } from "@/types/email";
import { Vehicle, VehicleFile, ImportStatus } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { generateContract } from "./contractService";
import { fetchVehicleFiles } from "./inventoryService";
import { supabase } from "@/integrations/supabase/client";

// Mock email templates - in productie zou dit vanuit een API komen
export let emailTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "CMR Leverancier",
    subject: "CMR Document – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Dear Sir/Madam,\n\nPlease find attached the CMR document for the following vehicle:\n\nMake: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\nWe kindly ask you to return the required documents once they are available.\n\nBest regards,\nAutocity Automotive Group\n+31 10 262 3980",
    senderEmail: "inkoop@auto-city.nl",
    linkedButton: "cmr_supplier",
    hasAttachment: true,
    attachmentType: "auto-upload",
    staticAttachmentType: "cmr"
  },
  {
    id: "2", 
    name: "Transport Pickup",
    subject: "Transport Pickup – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Dear Sir/Madam,\n\nPlease find attached the pickup document for the following vehicle to be collected:\n\nMake: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\nWe kindly ask you to arrange the pickup as instructed in the attached document.\n\nBest regards,\nAutocity Automotive Group\n+31 10 262 3980",
    senderEmail: "inkoop@auto-city.nl",
    linkedButton: "transport_pickup",
    hasAttachment: true,
    attachmentType: "auto-upload",
    staticAttachmentType: "pickup"
  },
  {
    id: "3",
    name: "Koopcontract B2B - Digitaal",
    subject: "Koopcontract voor ondertekening - {{MERK}} {{MODEL}}",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nBijgevoegd vindt u het koopcontract voor uw voertuig:\n\n- Voertuig: {{MERK}} {{MODEL}}\n- Kenteken: {{KENTEKEN}}\n- Verkoopprijs: €{{PRIJS}}\n\nU kunt het contract digitaal ondertekenen via onderstaande link:\n[ONDERTEKENINGSLINK]\n\nDe link is 7 dagen geldig. Na ondertekening ontvangt u automatisch een bevestiging.\n\nMet vriendelijke groet,\nAutocity Automotive Group\nTel: 010-2623980",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "contract_b2b_digital",
    hasAttachment: true,
    attachmentType: "generated-contract"
  },
  {
    id: "4",
    name: "Koopcontract B2C - Digitaal", 
    subject: "Koopcontract – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nHartelijk dank voor uw aankoop bij Autocity Automotive Group.\n\nIn de bijlage vindt u het koopcontract voor uw voertuig, waarin alle gemaakte afspraken duidelijk zijn vermeld:\n\nMerk: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\nWij verzoeken u het contract door te nemen en ons te informeren zodra alles akkoord is.\n\nMocht u nog vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010 262 3980\nwww.auto-city.nl",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "contract_b2c_digital",
    hasAttachment: true,
    attachmentType: "generated-contract"
  },
  {
    id: "5",
    name: "BPM Huys Aanmelden",
    subject: "Voertuig binnen voor taxatie – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Geachte BPM Huys Team,\n\nWij willen u informeren dat het volgende voertuig bij ons is binnengekomen en klaarstaat voor taxatie om het importproces te starten:\n\nMerk: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\n\nAlvast bedankt voor de samenwerking.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n+31 10 262 3980",
    senderEmail: "import@auto-city.nl",
    linkedButton: "bpm_huys",
    hasAttachment: false
  },
  {
    id: "6",
    name: "Handmatig Herinnering (Papieren niet binnen)",
    subject: "Reminder – Pending Documents for {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Dear Sir/Madam,\n\nThis is a kind reminder that we have not yet received the required documents for the following vehicle, 7 days after the CMR was provided:\n\nMake: {{MERK}}\nModel: {{MODEL}}\nVIN: {{VIN}}\n\nWe kindly ask you to send the pending documents at your earliest convenience.\n\nThank you in advance for your cooperation.\n\nBest regards,\nAutocity Automotive Group\n+31 10 262 3980",
    senderEmail: "inkoop@auto-city.nl",
    linkedButton: "reminder_papers",
    hasAttachment: true,
    attachmentType: "auto-upload",
    staticAttachmentType: "cmr"
  },
  {
    id: "7",
    name: "Koopcontract Sturen",
    subject: "Koopcontract – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nHartelijk dank voor uw aankoop bij Autocity Automotive Group.\n\nIn de bijlage vindt u het koopcontract voor uw voertuig, waarin alle gemaakte afspraken duidelijk zijn vermeld:\n\nMerk: {{MERK}}\nModel: {{MODEL}}\nVIN: {{VIN}}\n\nWij verzoeken u het contract door te nemen en ons te informeren zodra alles akkoord is.\n\nMocht u nog vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010 262 3980\nwww.auto-city.nl",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "contract_send",
    hasAttachment: true,
    attachmentType: "generated-contract"
  },
  {
    id: "8",
    name: "Auto Gereed",
    subject: "Uw voertuig is gereed voor afhaling – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nWij informeren u dat het probleem aan uw voertuig is verholpen.\n\nVoertuiggegevens:\nMerk: {{MERK}}\nModel: {{MODEL}}\nVIN: {{VIN}}\n\nU kunt nu een afspraak met ons inplannen voor het ophalen van de auto op een moment dat het u uitkomt.\n\nNeem gerust contact met ons op om een geschikte dag en tijd af te stemmen.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010-2623980\nwww.auto-city.nl",
    senderEmail: "garantie@auto-city.nl",
    linkedButton: "auto_gereed",
    hasAttachment: false
  },
  {
    id: "9",
    name: "Happy Call",
    subject: "Hoe is uw ervaring geweest met uw {{MERK}} {{MODEL}}?",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nWij hopen dat alles naar wens is verlopen met het herstel van uw voertuig:\n\nMerk: {{MERK}}\nModel: {{MODEL}}\nVIN: {{VIN}}\n\nWij horen graag of u tevreden bent met de service en of alles weer naar behoren werkt.\nMocht er onverhoopt toch nog iets zijn, aarzel dan niet om direct contact met ons op te nemen — we helpen u graag verder.\n\nAls u tevreden bent, zouden wij het enorm waarderen als u uw ervaring met ons wilt delen via onderstaande link:\n\nhttps://g.page/r/CZ2zNLjntUphEAE/review\n\nUw feedback helpt ons om onze service te verbeteren én andere klanten een goed beeld te geven van onze dienstverlening.\n\nHartelijk dank voor uw tijd en vertrouwen in Autocity.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010-2623980\nwww.auto-city.nl",
    senderEmail: "garantie@auto-city.nl",
    linkedButton: "happy_call",
    hasAttachment: false
  },
  {
    id: "10",
    name: "Aflevering Afspraak",
    subject: "Uw auto is gereed voor aflevering",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nUw auto staat gereed voor aflevering, graag plannen wij samen het moment wanneer u de auto zou willen ophalen.\nLaat het ons even weten per mail of telefoon wanneer u het beste schikt.\n\nOm alles zo soepel mogelijk te laten verlopen:\n- Ruilt u een auto in vergeet dan niet uw kentekencard en de tenaamstellingscode.\n- Wenst u het restant bedrag ter plekke over te maken of te pinnen vergeet dan niet uw limiet omhoog te zetten 4 uur van te voren.\n- Vergeet niet uw rijbewijs zodat wij het voertuig op uw naam kunnen registreren.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010-2623980\nwww.auto-city.nl",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "delivery_appointment",
    hasAttachment: false
  },
  {
    id: "11",
    name: "Auto is Binnengekomen",
    subject: "Uw voertuig is bij ons aangekomen – {{MERK}} {{MODEL}}",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nWij willen u informeren dat uw {{MERK}} {{MODEL}} ({{VIN}}) veilig bij ons is aangekomen.\n\nHet voertuig wordt nu geïnspecteerd en voorbereid volgens de afgesproken procedures.\n\nWij houden u op de hoogte van de voortgang.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010-2623980",
    senderEmail: "inkoop@auto-city.nl",
    linkedButton: "vehicle_arrived",
    hasAttachment: false
  },
  {
    id: "12",
    name: "Kenteken Update",
    subject: "Kenteken update van uw voertuig",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nHierbij ontvangt u een update over de voortgang van uw voertuig:\n\nVoertuiggegevens:\n\nMerk: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\nDe huidige status van uw voertuig is: {{STATUS}}\n\nOverzicht van de stappen:\n\n• Aanvraag ontvangen\n• Goedgekeurd\n• BPM Betaald\n• Ingeschreven\n\nWij houden u steeds op de hoogte zodra een volgende stap is afgerond.\nHeeft u vragen over de status van uw voertuig? Neem gerust contact met ons op.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010-2623980\nwww.auto-city.nl",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "license_registration",
    hasAttachment: false
  },
  {
    id: "13",
    name: "Koopcontract B2B",
    subject: "Koopcontract – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Beste {{VOORNAAM}} {{ACHTERNAAM}},\n\nHartelijk dank voor uw aankoop bij Autocity Automotive Group.\n\nIn de bijlage vindt u het koopcontract voor uw voertuig, waarin alle gemaakte afspraken duidelijk zijn vermeld:\n\nMerk: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}\n\nWij verzoeken u het contract door te nemen en ons te informeren zodra alles akkoord is.\n\nMocht u nog vragen hebben, neem dan gerust contact met ons op.\n\nMet vriendelijke groet,\nAutocity Automotive Group\n010 262 3980\nwww.auto-city.nl",
    senderEmail: "administratie@auto-city.nl",
    linkedButton: "contract_b2b",
    hasAttachment: true,
    attachmentType: "generated-contract"
  },
  {
    id: "14",
    name: "Facturatie aanvraag",
    subject: "Facturatie – {{MERK}} {{MODEL}} ({{VIN}})",
    content: "Beste administratie,\n\nHet volgende voertuig is afgeleverd aan de klant en kan worden gefactureerd:\n\nVoertuiggegevens:\n\nMerk: {{MERK}}\n\nModel: {{MODEL}}\n\nVIN: {{VIN}}{{KENTEKEN_INDIEN_INRUIL}}\n\nKlantgegevens:\n\nNaam / Bedrijfsnaam: {{KLANT_NAAM}}\n\nAdres: {{KLANT_ADRES}}\n\nE-mailadres voor factuur: {{KLANT_EMAIL}}\n\nVerkoopprijs: €{{VERKOOPPRIJS_MET_BPM}}\n\nDe factuur mag nu worden opgemaakt en verzonden naar de klant.\n\nMet vriendelijke groet,\n{{VERKOPER_NAAM}}\nAutocity Automotive Group\n📞 010 262 3980",
    senderEmail: "verkoop@auto-city.nl",
    linkedButton: "invoice_request",
    hasAttachment: false,
    recipientOverride: "administratie@auto-city.nl"
  }
];

export const getEmailTemplateByButton = (buttonValue: string): EmailTemplate | null => {
  return emailTemplates.find(template => template.linkedButton === buttonValue) || null;
};

export const determineRecipient = async (buttonValue: string, vehicleData: Vehicle): Promise<{ email: string; name: string } | null> => {
  switch (buttonValue) {
    case "transport_pickup":
      // Get transporter contact from contacts table
      if (vehicleData.supplierId) {
        const { supabaseCustomerService } = await import('./supabaseCustomerService');
        const contact = await supabaseCustomerService.getContactById(vehicleData.supplierId);
        
        // Verify it's actually a transporter
        if (contact && contact.type === 'transporter') {
          // Validate email address
          if (!contact.email || !contact.email.includes('@')) {
            console.warn(`Contact ${contact.id} has invalid email: ${contact.email}`);
            return null;
          }
          return {
            email: contact.email,
            name: contact.companyName || `${contact.firstName} ${contact.lastName}`
          };
        } else if (contact && contact.type !== 'transporter') {
          console.warn(`Contact ${contact.id} is not type 'transporter', but '${contact.type}'`);
          return null;
        }
      }
      // Fallback to legacy transporterContact
      return vehicleData.transporterContact || null;
      
    case "cmr_supplier":
    case "reminder_papers":
      // Get supplier contact from contacts table
      if (vehicleData.supplierId) {
        const { supabaseCustomerService } = await import('./supabaseCustomerService');
        const contact = await supabaseCustomerService.getContactById(vehicleData.supplierId);
        
        // Verify it's actually a supplier (not transporter!)
        if (contact && contact.type === 'supplier') {
          // Validate primary email address
          if (!contact.email || !contact.email.includes('@')) {
            console.warn(`Contact ${contact.id} has invalid email: ${contact.email}`);
            return null;
          }
          
          // Collect all valid email addresses (primary + additional)
          const allEmails: string[] = [contact.email];
          
          if (contact.additionalEmails && Array.isArray(contact.additionalEmails)) {
            // Add all valid additional emails
            contact.additionalEmails.forEach((email: string) => {
              if (email && email.includes('@') && !allEmails.includes(email)) {
                allEmails.push(email);
              }
            });
          }
          
          console.log(`[CMR_RECIPIENT] Sending CMR to ${allEmails.length} email(s):`, allEmails);
          
          return {
            email: allEmails.join(','), // Multiple emails separated by comma
            name: contact.companyName || `${contact.firstName} ${contact.lastName}`
          };
        } else if (contact && contact.type !== 'supplier') {
          console.warn(`Contact ${contact.id} is not type 'supplier', but '${contact.type}'. CMR should not go to transporters!`);
          return null;
        }
      }
      return vehicleData.supplierContact || null;
      
    case "contract_b2b":
    case "contract_b2c":
    case "contract_b2b_digital":
    case "contract_b2c_digital":
    case "contract_send":
    case "vehicle_arrived":
    case "rdw_approved":
    case "bpm_paid":
    case "car_registered":
    case "delivery_appointment":
    case "workshop_update":
    case "payment_reminder":
    case "auto_gereed":
    case "happy_call":
      // Get customer contact from contacts table
      console.log(`[EMAIL_RECIPIENT] Determining recipient for ${buttonValue}:`, {
        vehicleId: vehicleData.id,
        customerId: vehicleData.customerId,
        hasCustomerContact: !!vehicleData.customerContact,
        customerContactEmail: vehicleData.customerContact?.email
      });
      
      if (vehicleData.customerId) {
        const { supabaseCustomerService } = await import('./supabaseCustomerService');
        const customer = await supabaseCustomerService.getContactById(vehicleData.customerId);
        if (customer) {
          // Validate email address
          if (!customer.email || !customer.email.includes('@')) {
            console.warn(`[EMAIL_RECIPIENT] ❌ Customer ${customer.id} has invalid email: ${customer.email}`);
            return null;
          }
          console.log(`[EMAIL_RECIPIENT] ✅ Found customer from DB:`, {
            email: customer.email,
            name: customer.companyName || `${customer.firstName} ${customer.lastName}`
          });
          return {
            email: customer.email,
            name: customer.companyName || `${customer.firstName} ${customer.lastName}`
          };
        } else {
          console.warn(`[EMAIL_RECIPIENT] ❌ Customer ${vehicleData.customerId} not found in database`);
        }
      }
      
      // Fallback to customerContact (enriched from vehicleRelationshipService)
      const fallbackContact = vehicleData.customerContact;
      if (fallbackContact) {
        if (!fallbackContact.email || !fallbackContact.email.includes('@')) {
          console.warn(`[EMAIL_RECIPIENT] ❌ Vehicle ${vehicleData.id} has invalid customer email: ${fallbackContact?.email}`);
          return null;
        }
        console.log(`[EMAIL_RECIPIENT] ✅ Using customerContact fallback:`, {
          email: fallbackContact.email,
          name: fallbackContact.name
        });
        return fallbackContact;
      }
      
      console.warn(`[EMAIL_RECIPIENT] ❌ No customer found for vehicle ${vehicleData.id}`);
      return null;
    case "bpm_huys":
      return { email: "info@bpmhuys.nl", name: "BPM Huys" };
    case "license_registration":
      return vehicleData.customerContact || null;
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

  // Use recipientOverride if available (for fixed recipients like administratie)
  let recipient = template.recipientOverride 
    ? { email: template.recipientOverride, name: 'Administratie' }
    : await determineRecipient(buttonValue, vehicleData);
    
  if (!recipient) {
    console.warn(`❌ Geen ontvanger gevonden voor knop: ${buttonValue}`);
    console.warn(`Vehicle ID: ${vehicleData.id}, customerId: ${vehicleData.customerId}, customerContact:`, vehicleData.customerContact);
    const { toast } = await import('@/hooks/use-toast');
    toast({
      title: "Geen ontvanger",
      description: "Er is geen klant of contactpersoon gekoppeld aan dit voertuig. Koppel eerst een klant voordat u de email verstuurt.",
      variant: "destructive"
    });
    return false;
  }
  
  if (!recipient.email || !recipient.email.includes('@')) {
    console.warn(`❌ Ongeldig emailadres voor recipient: ${recipient.email}`);
    const { toast } = await import('@/hooks/use-toast');
    toast({
      title: "Ongeldig emailadres",
      description: `Het emailadres van ${recipient.name} is ongeldig. Update de contactgegevens.`,
      variant: "destructive"
    });
    return false;
  }

  try {
    // Import supabase client and toast
    const { supabase } = await import('@/integrations/supabase/client');
    const { toast } = await import('@/hooks/use-toast');

    // Vervang variabelen in de template (now async)
    let processedSubject = await replaceVariables(template.subject, vehicleData, recipient, contractOptions);
    let processedContent = await replaceVariables(template.content, vehicleData, recipient, contractOptions);
    
    // Add signature URL for digital contracts
    if (signatureUrl && (buttonValue.includes("digital") || buttonValue.includes("contract"))) {
      processedContent = processedContent.replace("[ONDERTEKENINGSLINK]", signatureUrl);
    }

    // Convert newlines to HTML breaks
    const htmlBody = processedContent.replace(/\n/g, '<br>');

    // Handle attachments based on template type
    let attachments: Array<{ filename: string; url?: string; base64Content?: string }> = [];
    if (template.hasAttachment) {
      const attachmentData = await getEmailAttachments(template, vehicleData, contractOptions, signatureUrl);
      
      if (attachmentData.length === 0 && template.attachmentType === "auto-upload") {
        console.warn(`Geen documenten gevonden voor ${template.staticAttachmentType} van voertuig ${vehicleData.id}`);
        toast({
          title: "Geen bijlagen gevonden",
          description: `Er zijn geen ${template.staticAttachmentType} documenten geüpload voor dit voertuig.`,
          variant: "destructive"
        });
        return false;
      }

      attachments = attachmentData.map(att => ({
        filename: att.name,
        url: att.url,
        base64Content: att.content
      }));
    }

    // Get current user for sender email and CC
    const { data: { user } } = await supabase.auth.getUser();
    
    // Dynamically determine sender email from user's profile
    let senderEmail = template.senderEmail; // Fallback to template default
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      
      if (profile?.email) {
        senderEmail = profile.email;
        console.log(`📧 Using user's email as sender: ${senderEmail}`);
      } else {
        console.log(`⚠️ User profile email not found, using template default: ${senderEmail}`);
      }
    }

    console.log(`📧 Email sender info:`, {
      userId: user?.id,
      userProfileEmail: user ? 'fetched from profiles' : 'no user',
      templateDefault: template.senderEmail,
      finalSender: senderEmail
    });

    // Prepare email payload for queue
    const emailPayload = {
      senderEmail: senderEmail,
      to: [recipient.email],
      cc: user?.email ? [user.email] : [],
      subject: processedSubject,
      htmlBody: htmlBody,
      attachments: attachments
    };

    console.log(`📧 Sending email now for: ${recipient.name} (${recipient.email})`);
    console.log(`Subject: ${processedSubject}`);
    console.log(`Attachments: ${attachments.length}`);

    // Directly send via Edge Function (rollback from queue-based sending)
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-gmail', {
      body: emailPayload,
    });

    if (sendError) {
      console.error('❌ Failed to send email via edge function:', sendError);
      toast({
        title: "Email kan niet worden verstuurd",
        description: "Er ging iets mis bij het verzenden. Probeer het opnieuw.",
        variant: "destructive"
      });
      return false;
    }

    console.log('✅ Email sent via edge function', sendResult);
    
    // Update vehicle record for specific email types
    if (buttonValue === 'bpm_huys') {
      try {
        const { data: currentVehicle, error: fetchError } = await supabase
          .from('vehicles')
          .select('details')
          .eq('id', vehicleData.id)
          .single();
        
        if (fetchError) {
          console.error('Failed to fetch vehicle details:', fetchError);
        } else {
          const currentDetails = (currentVehicle.details && typeof currentVehicle.details === 'object') 
            ? currentVehicle.details as Record<string, any>
            : {};
          
          const updatedDetails = {
            ...currentDetails,
            bpmRequested: true
          };
          
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({ details: updatedDetails })
            .eq('id', vehicleData.id);
          
          if (updateError) {
            console.error('Failed to update vehicle bpmRequested status:', updateError);
          } else {
            console.log('✅ Vehicle bpmRequested status updated');
          }
        }
      } catch (updateError) {
        console.error('Error updating vehicle:', updateError);
      }
    }
    
    toast({
      title: "Email verzonden",
      description: `De email naar ${recipient.name} is succesvol verzonden.`
    });
    
    return true;
  } catch (error) {
    console.error("Fout bij verzenden email:", error);
    const { toast } = await import('@/hooks/use-toast');
    toast({
      title: "Email verzenden mislukt",
      description: "Er is een onverwachte fout opgetreden.",
      variant: "destructive"
    });
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
        
        // Generate PDF from HTML to preserve styling and layout
        const { generatePdfFromHtml } = await import("./contractPdfService");
        const pdfBlob = await generatePdfFromHtml(contract.htmlContent);
        const fileName = contract.fileName;
        const filePath = `${vehicleData.id}/contracts/${Date.now()}-${fileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vehicle-documents')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Error uploading contract PDF:', uploadError);
          throw new Error(`Failed to upload contract PDF: ${uploadError.message}`);
        }
        
        // Get signed URL (valid for 1 hour)
        const { data: urlData } = await supabase.storage
          .from('vehicle-documents')
          .createSignedUrl(filePath, 3600);
        
        if (!urlData?.signedUrl) {
          throw new Error('Failed to generate signed URL for contract PDF');
        }
        
        attachments.push({
          name: fileName,
          url: urlData.signedUrl
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
    case "cmr":
    case "CMR":
      return files.filter(file => file.category === "cmr");
    case "pickup":
    case "Pickup Document":
      return files.filter(file => file.category === "pickup");
    default:
      return [];
  }
};

// Helper function for safe name parsing
const parseNameSafely = (fullName: string | undefined | null): { firstName: string; lastName: string } => {
  if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
    return { firstName: '[Voornaam]', lastName: '[Achternaam]' };
  }
  
  const trimmedName = fullName.trim();
  const parts = trimmedName.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { firstName: '[Voornaam]', lastName: '[Achternaam]' };
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || ''
  };
};

// Helper function to get import status label in Dutch
const getImportStatusLabel = (status: ImportStatus): string => {
  const statusLabels: Record<ImportStatus, string> = {
    'niet_aangemeld': 'Niet aangemeld',
    'aanvraag_ontvangen': 'Aanvraag ontvangen',
    'goedgekeurd': 'Goedgekeurd',
    'bpm_betaald': 'BPM Betaald',
    'ingeschreven': 'Ingeschreven'
  };
  return statusLabels[status] || status;
};

const replaceVariables = async (
  text: string, 
  vehicleData: Vehicle, 
  recipient?: { email: string; name: string },
  contractOptions?: ContractOptions
): Promise<string> => {
  // Debug logging
  console.log('🔍 replaceVariables DEBUG:', {
    recipientName: recipient?.name,
    customerContactName: vehicleData.customerContact?.name,
    vehicleBrand: vehicleData.brand,
    vehicleModel: vehicleData.model
  });

  let result = text;
  
  // Get salesperson name from auth and profile
  let salespersonName = 'Verkoper';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (profile && profile.first_name && profile.last_name) {
        salespersonName = `${profile.first_name} ${profile.last_name}`;
      }
    }
  } catch (error) {
    console.warn('Could not fetch salesperson name:', error);
  }
  
  // Extract first and last name from recipient with safe parsing
  const { firstName: recipientFirstName, lastName: recipientLastName } = parseNameSafely(recipient?.name);
  
  // Vehicle variables with safer fallbacks
  result = result.replace(/{{MERK}}/g, vehicleData.brand || '[Merk]');
  result = result.replace(/{{MODEL}}/g, vehicleData.model || '[Model]');
  result = result.replace(/{{VIN}}/g, vehicleData.vin || '');
  result = result.replace(/{{KENTEKEN}}/g, vehicleData.licenseNumber || '');
  result = result.replace(/{{LOCATIE}}/g, vehicleData.location || '');
  result = result.replace(/{{KILOMETERSTAND}}/g, vehicleData.mileage?.toString() || '');
  result = result.replace(/{{JAAR}}/g, vehicleData.year?.toString() || '');
  result = result.replace(/{{KLEUR}}/g, vehicleData.color || '');
  result = result.replace(/{{PRIJS}}/g, vehicleData.sellingPrice?.toLocaleString('nl-NL') || '0');
  result = result.replace(/{{VERKOOPPRIJS}}/g, vehicleData.sellingPrice?.toLocaleString('nl-NL') || 'Niet ingesteld');
  
  // Verkoopprijs met BPM indicator (alleen als contractOptions beschikbaar zijn)
  const bpmText = contractOptions?.bpmIncluded === true 
    ? ' (inclusief BPM)' 
    : contractOptions?.bpmIncluded === false 
      ? ' (exclusief BPM)' 
      : '';
  const verkoopprijsMetBpm = (vehicleData.sellingPrice?.toLocaleString('nl-NL') || 'Niet ingesteld') + bpmText;
  result = result.replace(/{{VERKOOPPRIJS_MET_BPM}}/g, verkoopprijsMetBpm);
  
  // Kenteken alleen tonen bij inruil auto's
  const isTradeIn = vehicleData.details?.isTradeIn === true;
  const kentekenLine = isTradeIn && vehicleData.licenseNumber 
    ? `\n\nKenteken: ${vehicleData.licenseNumber}` 
    : '';
  result = result.replace(/{{KENTEKEN_INDIEN_INRUIL}}/g, kentekenLine);
  
  result = result.replace(/{{STATUS}}/g, getImportStatusLabel(vehicleData.importStatus));
  result = result.replace(/{{VERKOPER_NAAM}}/g, salespersonName);
  
  // Customer/recipient variables - use safe parsing
  const customerName = vehicleData.customerContact?.name || recipient?.name || '';
  const customerAddress = vehicleData.customerContact?.address || 'Geen adres beschikbaar';
  const customerEmail = vehicleData.customerContact?.email || recipient?.email || '';
  const { firstName: customerFirstName, lastName: customerLastName } = parseNameSafely(customerName);
  
  result = result.replace(/{{VOORNAAM}}/g, customerFirstName);
  result = result.replace(/{{ACHTERNAAM}}/g, customerLastName);
  result = result.replace(/{{KLANT_NAAM}}/g, customerName || 'Klant naam onbekend');
  result = result.replace(/{{KLANT_ADRES}}/g, customerAddress);
  result = result.replace(/{{KLANT_EMAIL}}/g, customerEmail);
  result = result.replace(/{{EMAIL}}/g, customerEmail || '[Email niet beschikbaar]');
  result = result.replace(/{{TELEFOON}}/g, vehicleData.customerContact?.phone || '');
  
  // Transporteur variabelen
  if (vehicleData.transporterContact || (recipient && text.includes('TRANSPORTEUR'))) {
    const transporterName = vehicleData.transporterContact?.name || recipient?.name || '';
    result = result.replace(/{{TRANSPORTEUR_NAAM}}/g, transporterName);
    result = result.replace(/{{TRANSPORTEUR_EMAIL}}/g, vehicleData.transporterContact?.email || recipient?.email || '');
  }
  
  // Legacy {variabele} syntax (backwards compatibility)
  result = result.replace(/{voertuig_merk}/g, vehicleData.brand || '[Merk]');
  result = result.replace(/{voertuig_model}/g, vehicleData.model || '[Model]');
  result = result.replace(/{voertuig_vin}/g, vehicleData.vin || '');
  result = result.replace(/{voertuig_kenteken}/g, vehicleData.licenseNumber || '');
  result = result.replace(/{voertuig_locatie}/g, vehicleData.location || '');
  result = result.replace(/{voertuig_kilometerstand}/g, vehicleData.mileage?.toString() || '');
  result = result.replace(/{voertuig_jaar}/g, vehicleData.year?.toString() || '');
  result = result.replace(/{voertuig_prijs}/g, vehicleData.sellingPrice?.toLocaleString('nl-NL') || '0');
  
  if (recipient) {
    result = result.replace(/{ontvanger_naam}/g, recipient.name || '[Ontvanger]');
    result = result.replace(/{ontvanger_email}/g, recipient.email || '');
  }
  
  if (vehicleData.customerContact) {
    result = result.replace(/{klant_naam}/g, vehicleData.customerContact.name || '[Klant]');
    result = result.replace(/{klant_email}/g, vehicleData.customerContact.email || '');
  }
  
  if (vehicleData.supplierContact) {
    result = result.replace(/{leverancier_naam}/g, vehicleData.supplierContact.name || '[Leverancier]');
    result = result.replace(/{leverancier_email}/g, vehicleData.supplierContact.email || '');
  }
  
  if (vehicleData.transporterContact) {
    result = result.replace(/{transporteur_naam}/g, vehicleData.transporterContact.name || '[Transporteur]');
    result = result.replace(/{transporteur_email}/g, vehicleData.transporterContact.email || '');
  }
  
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
