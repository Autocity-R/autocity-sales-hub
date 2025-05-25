
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

export interface GeneratedContract {
  content: string;
  htmlContent: string; // Nieuwe HTML versie voor digitale weergave
  fileName: string;
  pdfUrl?: string;
  signatureUrl?: string; // URL voor digitale ondertekening
}

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
  let finalPrice = basePrice;
  let btwAmount = 0;
  let priceExclBtw = 0;

  if (isB2B) {
    // For B2B, calculate BTW breakdown
    priceExclBtw = Math.round(basePrice / 1.21);
    btwAmount = basePrice - priceExclBtw;
    finalPrice = basePrice;
  } else {
    // For B2C, price is typically inclusive
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
    priceExclBtw
  );

  const fileName = `koopcontract_${vehicle.licenseNumber}_${currentDate.replace(/\//g, '-')}.pdf`;

  return {
    content: textContent,
    htmlContent,
    fileName,
    pdfUrl: `https://example.com/contracts/${fileName}`,
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333333;
            background: white;
        }
        
        .contract {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
            min-height: 297mm;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #FF7A00;
            padding-bottom: 20px;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            width: 160px;
            height: 60px;
            background: linear-gradient(135deg, #000000, #333333);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 24px;
            margin-bottom: 15px;
            letter-spacing: -1px;
        }
        
        .company-info {
            text-align: right;
            flex: 1;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 8px;
        }
        
        .company-details {
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
        }
        
        .title {
            text-align: center;
            font-size: 32px;
            font-weight: 700;
            color: #000000;
            margin: 40px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .contract-info {
            background: #f8f9fa;
            border-left: 4px solid #FF7A00;
            border-radius: 0 8px 8px 0;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .contract-info h3 {
            color: #000000;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            border-bottom: 2px solid #FF7A00;
            padding-bottom: 8px;
        }
        
        .info-vertical {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .info-label {
            font-weight: 600;
            color: #000000;
            font-size: 14px;
        }
        
        .info-value {
            color: #333333;
            font-weight: 500;
            font-size: 14px;
            padding-left: 0;
        }
        
        .vehicle-section {
            background: linear-gradient(135deg, #fff7ed, #fed7aa);
            border: 2px solid #FF7A00;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            position: relative;
        }
        
        .vehicle-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #FF7A00, #ff9500);
            border-radius: 12px 12px 0 0;
        }
        
        .vehicle-title {
            font-size: 24px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        .price-section {
            background: white;
            border: 3px solid #000000;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .price-title {
            font-size: 20px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 2px solid #FF7A00;
            padding-bottom: 10px;
        }
        
        .price-breakdown {
            margin-bottom: 20px;
        }
        
        .price-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 16px;
        }
        
        .price-item:last-child {
            border-bottom: none;
        }
        
        .price-label {
            font-weight: 500;
            color: #333333;
        }
        
        .price-value {
            font-weight: 600;
            color: #000000;
        }
        
        .price-total {
            background: linear-gradient(135deg, #000000, #333333);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            border: 2px solid #FF7A00;
        }
        
        .terms-section {
            margin-bottom: 30px;
        }
        
        .terms-title {
            font-size: 18px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 15px;
            border-bottom: 2px solid #FF7A00;
            padding-bottom: 8px;
        }
        
        .terms-content {
            font-size: 15px;
            line-height: 1.7;
            color: #333333;
        }
        
        .terms-content p {
            margin-bottom: 8px;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 3px solid #FF7A00;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 3px solid #000000;
            height: 70px;
            margin-bottom: 15px;
        }
        
        .signature-label {
            font-weight: 600;
            color: #000000;
            font-size: 16px;
        }
        
        .digital-signature {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            border: 3px solid #3b82f6;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        
        .digital-signature h3 {
            color: #1e40af;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .signature-button {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 15px;
            font-size: 16px;
        }
        
        .qr-code {
            margin: 20px auto;
            width: 120px;
            height: 120px;
            background: #f3f4f6;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #6b7280;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 25px;
            border-top: 2px solid #e5e7eb;
            font-size: 13px;
            color: #666666;
            text-align: center;
            line-height: 1.6;
        }
        
        @media print {
            .contract {
                margin: 0;
                padding: 15mm;
            }
            
            .digital-signature {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="contract">
        <div class="header">
            <div class="logo-section">
                <div class="logo">AutoCity</div>
            </div>
            <div class="company-info">
                <div class="company-name">${companyInfo.tradeName}</div>
                <div class="company-details">
                    ${companyInfo.address}<br>
                    ${companyInfo.postalCode} ${companyInfo.city}<br>
                    ${companyInfo.country}<br><br>
                    Tel: ${companyInfo.phone}<br>
                    BTW: ${companyInfo.btw}<br>
                    IBAN: ${companyInfo.iban}<br>
                    ${companyInfo.website}
                </div>
            </div>
        </div>
        
        <h1 class="title">Koopovereenkomst Personenauto</h1>
        
        <div class="contract-info">
            <h3>Contractgegevens</h3>
            <div class="info-vertical">
                <div class="info-item">
                    <span class="info-label">Contractnummer:</span>
                    <span class="info-value">AC-${vehicle.licenseNumber}-${Date.now().toString().slice(-6)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Datum:</span>
                    <span class="info-value">${currentDate}</span>
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
                    <span class="info-label">Adres:</span>
                    <span class="info-value">[Adres van klant]</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${vehicle.customerContact?.email || '[Email adres]'}</span>
                </div>
            </div>
        </div>
        
        <div class="vehicle-section">
            <h2 class="vehicle-title">${vehicle.brand} ${vehicle.model}${vehicle.color ? ` - ${vehicle.color}` : ''}</h2>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="info-label">Kenteken:</span>
                        <span class="info-value">${vehicle.licenseNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Chassisnummer:</span>
                        <span class="info-value">${vehicle.vin}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Kilometerstand:</span>
                        <span class="info-value">${vehicle.mileage?.toLocaleString('nl-NL')} km</span>
                    </div>
                </div>
                <div>
                    ${vehicle.year ? `
                    <div class="info-item">
                        <span class="info-label">Bouwjaar:</span>
                        <span class="info-value">${vehicle.year}</span>
                    </div>
                    ` : ''}
                    <div class="info-item">
                        <span class="info-label">Brandstof:</span>
                        <span class="info-value">Benzine</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="price-section">
            <h2 class="price-title">Prijsopbouw</h2>
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
                    <div class="price-item">
                        <span class="price-label">Afleverpakket</span>
                        <span class="price-value">${options.deliveryPackage}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Betalingsvoorwaarden</span>
                        <span class="price-value">${options.paymentTerms}</span>
                    </div>
                `}
            </div>
            <div class="price-total">
                Totaal te betalen: € ${finalPrice.toLocaleString('nl-NL')}
            </div>
        </div>
        
        <div class="terms-section">
            <h3 class="terms-title">Leveringsvoorwaarden</h3>
            <div class="terms-content">
                <p>• Het voertuig wordt geleverd in de staat waarin het zich bevindt op moment van ondertekening</p>
                <p>• Levering vindt plaats na volledige betaling van het aankoopbedrag</p>
                <p>• ${isB2B ? 'Zakelijke levering conform BOVAG voorwaarden' : 'Particuliere verkoop met consumentenbescherming'}</p>
                ${options.maxDamageAmount ? `<p>• Maximaal geaccepteerde schade: € ${options.maxDamageAmount}</p>` : ''}
            </div>
        </div>
        
        ${options.additionalClauses ? `
        <div class="terms-section">
            <h3 class="terms-title">Aanvullende Contractclausules</h3>
            <div class="terms-content">
                <p>${options.additionalClauses.replace(/\n/g, '</p><p>')}</p>
            </div>
        </div>
        ` : ''}
        
        ${options.specialAgreements ? `
        <div class="terms-section">
            <h3 class="terms-title">Speciale Afspraken</h3>
            <div class="terms-content">
                <p>${options.specialAgreements.replace(/\n/g, '</p><p>')}</p>
            </div>
        </div>
        ` : ''}
        
        ${signatureUrl ? `
        <div class="digital-signature">
            <h3>Digitaal Ondertekenen</h3>
            <p>Klik op onderstaande knop om dit contract digitaal te ondertekenen:</p>
            <a href="${signatureUrl}" class="signature-button">Contract Ondertekenen</a>
            <div class="qr-code">QR-CODE</div>
            <p style="font-size: 12px; color: #6b7280;">Scan de QR-code met uw telefoon</p>
        </div>
        ` : ''}
        
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Verkoper<br>${companyInfo.tradeName}</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Koper<br>${isB2B ? (vehicle.customerName || '[Bedrijfsnaam]') : (vehicle.customerContact?.name || '[Voor- en achternaam]')}</div>
            </div>
        </div>
        
        <div class="footer">
            Deze overeenkomst is opgesteld conform de Nederlandse wetgeving en BOVAG voorwaarden.<br>
            AutoCity is ingeschreven bij de Kamer van Koophandel Rotterdam
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
  priceExclBtw: number
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

PRIJSOPBOUW:
${isB2B ? `
Bedrag exclusief BTW: € ${priceExclBtw.toLocaleString('nl-NL')}
BTW (21%): € ${btwAmount.toLocaleString('nl-NL')}
Bedrag inclusief BTW: € ${basePrice.toLocaleString('nl-NL')}
` : `
Verkoopprijs voertuig (inclusief BTW): € ${basePrice.toLocaleString('nl-NL')}
Afleverpakket: ${options.deliveryPackage}
Betalingsvoorwaarden: ${options.paymentTerms}
`}

TOTAAL TE BETALEN: € ${finalPrice.toLocaleString('nl-NL')}

LEVERINGSVOORWAARDEN:
- Het voertuig wordt geleverd in de staat waarin het zich bevindt
- Levering vindt plaats na volledige betaling
- ${isB2B ? 'Zakelijke verkoop conform BOVAG voorwaarden' : 'Particuliere verkoop met consumentenbescherming'}
${options.maxDamageAmount ? `- Maximaal geaccepteerde schade: € ${options.maxDamageAmount}` : ''}

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
