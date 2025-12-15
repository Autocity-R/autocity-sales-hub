import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VehicleInput, DealerListing } from '@/types/dealerAnalysis';

export interface EmailFormData {
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName: string;
  // Vehicle fields (editable)
  brand: string;
  model: string;
  variant: string;
  fuelType: string;
  transmission: string;
  buildYear: number;
  mileage: number;
  vin: string;
  b2bPrice: number;
  maxDamage: number;
  extraOptions: string;
  includeBanner: boolean;
}

// Banner URL - use Supabase Storage for email compatibility
// Upload the banner to: https://supabase.com/dashboard/project/fnwagrmoyfyimdoaynkg/storage/buckets/email-assets
const BANNER_URL = 'https://fnwagrmoyfyimdoaynkg.supabase.co/storage/v1/object/public/email-assets/autocity-banner.png';

export const useDealerEmail = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const buildDefaultTemplate = (vehicle: VehicleInput, dealer: DealerListing, formData: Partial<EmailFormData>): string => {
    const brand = formData.brand || vehicle.brand;
    const model = formData.model || vehicle.model;
    const variant = formData.variant || vehicle.variant || '';
    const buildYear = formData.buildYear || vehicle.buildYear;
    const fuelType = formData.fuelType || vehicle.fuelType;
    const transmission = formData.transmission || vehicle.transmission;
    const mileage = formData.mileage || vehicle.mileage || 0;
    const vin = formData.vin || '';
    const b2bPrice = formData.b2bPrice || 0;
    const maxDamage = formData.maxDamage || 0;
    const extraOptions = formData.extraOptions || '';

    return `Geachte collega's,

Uit onze database is gebleken dat jullie recent een ${brand} ${model} (${buildYear}) hebben verkocht. Wij hebben een vergelijkbaar exemplaar beschikbaar dat wellicht interessant kan zijn voor uw voorraad:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOERTUIGGEGEVENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Merk:           ${brand}
Model:          ${model}${variant ? ` ${variant}` : ''}
Brandstof:      ${fuelType}
Transmissie:    ${transmission}
Bouwjaar:       ${buildYear}
KM-stand:       ${mileage.toLocaleString('nl-NL')} km
${vin ? `VIN:            ${vin}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
B2B PRIJS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prijs incl. BTW ex BPM:  €${b2bPrice.toLocaleString('nl-NL')}
Max. schadebedrag:       €${maxDamage.toLocaleString('nl-NL')}

${extraOptions ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRA OPTIES / OPMERKINGEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${extraOptions}

` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEVERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bezorging aan de deur bij uw vestiging mogelijk
• Op Nederlands kenteken leverbaar (neem contact op voor condities)

De keuze is aan jullie om hier gebruik van te maken.

Wij zijn Autocity Automotive Group, gespecialiseerd in jong gebruikte voertuigen. Mocht dit voertuig niet direct passen, dan houden wij graag contact over ons volledige B2B aanbod.

Met vriendelijke groet,

Autocity Automotive Group
━━━━━━━━━━━━━━━━━━━━━━━━
Thurledeweg 61
3044 ER Rotterdam
Tel: 010-2623980
Email: verkoop@auto-city.nl`;
  };

  const buildHtmlTemplate = (textBody: string, includeBanner: boolean): string => {
    // Convert plain text to HTML with proper formatting
    const htmlContent = textBody
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border: none; border-top: 2px solid #1e3a5f; margin: 15px 0;" />')
      .replace(/━━━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border: none; border-top: 1px solid #1e3a5f; margin: 10px 0;" />')
      .replace(/\n\n/g, '</p><p style="margin: 15px 0; line-height: 1.6;">')
      .replace(/\n/g, '<br />')
      .replace(/•/g, '&#8226;');

    // Find where to insert banner (after "Autocity Automotive Group" signature)
    const signatureMarker = 'Autocity Automotive Group';
    const bannerHtml = includeBanner ? `
      <div style="margin: 20px 0; text-align: center;">
        <img 
          src="${BANNER_URL}" 
          alt="Autocity Automotive Group" 
          style="max-width: 100%; width: 500px; height: auto; border-radius: 4px;"
        />
      </div>
    ` : '';

    // Build the HTML email
    return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B2B Aanbod - Autocity Automotive Group</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div style="color: #333333; font-size: 14px;">
                <p style="margin: 15px 0; line-height: 1.6;">
                  ${htmlContent.includes(signatureMarker) 
                    ? htmlContent.replace(
                        new RegExp(`(${signatureMarker})`, 'g'), 
                        `$1${bannerHtml}`
                      )
                    : htmlContent + bannerHtml
                  }
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  };

  const generateWithAI = async (
    vehicle: VehicleInput, 
    dealer: DealerListing,
    formData: Partial<EmailFormData>
  ): Promise<string | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-b2b-email', {
        body: {
          vehicle: {
            brand: formData.brand || vehicle.brand,
            model: formData.model || vehicle.model,
            variant: formData.variant || vehicle.variant,
            buildYear: formData.buildYear || vehicle.buildYear,
            fuelType: formData.fuelType || vehicle.fuelType,
            transmission: formData.transmission || vehicle.transmission,
            mileage: formData.mileage || vehicle.mileage,
            vin: formData.vin || '',
            b2bPrice: formData.b2bPrice || 0,
            maxDamage: formData.maxDamage || 0,
            extraOptions: formData.extraOptions || ''
          },
          dealer: {
            name: dealer.dealerName,
            email: dealer.dealerEmail || '',
            soldVehicle: dealer.soldSince !== null ? {
              brand: vehicle.brand,
              model: vehicle.model,
              buildYear: dealer.buildYear || vehicle.buildYear,
              price: dealer.price,
              soldDaysAgo: dealer.soldSince
            } : undefined
          }
        }
      });

      if (error) {
        console.error('AI generation error:', error);
        toast.error('Fout bij AI generatie');
        return null;
      }

      if (data?.success && data?.email) {
        toast.success('Email gegenereerd met AI');
        return data.email;
      } else {
        toast.error(data?.error || 'Fout bij AI generatie');
        return null;
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Fout bij AI generatie');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async (
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
    includeBanner: boolean = true
  ): Promise<boolean> => {
    setIsSending(true);
    
    try {
      const htmlBody = buildHtmlTemplate(body, includeBanner);
      
      const { data, error } = await supabase.functions.invoke('send-gmail', {
        body: {
          to: recipientEmail,
          subject,
          body: body, // Plain text fallback
          htmlBody: htmlBody, // HTML version with banner
          from: 'verkoop@auto-city.nl',
          fromName: 'Autocity Automotive Group'
        }
      });

      if (error) {
        console.error('Send email error:', error);
        toast.error('Fout bij verzenden email');
        return false;
      }

      if (data?.success) {
        toast.success(`Email verzonden naar ${recipientName}`);
        return true;
      } else {
        toast.error(data?.error || 'Fout bij verzenden');
        return false;
      }
    } catch (err) {
      console.error('Send email error:', err);
      toast.error('Fout bij verzenden email');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const buildSubject = (vehicle: VehicleInput, formData: Partial<EmailFormData>): string => {
    const brand = formData.brand || vehicle.brand;
    const model = formData.model || vehicle.model;
    const variant = formData.variant || vehicle.variant || '';
    const buildYear = formData.buildYear || vehicle.buildYear;
    
    return `B2B Aanbod - ${brand} ${model}${variant ? ` ${variant}` : ''} - ${buildYear}`;
  };

  return {
    isGenerating,
    isSending,
    buildDefaultTemplate,
    buildHtmlTemplate,
    generateWithAI,
    sendEmail,
    buildSubject,
    BANNER_URL
  };
};
