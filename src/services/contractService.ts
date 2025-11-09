import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { supabase } from "@/integrations/supabase/client";

/**
 * Convert image URL to base64 data URL
 */
const imageToBase64 = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return '';
  }
};

export interface GeneratedContract {
  content: string;
  htmlContent: string; // Nieuwe HTML versie voor digitale weergave
  fileName: string;
  pdfUrl?: string;
  signatureUrl?: string; // URL voor digitale ondertekening
}

// Delivery package pricing
const DELIVERY_PACKAGE_PRICES = {
  "garantie_wettelijk": 0,
  "6_maanden_autocity": 595,
  "12_maanden_autocity": 995,
  "12_maanden_bovag": 1195,
  "12_maanden_bovag_vervangend": 1495
};

// Delivery package labels
const DELIVERY_PACKAGE_LABELS = {
  "garantie_wettelijk": "Garantie wettelijk",
  "6_maanden_autocity": "6 Maanden Autocity garantie",
  "12_maanden_autocity": "12 Maanden Autocity garantie",
  "12_maanden_bovag": "12 Maanden Bovag garantie",
  "12_maanden_bovag_vervangend": "12 Maanden Bovag garantie (inclusief vervangend vervoer)"
};

// Payment terms labels
const PAYMENT_TERMS_LABELS = {
  "aanbetaling_5": "Aanbetaling 5% (over verkoopprijs)",
  "aanbetaling_10": "Aanbetaling 10% (over verkoopprijs)",
  "handmatig": "Handmatig bedrag"
};

