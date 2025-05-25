
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
  let bpmAmount = 0;

  if (isB2B) {
    if (options.btwType === "inclusive" && options.vehicleType === "btw") {
      btwAmount = Math.round((basePrice / 1.21) * 0.21);
    }
    if (!options.bpmIncluded) {
      bpmAmount = 1000; // Simplified BPM calculation
      finalPrice += bpmAmount;
    }
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
    bpmAmount,
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
    bpmAmount
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
  bpmAmount: number,
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
            color: #1f2937;
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
            border-bottom: 2px solid #ef4444;
            padding-bottom: 20px;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            width: 120px;
            height: 60px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        .company-info {
            text-align: right;
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #ef4444;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
        }
        
        .title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .contract-info {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .contract-info h3 {
            color: #ef4444;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            min-width: 120px;
        }
        
        .info-value {
            color: #1f2937;
        }
        
        .vehicle-section {
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .vehicle-title {
            font-size: 20px;
            font-weight: 700;
            color: #dc2626;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .price-section {
            background: white;
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .price-title {
            font-size: 18px;
            font-weight: 600;
            color: #ef4444;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .price-breakdown {
            margin-bottom: 15px;
        }
        
        .price-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .price-item:last-child {
            border-bottom: none;
        }
        
        .price-total {
            background: #ef4444;
            color: white;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            text-align: center;
            font-size: 20px;
            font-weight: 700;
        }
        
        .terms-section {
            margin-bottom: 25px;
        }
        
        .terms-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
        }
        
        .terms-content {
            font-size: 14px;
            line-height: 1.6;
            color: #4b5563;
        }
        
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 2px solid #374151;
            height: 60px;
            margin-bottom: 10px;
        }
        
        .signature-label {
            font-weight: 600;
            color: #374151;
        }
        
        .digital-signature {
            background: #dbeafe;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        
        .digital-signature h3 {
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        .signature-button {
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 10px;
        }
        
        .qr-code {
            margin: 15px auto;
            width: 100px;
            height: 100px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #6b7280;
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
                <div style="font-size: 14px; color: #6b7280;">
                    ${companyInfo.name}<br>
                    Kenteken: KvK Rotterdam
                </div>
            </div>
            <div class="company-info">
                <div class="company-name">${companyInfo.tradeName}</div>
                <div class="company-details">
                    ${companyInfo.address}<br>
                    ${companyInfo.postalCode} ${companyInfo.city}<br>
                    ${companyInfo.country}<br><br>
                    Tel: ${companyInfo.phone}<br>
                    BTW: ${companyInfo.btw}<br>
                    IBAN: ${companyInfo.iban}
                </div>
            </div>
        </div>
        
        <h1 class="title">Koopovereenkomst Personenauto</h1>
        
        <div class="contract-info">
            <h3>Contractgegevens</h3>
            <div class="info-grid">
                <div>
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
                </div>
                <div>
                    <div class="info-item">
                        <span class="info-label">Verkoper:</span>
                        <span class="info-value">${vehicle.salespersonName || 'AutoCity'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Klant:</span>
                        <span class="info-value">${vehicle.customerName || '[Klantnaam]'}</span>
                    </div>
                    ${vehicle.customerContact?.email ? `
                    <div class="info-item">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${vehicle.customerContact.email}</span>
                    </div>
                    ` : ''}
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
                    <div class="info-item">
                        <span class="info-label">Staat:</span>
                        <span class="info-value">${vehicle.damage?.status === 'geen' ? 'Uitstekend' : 'Goed'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="price-section">
            <h2 class="price-title">Financiële Specificatie</h2>
            <div class="price-breakdown">
                <div class="price-item">
                    <span>Catalogusprijs voertuig</span>
                    <span>€ ${basePrice.toLocaleString('nl-NL')}</span>
                </div>
                ${isB2B ? `
                    ${options.btwType === "inclusive" && btwAmount > 0 ? `
                    <div class="price-item">
                        <span>BTW (21%)</span>
                        <span>€ ${btwAmount.toLocaleString('nl-NL')}</span>
                    </div>
                    ` : ''}
                    ${!options.bpmIncluded && bpmAmount > 0 ? `
                    <div class="price-item">
                        <span>BPM (voor rekening koper)</span>
                        <span>€ ${bpmAmount.toLocaleString('nl-NL')}</span>
                    </div>
                    ` : ''}
                    <div class="price-item">
                        <span>BTW behandeling</span>
                        <span>${options.btwType === 'inclusive' ? 'Inclusief BTW' : 'Exclusief BTW'}</span>
                    </div>
                    <div class="price-item">
                        <span>Voertuig type</span>
                        <span>${options.vehicleType === 'marge' ? 'Marge regeling' : 'BTW voertuig'}</span>
                    </div>
                ` : `
                    <div class="price-item">
                        <span>Afleverpakket</span>
                        <span>${options.deliveryPackage}</span>
                    </div>
                    <div class="price-item">
                        <span>Betalingsvoorwaarden</span>
                        <span>${options.paymentTerms}</span>
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
                <p>• Garantie conform wettelijke bepalingen voor ${isB2B ? 'zakelijke' : 'particuliere'} verkoop</p>
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
                <div class="signature-label">Verkoper<br>${companyInfo.name}</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Koper<br>${vehicle.customerName || '[Klantnaam]'}</div>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            Deze overeenkomst is opgesteld conform de Nederlandse wetgeving en BOVAG voorwaarden.<br>
            AutoCity is ingeschreven bij de Kamer van Koophandel Rotterdam onder nummer [KvK nummer]
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
  bpmAmount: number
): string => {
  const isB2B = contractType === "b2b";
  
  return `
KOOPOVEREENKOMST PERSONENAUTO

VERKOPER:
${companyInfo.name} (${companyInfo.tradeName})
${companyInfo.address}
${companyInfo.postalCode} ${companyInfo.city}, ${companyInfo.country}
Telefoon: ${companyInfo.phone}
BTW-nummer: ${companyInfo.btw}
IBAN: ${companyInfo.iban}

KOPER:
${isB2B ? 'Zakelijke klant:' : 'Particuliere klant:'} ${vehicle.customerName || '[Klantnaam]'}
${vehicle.customerContact?.email ? `Email: ${vehicle.customerContact.email}` : ''}

VOERTUIGGEGEVENS:
Merk en model: ${vehicle.brand} ${vehicle.model}
${vehicle.color ? `Kleur: ${vehicle.color}` : ''}
Kenteken: ${vehicle.licenseNumber}
Chassisnummer: ${vehicle.vin}
Kilometerstand: ${vehicle.mileage?.toLocaleString('nl-NL')} km
${vehicle.year ? `Bouwjaar: ${vehicle.year}` : ''}

FINANCIËLE BEPALINGEN:
Catalogusprijs: € ${basePrice.toLocaleString('nl-NL')}
${isB2B ? `
${options.btwType === "inclusive" && btwAmount > 0 ? `BTW (21%): € ${btwAmount.toLocaleString('nl-NL')} (${options.btwType === "inclusive" ? "inbegrepen" : "apart"})` : ''}
${options.vehicleType === "marge" ? 'Marge regeling van toepassing' : 'BTW voertuig'}
${!options.bpmIncluded && bpmAmount > 0 ? `BPM: € ${bpmAmount.toLocaleString('nl-NL')} (voor rekening koper)` : 'BPM inbegrepen'}
${options.maxDamageAmount ? `Maximaal geaccepteerde schade: € ${options.maxDamageAmount}` : ''}
` : `
Afleverpakket: ${options.deliveryPackage}
Betalingsvoorwaarden: ${options.paymentTerms}
`}

TOTAAL TE BETALEN: € ${finalPrice.toLocaleString('nl-NL')}

LEVERINGSVOORWAARDEN:
- Het voertuig wordt geleverd in de staat waarin het zich bevindt
- Levering vindt plaats na volledige betaling
- ${isB2B ? 'Zakelijke verkoop conform BOVAG voorwaarden' : 'Particuliere verkoop met consumentenbescherming'}
- Garantie volgens wettelijke bepalingen

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
${isB2B ? `BTW: ${options.btwType}, Type: ${options.vehicleType}` : `Pakket: ${options.deliveryPackage}`}
Klant: ${vehicle.customerName || 'Niet ingesteld'}
  `.trim();
};
