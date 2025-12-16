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
const BANNER_URL = 'https://fnwagrmoyfyimdoaynkg.supabase.co/storage/v1/object/public/email-assets/Autocity%20logo.png';

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

Uit onze database is gebleken dat jullie recent een ${brand} ${model} (${buildYear}) hebben verkocht. Wij hebben een vergelijkbaar exemplaar beschikbaar:

VOERTUIGGEGEVENS
Merk: ${brand}
Model: ${model}${variant ? ` ${variant}` : ''}
Brandstof: ${fuelType}
Transmissie: ${transmission}
Bouwjaar: ${buildYear}
KM-stand: ${mileage.toLocaleString('nl-NL')} km
${vin ? `VIN: ${vin}` : ''}

B2B PRIJS
Prijs incl. BTW ex BPM: €${b2bPrice.toLocaleString('nl-NL')}
Max. schadebedrag: €${maxDamage.toLocaleString('nl-NL')}

${extraOptions ? `EXTRA OPTIES
${extraOptions}

` : ''}LEVERING
• Bezorging aan de deur mogelijk
• Op Nederlands kenteken leverbaar

Mocht dit voertuig niet direct passen, dan houden wij graag contact over ons volledige B2B aanbod.

Met vriendelijke groet,

Autocity Automotive Group
Thurledeweg 61, 3044 ER Rotterdam
Tel: 010-2623980 | Email: verkoop@auto-city.nl`;
  };

  const buildHtmlTemplate = (textBody: string, includeBanner: boolean, formData?: Partial<EmailFormData>): string => {
    // Extract data from textBody for the marketing template
    const brandMatch = textBody.match(/Merk:\s*(.+)/);
    const modelMatch = textBody.match(/Model:\s*(.+)/);
    const fuelMatch = textBody.match(/Brandstof:\s*(.+)/);
    const transmissionMatch = textBody.match(/Transmissie:\s*(.+)/);
    const yearMatch = textBody.match(/Bouwjaar:\s*(\d+)/);
    const mileageMatch = textBody.match(/KM-stand:\s*(.+)\s*km/);
    const vinMatch = textBody.match(/VIN:\s*(.+)/);
    const priceMatch = textBody.match(/Prijs incl\. BTW ex BPM:\s*€([\d.,]+)/);
    const damageMatch = textBody.match(/Max\. schadebedrag:\s*€([\d.,]+)/);
    const extraOptionsMatch = textBody.match(/EXTRA OPTIES\n([\s\S]*?)(?=\nLEVERING|$)/);

    const brand = brandMatch?.[1]?.trim() || 'Onbekend';
    const model = modelMatch?.[1]?.trim() || '';
    const fuelType = fuelMatch?.[1]?.trim() || '';
    const transmission = transmissionMatch?.[1]?.trim() || '';
    const buildYear = yearMatch?.[1] || '';
    const mileage = mileageMatch?.[1]?.trim() || '0';
    const vin = vinMatch?.[1]?.trim() || '';
    const price = priceMatch?.[1] || '0';
    const damage = damageMatch?.[1] || '0';
    const extraOptions = extraOptionsMatch?.[1]?.trim() || '';

    const bannerHtml = includeBanner ? `
      <img src="${BANNER_URL}" alt="Autocity Automotive Group" style="max-width: 350px; height: auto; margin-bottom: 15px;" />
    ` : '';

    return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B2B Aanbod - ${brand} ${model}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 15px;">
        <table role="presentation" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
          
          <!-- HEADER BANNER - ZWART -->
          <tr>
            <td style="background: #1a1a1a; padding: 0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 20px 25px; text-align: center;">
                    <div style="font-size: 11px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 6px;">Exclusief B2B Aanbod</div>
                    <div style="font-size: 26px; font-weight: bold; color: #ffffff;">
                      ${brand} ${model}
                    </div>
                    <div style="font-size: 16px; color: #cccccc; margin-top: 4px;">${buildYear}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INTRO TEXT - COMPACT -->
          <tr>
            <td style="padding: 18px 25px 12px 25px;">
              <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.5;">
                Geachte collega's, wij hebben een <strong>${brand} ${model}</strong> beschikbaar die interessant kan zijn voor uw voorraad:
              </p>
            </td>
          </tr>

          <!-- VEHICLE SPECS TABLE - COMPACT -->
          <tr>
            <td style="padding: 10px 25px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td colspan="2" style="background: #1a1a1a; padding: 10px 12px;">
                    <strong style="color: #ffffff; font-size: 12px; letter-spacing: 1px;">VOERTUIGGEGEVENS</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; width: 40%; border-bottom: 1px solid #e0e0e0;">Merk</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${brand}</td>
                </tr>
                <tr style="background: #ffffff;">
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;">Model</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${model}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;">Brandstof</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${fuelType}</td>
                </tr>
                <tr style="background: #ffffff;">
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;">Transmissie</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${transmission}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;">Bouwjaar</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${buildYear}</td>
                </tr>
                <tr style="background: #ffffff;">
                  <td style="padding: 8px 12px; color: #666; font-size: 13px; border-bottom: 1px solid #e0e0e0;">KM-stand</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e0e0e0;">${mileage} km</td>
                </tr>
                ${vin ? `
                <tr>
                  <td style="padding: 8px 12px; color: #666; font-size: 13px;">VIN</td>
                  <td style="padding: 8px 12px; color: #1a1a1a; font-size: 13px; font-weight: 600; font-family: monospace;">${vin}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- PRICE SECTION - ZWART -->
          <tr>
            <td style="padding: 10px 25px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px; text-align: center;">
                    <div style="font-size: 11px; letter-spacing: 2px; color: #888888; text-transform: uppercase; margin-bottom: 8px;">UW B2B PRIJS</div>
                    <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                      <div style="font-size: 12px; color: #aaaaaa; margin-bottom: 4px;">Prijs incl. BTW ex BPM</div>
                      <div style="font-size: 30px; font-weight: bold; color: #ffffff;">€${price}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); border-radius: 6px; padding: 8px; border: 1px solid #333333;">
                      <div style="font-size: 11px; color: #888888; margin-bottom: 2px;">Max. schadebedrag</div>
                      <div style="font-size: 18px; font-weight: bold; color: #ffffff;">€${damage}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${extraOptions ? `
          <!-- EXTRA OPTIONS -->
          <tr>
            <td style="padding: 10px 25px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ff9800;">
                <tr>
                  <td style="padding: 12px;">
                    <div style="font-size: 11px; letter-spacing: 1px; color: #f57c00; text-transform: uppercase; margin-bottom: 6px; font-weight: 600;">Extra Opties / Opmerkingen</div>
                    <div style="color: #5d4037; font-size: 13px; line-height: 1.4;">${extraOptions.replace(/\n/g, '<br />')}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- DELIVERY INFO - COMPACT -->
          <tr>
            <td style="padding: 10px 25px;">
              <div style="padding: 10px 12px; background: #f5f5f5; border-radius: 6px; color: #555; font-size: 13px;">
                • Bezorging aan de deur mogelijk &nbsp;&nbsp; • Op Nederlands kenteken leverbaar
              </div>
            </td>
          </tr>

          <!-- CLOSING -->
          <tr>
            <td style="padding: 15px 25px 10px 25px;">
              <p style="margin: 0 0 10px 0; color: #555; font-size: 13px; line-height: 1.5;">
                Mocht dit voertuig niet direct passen, dan houden wij graag contact over ons volledige B2B aanbod.
              </p>
              <p style="margin: 0; color: #555; font-size: 13px;">Met vriendelijke groet,</p>
            </td>
          </tr>

          <!-- SIGNATURE WITH BANNER - GROOT -->
          <tr>
            <td style="padding: 0 25px 25px 25px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f5f5f5; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px; text-align: center;">
                    ${bannerHtml}
                    <div style="font-weight: bold; color: #1a1a1a; font-size: 15px; margin-bottom: 8px;">Autocity Automotive Group</div>
                    <div style="color: #666; font-size: 12px; line-height: 1.5;">
                      Thurledeweg 61, 3044 ER Rotterdam<br />
                      Tel: 010-2623980 | verkoop@auto-city.nl
                    </div>
                  </td>
                </tr>
              </table>
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
