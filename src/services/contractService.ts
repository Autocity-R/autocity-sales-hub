import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

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
  "aanbetaling_5": "Aanbetaling 5%",
  "aanbetaling_10": "Aanbetaling 10%"
};

export const generateContract = async (
  vehicle: Vehicle, 
  contractType: "b2b" | "b2c", 
  options: ContractOptions,
  signatureUrl?: string
): Promise<GeneratedContract> => {
  
  const isB2B = contractType === "b2b";
  const currentDate = new Date().toLocaleDateString("nl-NL");
  
  // Calculate prices based on options
  const basePrice = vehicle.sellingPrice || 0;
  let deliveryPackagePrice = 0;
  let tradeInPrice = 0;
  let finalPrice = basePrice;
  let btwAmount = 0;
  let priceExclBtw = 0;
  let downPaymentAmount = 0;
  let downPaymentPercentage = 0;

  // Calculate delivery package price for B2C
  if (!isB2B && options.deliveryPackage) {
    deliveryPackagePrice = DELIVERY_PACKAGE_PRICES[options.deliveryPackage as keyof typeof DELIVERY_PACKAGE_PRICES] || 0;
    finalPrice = basePrice + deliveryPackagePrice;
  }

  // Calculate trade-in for B2C
  if (!isB2B && options.tradeInVehicle) {
    tradeInPrice = options.tradeInVehicle.tradeInPrice;
    finalPrice = finalPrice - tradeInPrice;
  }

  // Calculate down payment for B2C (based on final price after trade-in)
  if (!isB2B && options.paymentTerms) {
    if (options.paymentTerms === "aanbetaling_5") {
      downPaymentPercentage = 5;
    } else if (options.paymentTerms === "aanbetaling_10") {
      downPaymentPercentage = 10;
    }
    downPaymentAmount = Math.round((finalPrice * downPaymentPercentage) / 100);
  }

  if (isB2B) {
    // For B2B, calculate BTW breakdown
    priceExclBtw = Math.round(basePrice / 1.21);
    btwAmount = basePrice - priceExclBtw;
    finalPrice = basePrice;
  }

  // Bedrijfsgegevens
  const companyInfo = {
    name: "HPM Cars VOF",
    tradeName: "AutoCity",
    address: "Thurledeweg 61a",
    postalCode: "3044ER",
    city: "Rotterdam",
    country: "Nederland",
    phone: "010-2623980",
    iban: "NL24ABNA0595583911",
    btw: "NL8563 08 791B01",
    kvk: "65900073",
    website: "www.auto-city.nl"
  };

  const htmlContent = generateHtmlContract(
    vehicle, 
    contractType, 
    options, 
    companyInfo, 
    currentDate, 
    basePrice, 
    finalPrice, 
    btwAmount, 
    priceExclBtw,
    deliveryPackagePrice,
    tradeInPrice,
    downPaymentAmount,
    downPaymentPercentage,
    signatureUrl
  );

  const textContent = generateTextContract(
    vehicle, 
    contractType, 
    options, 
    companyInfo, 
    currentDate, 
    basePrice, 
    finalPrice, 
    btwAmount, 
    priceExclBtw,
    deliveryPackagePrice,
    tradeInPrice,
    downPaymentAmount,
    downPaymentPercentage
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
  tradeInPrice: number,
  downPaymentAmount: number,
  downPaymentPercentage: number,
  signatureUrl?: string
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
            line-height: 1.4;
            color: #1a1a1a;
            background: white;
            font-size: 14px;
        }
        
        .contract {
            max-width: 210mm;
            margin: 0 auto;
            padding: 8mm;
            background: white;
            min-height: 297mm;
            page-break-inside: avoid;
        }
        
        .header {
            background: linear-gradient(135deg, #000000, #1a1a1a);
            color: white;
            padding: 15px 18px;
            margin: -8mm -8mm 15px -8mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            min-height: 85px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 0 0 auto;
        }
        
        .logo-container {
            background: white;
            padding: 8px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
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
            font-size: 28px;
            font-weight: 700;
            color: white;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 8px;
        }
        
        .contract-date {
            font-size: 14px;
            color: #cccccc;
            font-weight: 500;
        }
        
        .company-info {
            flex: 0 0 auto;
            text-align: right;
            font-size: 11px;
            color: #cccccc;
            line-height: 1.4;
            max-width: 200px;
        }
        
        .company-info div {
            margin-bottom: 3px;
        }
        
        .main-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .section {
            background: white;
            border: 2px solid #000000;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 10px;
        }
        
        .section-header {
            background: linear-gradient(135deg, #000000, #1a1a1a);
            color: white;
            padding: 10px 15px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section-content {
            padding: 15px;
        }
        
        .contract-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        
        .info-label {
            font-weight: 600;
            color: #4b5563;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            color: #1a1a1a;
            font-weight: 500;
            font-size: 13px;
            padding: 2px 0;
        }
        
        .vehicle-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
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
            padding: 8px 15px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
        }
        
        .price-item:last-child {
            border-bottom: none;
        }
        
        .price-label {
            font-weight: 500;
            color: #4b5563;
        }
        
        .price-value {
            font-weight: 600;
            color: #1a1a1a;
        }
        
        .price-total {
            background: linear-gradient(135deg, #000000, #1a1a1a);
            color: white;
            padding: 12px 15px;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .full-width-section {
            grid-column: 1 / -1;
        }
        
        .terms-content {
            font-size: ${isB2B ? '11px' : '12px'};
            line-height: 1.5;
            color: #4b5563;
        }
        
        .terms-content p {
            margin-bottom: 6px;
        }
        
        .terms-content ul {
            margin: 8px 0;
            padding-left: 18px;
        }
        
        .terms-content li {
            margin-bottom: 4px;
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
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
            line-height: 1.5;
        }
        
        @media print {
            .contract {
                margin: 0;
                padding: 6mm;
                font-size: 12px;
            }
            
            .digital-signature {
                display: none;
            }
            
            .header {
                padding: 12px 15px;
                margin: -6mm -6mm 12px -6mm;
            }
            
            .main-content {
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .section {
                margin-bottom: 8px;
            }
            
            .section-content {
                padding: 12px;
            }
            
            .terms-content {
                font-size: ${isB2B ? '10px' : '11px'};
            }
        }
    </style>
</head>
<body>
    <div class="contract">
        <div class="header">
            <div class="logo-section">
                <div class="logo-container">
                    <img src="/lovable-uploads/5ed4e40f-e743-47d8-ae24-9c02f8deab82.png" alt="AutoCity Logo" />
                </div>
            </div>
            <div class="header-center">
                <div class="header-title">KOOPCONTRACT</div>
                <div class="contract-date">Datum: ${currentDate}</div>
            </div>
            <div class="company-info">
                <div><strong>${companyInfo.tradeName}</strong></div>
                <div>${companyInfo.name}</div>
                <div>${companyInfo.address}</div>
                <div>${companyInfo.postalCode} ${companyInfo.city}</div>
                <div>${companyInfo.country}</div>
                <div>Tel: ${companyInfo.phone}</div>
                <div>IBAN: ${companyInfo.iban}</div>
                <div>BTW: ${companyInfo.btw}</div>
                <div>KVK: ${companyInfo.kvk}</div>
                <div>${companyInfo.website}</div>
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
                    <div class="vehicle-grid">
                        <div>
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
                        </div>
                        <div>
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
                    </div>
                    ${isB2B && options.bpmIncluded ? `
                    <div class="vehicle-grid" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="info-item">
                            <span class="info-label">Levering:</span>
                            <span class="info-value">Voertuig wordt geleverd inclusief NL kenteken</span>
                        </div>
                    </div>
                    ` : ''}
                    ${isB2B && options.maxDamageAmount && options.maxDamageAmount > 0 ? `
                    <div class="vehicle-grid" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="info-item">
                            <span class="info-label">Maximaal schade bedrag:</span>
                            <span class="info-value">€ ${options.maxDamageAmount.toLocaleString('nl-NL')}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${!isB2B && options.deliveryPackage ? `
                    <div class="vehicle-grid" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div class="info-item">
                            <span class="info-label">Afleverpakket:</span>
                            <span class="info-value">${DELIVERY_PACKAGE_LABELS[options.deliveryPackage as keyof typeof DELIVERY_PACKAGE_LABELS]}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Pakket prijs:</span>
                            <span class="info-value">€ ${deliveryPackagePrice.toLocaleString('nl-NL')}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${!isB2B && options.tradeInVehicle ? `
                    <div class="vehicle-grid" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f3f4f6;">
                        <div>
                            <div class="info-item">
                                <span class="info-label">Inruil merk/model:</span>
                                <span class="info-value">${options.tradeInVehicle.brand} ${options.tradeInVehicle.model}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Inruil kenteken:</span>
                                <span class="info-value">${options.tradeInVehicle.licenseNumber}</span>
                            </div>
                        </div>
                        <div>
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
                        <span class="price-label">Verkoopprijs voertuig (inclusief BTW)</span>
                        <span class="price-value">€ ${basePrice.toLocaleString('nl-NL')}</span>
                    </div>
                    ${deliveryPackagePrice > 0 ? `
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
                        ${downPaymentPercentage > 0 ? `<p>Klant dient de aanbetaling van ${downPaymentPercentage}% (€ ${downPaymentAmount.toLocaleString('nl-NL')}) per bank te voldoen.</p>` : ''}
                        
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
  tradeInPrice: number,
  downPaymentAmount: number,
  downPaymentPercentage: number
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
Adres: [Adres van klant]
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
Verkoopprijs voertuig (inclusief BTW): € ${basePrice.toLocaleString('nl-NL')}
${deliveryPackagePrice > 0 ? `Afleverpakket: € ${deliveryPackagePrice.toLocaleString('nl-NL')}` : ''}
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
${downPaymentPercentage > 0 ? `- Klant dient de aanbetaling van ${downPaymentPercentage}% (€ ${downPaymentAmount.toLocaleString('nl-NL')}) per bank te voldoen.` : ''}

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
