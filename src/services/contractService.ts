
import { Vehicle } from "@/types/inventory";
import { ContractOptions } from "@/types/email";

export interface GeneratedContract {
  content: string;
  fileName: string;
  pdfUrl?: string; // In production, this would be a generated PDF
}

export const generateContract = async (
  vehicle: Vehicle, 
  contractType: "b2b" | "b2c", 
  options: ContractOptions
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
      // BPM calculation would be based on CO2 emissions, simplified here
      bpmAmount = 1000; // Placeholder
      finalPrice += bpmAmount;
    }
  }

  const contractContent = `
KOOPOVEREENKOMST PERSONENAUTO

Partijen:
Verkoper: Auto Import Nederland
Adres: [Bedrijfsadres]

${isB2B ? 'Koper (Zakelijk):' : 'Koper (Particulier):'} ${vehicle.customerName || '[Klantnaam]'}
${vehicle.customerContact ? `Email: ${vehicle.customerContact.email}` : ''}

Voertuig gegevens:
Merk en model: ${vehicle.brand} ${vehicle.model}
Kenteken: ${vehicle.licenseNumber}
VIN-nummer: ${vehicle.vin}
Kilometerstand: ${vehicle.mileage?.toLocaleString()} km
${vehicle.year ? `Bouwjaar: ${vehicle.year}` : ''}

Financiële bepalingen:
${isB2B ? `
Verkoopprijs: €${basePrice.toLocaleString()}
${options.btwType === "inclusive" ? `BTW (21%): €${btwAmount.toLocaleString()} (inbegrepen)` : 'BTW: Zie apart BTW factuur'}
${options.vehicleType === "marge" ? 'Marge regeling van toepassing' : 'BTW voertuig'}
${!options.bpmIncluded ? `BPM: €${bpmAmount.toLocaleString()} (voor rekening koper)` : 'BPM inbegrepen'}
${options.maxDamageAmount ? `Maximaal geaccepteerde schade: €${options.maxDamageAmount}` : ''}
` : `
Verkoopprijs: €${basePrice.toLocaleString()}
Afleverpakket: ${options.deliveryPackage}
Betalingsvoorwaarden: ${options.paymentTerms}
`}

Totaal te betalen: €${finalPrice.toLocaleString()}

Leveringsvoorwaarden:
- Het voertuig wordt geleverd in de staat waarin het zich bevindt
- Levering vindt plaats na volledige betaling
${isB2B ? 
`- Voertuig wordt geleverd conform zakelijke voorwaarden
- Garantie volgens wettelijke bepalingen` :
`- Particuliere verkoop met consumentenbescherming
- ${options.deliveryPackage} aflevering inbegrepen`}

${options.additionalClauses ? `
Aanvullende clausules:
${options.additionalClauses}
` : ''}

${options.specialAgreements ? `
Speciale afspraken:
${options.specialAgreements}
` : ''}

Ondertekening:
Datum: ${currentDate}

Verkoper: ________________    Koper: ________________

Deze overeenkomst is opgesteld conform Nederlandse wetgeving.
  `.trim();

  const fileName = `koopcontract_${vehicle.licenseNumber}_${currentDate.replace(/\//g, '-')}.pdf`;

  // In production, you would generate an actual PDF here
  // For now, we'll simulate this
  return {
    content: contractContent,
    fileName,
    pdfUrl: `https://example.com/contracts/${fileName}` // Mock URL
  };
};

export const getContractPreview = (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  options: ContractOptions
): string => {
  // Return a shortened preview version
  const basePrice = vehicle.sellingPrice || 0;
  const isB2B = contractType === "b2b";
  
  return `
Koopcontract ${isB2B ? 'B2B' : 'B2C'}
Voertuig: ${vehicle.brand} ${vehicle.model}
Kenteken: ${vehicle.licenseNumber}
Prijs: €${basePrice.toLocaleString()}
${isB2B ? `BTW: ${options.btwType}, Type: ${options.vehicleType}` : `Pakket: ${options.deliveryPackage}`}
  `.trim();
};