export const generateContract = async (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions,
  signatureUrl?: string
): Promise<GeneratedContract> => {
  // Convert logo to base64 for reliable PDF rendering
  const logoBase64 = await imageToBase64('/lovable-uploads/5ed4e40f-e743-47d8-ae24-9c02f8deab82.png');
  console.log('[CONTRACT_SERVICE] 📄 Generating contract:', {
    vehicleId: vehicle.id,
    type: contractType,
    customerName: vehicle.customerName,
    customerContact: vehicle.customerContact
  });
  
  const isB2B = contractType === "b2b";
  const currentDate = new Date().toLocaleDateString("nl-NL");
  
  // Calculate prices based on options
  const basePrice = vehicle.sellingPrice || 0;
  let deliveryPackagePrice = 0;
  let warrantyPackagePrice = 0;
  let tradeInPrice = 0;
  let finalPrice = basePrice;
  let btwAmount = 0;
  let priceExclBtw = 0;
  let downPaymentAmount = 0;
  let downPaymentPercentage = 0;

  // Determine package price for B2C: manual overrides default
  if (!isB2B) {
    if (options.warrantyPackagePrice !== undefined) {
      warrantyPackagePrice = options.warrantyPackagePrice;
      deliveryPackagePrice = warrantyPackagePrice; // use manual price for calculations
    } else if (options.deliveryPackage) {
      deliveryPackagePrice = DELIVERY_PACKAGE_PRICES[options.deliveryPackage as keyof typeof DELIVERY_PACKAGE_PRICES] || 0;
    }
    finalPrice = basePrice + deliveryPackagePrice;
  }

  // Calculate trade-in for B2C
  if (!isB2B && options.tradeInVehicle) {
    tradeInPrice = options.tradeInVehicle.tradeInPrice;
    finalPrice = finalPrice - tradeInPrice;
  }

  // Calculate down payment for B2C (based on vehicle selling price, NOT final price)
  if (!isB2B && options.paymentTerms) {
    if (options.paymentTerms === "handmatig" && options.customDownPayment) {
      downPaymentAmount = Math.round(options.customDownPayment);
    } else if (options.paymentTerms === "aanbetaling_5") {
      downPaymentPercentage = 5;
      downPaymentAmount = Math.round((basePrice * downPaymentPercentage) / 100);
    } else if (options.paymentTerms === "aanbetaling_10") {
      downPaymentPercentage = 10;
      downPaymentAmount = Math.round((basePrice * downPaymentPercentage) / 100);
    }
  }

  if (isB2B) {
    // For B2B, calculate BTW breakdown
    priceExclBtw = Math.round(basePrice / 1.21);
    btwAmount = basePrice - priceExclBtw;
    finalPrice = basePrice;
  }

  // Determine VAT text based on vehicle type
  const vatText = options.vehicleType === "marge" 
    ? "vrijgesteld van BTW (margeregeling)" 
    : "inclusief BTW";

  // Bedrijfsgegevens
  const companyInfo = {
    tradeName: "Autocity Automotive Group B.V",
    address: "Thurledeweg 61a",
    postalCode: "3044ER",
    city: "Rotterdam",
    country: "Nederland",
    phone: "010-2623980",
    iban: "NL24ABNA0595583911",
    btw: "NL868445794B01",
    kvk: "98322702",
    website: "www.auto-city.nl"
  };

  // Ensure full customer address - prioritize manual contractAddress
  const formatAddressParts = (
    street?: string,
    number?: string,
    zip?: string,
    city?: string
  ) => {
    const line1 = [street, number].filter(Boolean).join(' ').trim();
    const line2 = [zip, city].filter(Boolean).join(' ').trim();
    return [line1, line2].filter(Boolean).join(', ');
  };

  let computedAddress = vehicle.customerContact?.address || '';

  // Priority 1: Use manual contractAddress from options if provided
  if (options.contractAddress) {
    computedAddress = formatAddressParts(
      options.contractAddress.street,
      options.contractAddress.number,
      options.contractAddress.zipCode,
      options.contractAddress.city
    );
  } 
  // Priority 2: Fetch from database if address is incomplete
  else {
    const hasZip = /\b\d{4}\s?[A-Za-z]{2}\b/.test(computedAddress);
    
    if (vehicle.customerId && (!computedAddress || !hasZip)) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('address_street, address_number, address_postal_code, address_city')
        .eq('id', vehicle.customerId)
        .maybeSingle();

      if (contact) {
        computedAddress = formatAddressParts(
          contact.address_street,
          contact.address_number,
          contact.address_postal_code,
          contact.address_city
        );
      }
    }
  }

  const vehicleForContract = {
    ...vehicle,
    customerContact: {
      ...(vehicle.customerContact || {}),
      address: computedAddress
    }
  } as Vehicle;

  const htmlContent = generateHtmlContract(
    vehicleForContract, 
    contractType, 
    options, 
    companyInfo, 
    currentDate, 
    basePrice, 
    finalPrice, 
    btwAmount, 
    priceExclBtw,
    deliveryPackagePrice,
    warrantyPackagePrice,
    tradeInPrice,
    downPaymentAmount,
    downPaymentPercentage,
    vatText,
    signatureUrl,
    logoBase64
  );

  const textContent = generateTextContract(
    vehicleForContract, 
    contractType, 
    options, 
    companyInfo, 
    currentDate, 
    basePrice, 
    finalPrice, 
    btwAmount, 
    priceExclBtw,
    deliveryPackagePrice,
    warrantyPackagePrice,
    tradeInPrice,
    downPaymentAmount,
    downPaymentPercentage,
    vatText
  );

  const fileName = `koopcontract_${vehicle.licenseNumber}_${currentDate.replace(/\//g, '-')}.pdf`;

  return {
    content: textContent,
    htmlContent,
    fileName,
    pdfUrl: undefined, // Will be generated and uploaded when sending email
    signatureUrl
  };
};

const generateHtmlContract = (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions,
  companyInfo: any,
  currentDate: string,
  basePrice: number,
  finalPrice: number,
  btwAmount: number,
  priceExclBtw: number,
  deliveryPackagePrice: number,
  warrantyPackagePrice: number,
  tradeInPrice: number,
  downPaymentAmount: number,
  downPaymentPercentage: number,
  vatText: string,
  signatureUrl?: string,
  logoBase64?: string
): string => {
  const isB2B = contractType === "b2b";
  
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Koopovereenkomst - ${vehicle.brand} ${vehicle.model}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.3;
            color: #1a1a1a;
            background: white;
            font-size: 10px;
        }
        
        .contract {
            max-width: 210mm;
            margin: 0 auto;
            padding: 3mm 6mm;
            background: white;
        }
        
        .header {
            background: #000000;
            color: white;
            padding: 8px 12px;
            margin: -6mm -6mm 10px -6mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            min-height: 50px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 0 0 auto;
        }
        
        .logo-container {
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .header-center {
            flex: 1;
            text-align: center;
            padding: 0 25px;
        }
        
        .header-title {
            font-size: 16px;
            font-weight: 700;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        
        .contract-date {
            font-size: 14px;
            color: #cccccc;
            font-weight: 500;
        }
        
        .company-info {
            flex: 0 0 auto;
            text-align: right;
            font-size: 10px;
            color: #ffffff;
            line-height: 1.6;
            max-width: 200px;
        }
        
        .company-info div {
            margin-bottom: 3px;
        }
        
        .main-content {
            display: block;
            margin-bottom: 10px;
        }
        
        .section {
            background: white;
            border: 2px solid #000000;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .section-header {
            background: #000000;
            color: white;
            padding: 6px 10px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
        }
        
        .section-content {
            padding: 8px;
        }
        
        .contract-details {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 3px 8px;
            padding: 0;
            align-items: start;
        }
        
        .info-item {
            display: contents;
        }
        
        .info-label {
            font-weight: 600;
            color: #666666;
            font-size: 9px;
            text-align: left;
            white-space: nowrap;
            flex-shrink: 0;
        }
        
        .info-value {
            color: #000000;
            font-weight: 500;
            font-size: 10px;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: break-word;
            padding-left: 3px;
            line-height: 1.3;
        }
        
        .price-section {
            background: white;
            border: 2px solid #000000;
            grid-column: 1 / -1;
        }
        
        .price-breakdown {
            padding: 0;
        }
        
        .price-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #eeeeee;
            font-size: 12px;
        }
        
        .price-item:last-child {
            border-bottom: none;
        }
        
        .price-label {
            font-weight: 500;
            color: #666666;
        }
        
        .price-value {
            font-weight: 600;
            color: #000000;
        }
        
        .price-total {
            background: #000000;
            color: white;
            padding: 12px;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
        }
        
        .full-width-section {
            grid-column: 1 / -1;
        }
        
        .terms-content {
            font-size: 9px;
            line-height: 1.3;
            color: #4b5563;
        }
        
        .terms-content p {
            margin-bottom: 3px;
        }
        
        .terms-content ul {
            margin: 4px 0;
            padding-left: 14px;
        }
        
        .terms-content li {
            margin-bottom: 3px;
        }
        
        .digital-signature {
            background: linear-gradient(135deg, #f8f9fa, #f1f3f4);
            border: 2px solid #000000;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            margin: 15px 0;
            grid-column: 1 / -1;
        }
        
        .digital-signature h3 {
            color: #1a1a1a;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .signature-button {
            background: linear-gradient(135deg, #000000, #1a1a1a);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 8px;
            font-size: 13px;
        }
        
        .footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #6b7280;
            text-align: center;
            line-height: 1.5;
            page-break-inside: avoid;
        }
        
        @media print {
            @page {
                size: A4;
                margin: 5mm;
            }
            
            body {
                font-size: 9px;
            }
            
            .contract {
                margin: 0;
                padding: 2mm;
                page-break-inside: avoid;
            }
            
            .digital-signature {
                display: none;
            }
            
            .header {
                padding: 6px 10px;
                margin: -2mm -2mm 6px -2mm;
                min-height: 45px;
            }
            
            .main-content {
                margin-bottom: 6px;
            }
            
            .section {
                margin-bottom: 4px;
                page-break-inside: avoid;
            }
            
            .section-content {
                padding: 6px;
            }
            
            .section-header {
                padding: 6px 8px;
                font-size: 10px;
            }
            
            .price-section {
                page-break-inside: avoid;
            }
            
            .full-width-section {
                page-break-inside: avoid;
            }
            
            .footer {
                margin-top: 6px;
                padding-top: 4px;
            }
            
            .terms-content {
                font-size: 9px;
            }
        }
    </style>
</head>
<body>
    <div class="contract">
        <div class="header">
            <div class="logo-section">
                <div class="logo-container">
                    <img src="${logoBase64 || '/lovable-uploads/5ed4e40f-e743-47d8-ae24-9c02f8deab82.png'}" alt="AutoCity Logo" />
                </div>
            </div>
            <div class="header-center">
                <div class="header-title">KOOPCONTRACT</div>
                <div class="contract-date">Datum: ${currentDate}</div>
            </div>
            <div class="company-info">
                <div><strong>${companyInfo.tradeName}</strong></div>
                <div>${companyInfo.address}</div>
                <div>${companyInfo.postalCode} ${companyInfo.city}</div>
                <div>${companyInfo.country}</div>
                <div>Tel: ${companyInfo.phone}</div>
                <div>IBAN: ${companyInfo.iban}</div>
                <div>BTW: ${companyInfo.btw}</div>
                <div>KVK: ${companyInfo.kvk}</div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="section">
                <div class="section-header">Contractgegevens</div>
                <div class="section-content">
                    <div class="contract-details">
                        <div class="info-item">
                            <span class="info-label">Contractnummer:</span>
                            <span class="info-value">AC-${vehicle.licenseNumber}-${Date.now().toString().slice(-6)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Type verkoop:</span>
                            <span class="info-value">${isB2B ? 'Zakelijke verkoop (B2B)' : 'Particuliere verkoop (B2C)'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Klant:</span>
                            <span class="info-value">${isB2B ? (vehicle.customerName || '[Bedrijfsnaam]') : (vehicle.customerContact?.name || '[Voor- en achternaam]')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${vehicle.customerContact?.email || '[Email adres]'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Adres:</span>
                            <span class="info-value">${vehicle.customerContact?.address || '[Adres klant]'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">Voertuig</div>
                <div class="section-content">
                    <div class="contract-details">
                        <div class="info-item">
                            <span class="info-label">Merk:</span>
                            <span class="info-value">${vehicle.brand}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Model:</span>
                            <span class="info-value">${vehicle.model}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Kenteken:</span>
                            <span class="info-value">${vehicle.licenseNumber}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">VIN:</span>
                            <span class="info-value">${vehicle.vin}</span>
                        </div>
                        ${vehicle.year ? `
                        <div class="info-item">
                            <span class="info-label">Bouwjaar:</span>
                            <span class="info-value">${vehicle.year}</span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="info-label">KM Stand:</span>
                            <span class="info-value">${vehicle.mileage?.toLocaleString('nl-NL')} km</span>
                        </div>
                    </div>
                    ${isB2B && options.bpmIncluded ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="contract-details">
                            <div class="info-item">
                                <span class="info-label">Levering:</span>
                                <span class="info-value">Voertuig wordt geleverd inclusief NL kenteken</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    ${isB2B && options.maxDamageAmount && options.maxDamageAmount > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="contract-details">
                            <div class="info-item">
                                <span class="info-label">Maximaal schade bedrag:</span>
                                <span class="info-value">€ ${options.maxDamageAmount.toLocaleString('nl-NL')}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    ${!isB2B && options.deliveryPackage ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="contract-details">
                            <div class="info-item">
                                <span class="info-label">Afleverpakket:</span>
                                <span class="info-value">${DELIVERY_PACKAGE_LABELS[options.deliveryPackage as keyof typeof DELIVERY_PACKAGE_LABELS]}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Pakket prijs:</span>
                                <span class="info-value">€ ${deliveryPackagePrice.toLocaleString('nl-NL')}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    ${!isB2B && options.tradeInVehicle ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="contract-details">
                            <div class="info-item">
                                <span class="info-label">Inruil merk/model:</span>
                                <span class="info-value">${options.tradeInVehicle.brand} ${options.tradeInVehicle.model}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Inruil kenteken:</span>
                                <span class="info-value">${options.tradeInVehicle.licenseNumber}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Inruil km stand:</span>
                                <span class="info-value">${options.tradeInVehicle.mileage.toLocaleString('nl-NL')} km</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Inruilprijs:</span>
                                <span class="info-value">€ ${options.tradeInVehicle.tradeInPrice.toLocaleString('nl-NL')}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="section price-section">
            <div class="section-header">Prijsopbouw</div>
            <div class="price-breakdown">
                ${isB2B ? `
                    <div class="price-item">
                        <span class="price-label">Bedrag exclusief BTW</span>
                        <span class="price-value">€ ${priceExclBtw.toLocaleString('nl-NL')}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">BTW (21%)</span>
                        <span class="price-value">€ ${btwAmount.toLocaleString('nl-NL')}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Bedrag inclusief BTW</span>
                        <span class="price-value">€ ${basePrice.toLocaleString('nl-NL')}</span>
                    </div>
                ` : `
                    <div class="price-item">
                        <span class="price-label">Verkoopprijs voertuig (${vatText})</span>
                        <span class="price-value">€ ${basePrice.toLocaleString('nl-NL')}</span>
                    </div>
                    ${options.deliveryPackage ? `
                    <div class="price-item">
                        <span class="price-label">Afleverpakket</span>
                        <span class="price-value">€ ${deliveryPackagePrice.toLocaleString('nl-NL')}</span>
                    </div>
                    ` : ''}
                    ${tradeInPrice > 0 ? `
                    <div class="price-item">
                        <span class="price-label">Inruilprijs</span>
                        <span class="price-value">-€ ${tradeInPrice.toLocaleString('nl-NL')}</span>
                    </div>
                    ` : ''}
                `}
            </div>
            <div class="price-total">
                Totaal: € ${finalPrice.toLocaleString('nl-NL')}
            </div>
        </div>
        
        <div class="section full-width-section">
            <div class="section-header">Leveringsvoorwaarden</div>
            <div class="section-content">
                <div class="terms-content">
                    ${isB2B ? `
                        <p>Deze voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en leveringen van voertuigen door Autocity aan zakelijke klanten, tenzij schriftelijk anders overeengekomen.</p>
                        <p>Het eigendom van het voertuig gaat pas over op koper na volledige betaling van het factuurbedrag.</p>
                        <p>Autocity behoudt zich het eigendomsrecht voor totdat alle verplichtingen uit hoofde van de overeenkomst zijn voldaan.</p>
                        <p>Het voertuig wordt verkocht in de staat waarin het zich bevindt, zonder garantie, tenzij schriftelijk anders is overeengekomen.</p>
                        <p>In geval van overmacht aan de zijde van Autocity worden de verplichtingen opgeschort voor de duur van de overmachtssituatie.</p>
                        <p>Indien van toepassing worden aanvullende afspraken vastgelegd in het koopcontract of leverdocument.</p>
                    ` : `
                        <p>Het voertuig wordt geleverd zoals gezien, gereden en akkoord bevonden door koper.</p>
                        <p>Levering vindt plaats na volledige betaling van het aankoopbedrag en op het moment van fysieke overdracht of registratie bij RDW op naam van koper.</p>
                        <p>Het risico van verlies of beschadiging gaat over op koper op het moment van levering.</p>
                        ${downPaymentAmount > 0 ? `<p>Klant dient de aanbetaling van ${downPaymentPercentage > 0 ? `${downPaymentPercentage}% ` : ''}€ ${downPaymentAmount.toLocaleString('nl-NL')} per bank te voldoen.</p>` : ''}
                        
                        ${options.tradeInVehicle ? `
                        <p><strong>Inruilvoertuigen:</strong><br>
                        Indien sprake is van inruil, verklaart koper dat het inruilvoertuig eigendom is van hem/haar en vrij is van beslagen of verborgen gebreken, tenzij vooraf gemeld. AutoCity behoudt zich het recht voor inruilvoertuigen te weigeren bij onjuiste opgave.</p>
                        ` : ''}
                        
                        <p><strong>Toepasselijk recht en geschillen:</strong><br>
                        Op deze overeenkomst is uitsluitend Nederlands recht van toepassing. Geschillen worden bij voorkeur in onderling overleg opgelost. Indien nodig zal het geschil worden voorgelegd aan de bevoegde rechter te Rotterdam.</p>
                    `}
                </div>
            </div>
        </div>
        
        ${options.additionalClauses ? `
        <div class="section full-width-section">
            <div class="section-header">Aanvullende Contractclausules</div>
            <div class="section-content">
                <div class="terms-content">
                    <p>${options.additionalClauses.replace(/\n/g, '</p><p>')}</p>
                </div>
            </div>
        </div>
        ` : ''}
        
        ${options.specialAgreements ? `
        <div class="section full-width-section">
            <div class="section-header">Speciale Afspraken</div>
            <div class="section-content">
                <div class="terms-content">
                    <p>${options.specialAgreements.replace(/\n/g, '</p><p>')}</p>
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="footer">
            www.auto-city.nl
        </div>
    </div>
</body>
</html>
  `;
};

const generateTextContract = (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions,
  companyInfo: any,
  currentDate: string,
  basePrice: number,
  finalPrice: number,
  btwAmount: number,
  priceExclBtw: number,
  deliveryPackagePrice: number,
  warrantyPackagePrice: number,
  tradeInPrice: number,
  downPaymentAmount: number,
  downPaymentPercentage: number,
  vatText: string
): string => {
  const isB2B = contractType === "b2b";
  
  return `
KOOPOVEREENKOMST PERSONENAUTO

VERKOPER:
${companyInfo.tradeName}
${companyInfo.address}
${companyInfo.postalCode} ${companyInfo.city}, ${companyInfo.country}
Telefoon: ${companyInfo.phone}
BTW-nummer: ${companyInfo.btw}
IBAN: ${companyInfo.iban}

CONTRACTGEGEVENS:
Contractnummer: AC-${vehicle.licenseNumber}-${Date.now().toString().slice(-6)}
Datum: ${currentDate}
Type verkoop: ${isB2B ? 'Zakelijke verkoop (B2B)' : 'Particuliere verkoop (B2C)'}
Klant: ${isB2B ? (vehicle.customerName || '[Bedrijfsnaam]') : (vehicle.customerContact?.name || '[Voor- en achternaam]')}
Adres: ${vehicle.customerContact?.address || '[Adres klant]'}
Email: ${vehicle.customerContact?.email || '[Email adres]'}

VOERTUIGGEGEVENS:
Merk en model: ${vehicle.brand} ${vehicle.model}
${vehicle.color ? `Kleur: ${vehicle.color}` : ''}
Kenteken: ${vehicle.licenseNumber}
Chassisnummer: ${vehicle.vin}
Kilometerstand: ${vehicle.mileage?.toLocaleString('nl-NL')} km
${vehicle.year ? `Bouwjaar: ${vehicle.year}` : ''}
${isB2B && options.bpmIncluded ? `Voertuig wordt geleverd inclusief NL kenteken` : ''}
${isB2B && options.maxDamageAmount && options.maxDamageAmount > 0 ? `Maximaal schade bedrag: € ${options.maxDamageAmount.toLocaleString('nl-NL')}` : ''}
${!isB2B && options.deliveryPackage ? `
Afleverpakket: ${DELIVERY_PACKAGE_LABELS[options.deliveryPackage as keyof typeof DELIVERY_PACKAGE_LABELS]}
Pakket prijs: € ${deliveryPackagePrice.toLocaleString('nl-NL')}` : ''}
${!isB2B && options.tradeInVehicle ? `
Inruil voertuig: ${options.tradeInVehicle.brand} ${options.tradeInVehicle.model}
Inruil kenteken: ${options.tradeInVehicle.licenseNumber}
Inruil km stand: ${options.tradeInVehicle.mileage.toLocaleString('nl-NL')} km
Inruilprijs: € ${options.tradeInVehicle.tradeInPrice.toLocaleString('nl-NL')}` : ''}

PRIJSOPBOUW:
${isB2B ? `
Bedrag exclusief BTW: € ${priceExclBtw.toLocaleString('nl-NL')}
BTW (21%): € ${btwAmount.toLocaleString('nl-NL')}
Bedrag inclusief BTW: € ${basePrice.toLocaleString('nl-NL')}
` : `
Verkoopprijs voertuig (${vatText}): € ${basePrice.toLocaleString('nl-NL')}
${options.deliveryPackage ? `Afleverpakket: € ${deliveryPackagePrice.toLocaleString('nl-NL')}` : ''}
${tradeInPrice > 0 ? `Inruilprijs: -€ ${tradeInPrice.toLocaleString('nl-NL')}` : ''}
Betalingsvoorwaarden: ${options.paymentTerms ? PAYMENT_TERMS_LABELS[options.paymentTerms as keyof typeof PAYMENT_TERMS_LABELS] : ''}
`}

TOTAAL TE BETALEN: € ${finalPrice.toLocaleString('nl-NL')}

LEVERINGSVOORWAARDEN:
${isB2B ? `
Deze voorwaarden zijn van toepassing op alle aanbiedingen, overeenkomsten en leveringen van voertuigen door Autocity aan zakelijke klanten, tenzij schriftelijk anders overeengekomen.
Het eigendom van het voertuig gaat pas over op koper na volledige betaling van het factuurbedrag.
Autocity behoudt zich het eigendomsrecht voor totdat alle verplichtingen uit hoofde van de overeenkomst zijn voldaan.
Het voertuig wordt verkocht in de staat waarin het zich bevindt, zonder garantie, tenzij schriftelijk anders is overeengekomen.
In geval van overmacht aan de zijde van Autocity worden de verplichtingen opgeschort voor de duur van de overmachtssituatie.
Indien van toepassing worden aanvullende afspraken vastgelegd in het koopcontract of leverdocument.
` : `
- Het voertuig wordt geleverd zoals gezien, gereden en akkoord bevonden door koper
- Levering vindt plaats na volledige betaling en op het moment van fysieke overdracht of registratie bij RDW op naam van koper
- Het risico van verlies of beschadiging gaat over op koper op het moment van levering
${downPaymentAmount > 0 ? `- Klant dient de aanbetaling van ${downPaymentPercentage > 0 ? `${downPaymentPercentage}% ` : ''}€ ${downPaymentAmount.toLocaleString('nl-NL')} per bank te voldoen.` : ''}

${options.tradeInVehicle ? `
INRUILVOERTUIGEN:
Indien sprake is van inruil, verklaart koper dat het inruilvoertuig eigendom is van hem/haar en vrij is van beslagen of verborgen gebreken, tenzij vooraf gemeld.
AutoCity behoudt zich het recht voor inruilvoertuigen te weigeren bij onjuiste opgave.
` : ''}

TOEPASSELIJK RECHT EN GESCHILLEN:
Op deze overeenkomst is uitsluitend Nederlands recht van toepassing.
Geschillen worden bij voorkeur in onderling overleg opgelost. Indien nodig zal het geschil worden voorgelegd aan de bevoegde rechter te Rotterdam.
`}

${options.additionalClauses ? `
AANVULLENDE CLAUSULES:
${options.additionalClauses}
` : ''}

${options.specialAgreements ? `
SPECIALE AFSPRAKEN:
${options.specialAgreements}
` : ''}

ONDERTEKENING:
Datum: ${currentDate}
Plaats: Rotterdam

Verkoper: ________________    Koper: ________________

Deze overeenkomst is opgesteld conform Nederlandse wetgeving.
  `.trim();
};

export const getContractPreview = (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions
): string => {
  const basePrice = vehicle.sellingPrice || 0;
  const isB2B = contractType === "b2b";
  
  return `
Koopcontract ${isB2B ? 'B2B' : 'B2C'} - AutoCity
Voertuig: ${vehicle.brand} ${vehicle.model}${vehicle.color ? ` (${vehicle.color})` : ''}
Kenteken: ${vehicle.licenseNumber}
Kilometerstand: ${vehicle.mileage?.toLocaleString('nl-NL')} km
Prijs: € ${basePrice.toLocaleString('nl-NL')}
${isB2B ? `BTW opbouw beschikbaar` : `Pakket: ${options.deliveryPackage}`}
Klant: ${vehicle.customerName || 'Niet ingesteld'}
  `.trim();
};
