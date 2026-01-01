import ExcelJS from 'exceljs';
import { Vehicle } from "@/types/inventory";
import { getExportWatermark } from "@/services/exportWatermarkService";

// Helper function to determine payment status display
const getPaymentStatusDisplay = (vehicle: Vehicle): string => {
  // Use details.purchase_payment_status (inkoop betaling)
  const purchasePaymentStatus = vehicle.details?.purchase_payment_status;
  
  if (purchasePaymentStatus === 'volledig_betaald') return 'Betaald';
  if (purchasePaymentStatus === 'aanbetaling') return 'Deels betaald';
  if (purchasePaymentStatus === 'niet_betaald') return 'Niet betaald';
  
  // Fallback to main paymentStatus
  if (vehicle.paymentStatus === 'volledig_betaald') return 'Betaald';
  if (vehicle.paymentStatus === 'aanbetaling') return 'Deels betaald';
  return 'Niet betaald';
};

// Helper function to determine pickup status display
const getPickupStatusDisplay = (vehicle: Vehicle): string => {
  if (vehicle.details?.pickupDocumentSent) return 'Transport verstuurd';
  return 'Niet ready';
};

// Helper function to get customer name
const getCustomerName = (vehicle: Vehicle): string => {
  // Use customerContact if available
  if (vehicle.customerContact) {
    const name = vehicle.customerContact.name || '';
    if (name) return name;
  }
  
  // Fallback to customerName
  if (vehicle.customerName) return vehicle.customerName;
  
  return 'AUTOCITY';
};

export const exportTransportToExcel = async (vehicles: Vehicle[]) => {
  // Get watermark info before creating workbook
  const watermark = await getExportWatermark();
  
  // Maak workbook en worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transport Overzicht');

  // Set metadata (watermark for non-owners)
  if (watermark.shouldWatermark) {
    workbook.creator = `AutoCity CRM - ${watermark.exportedBy}`;
    workbook.subject = `Export ID: ${watermark.exportId}`;
  }

  // Headers
  const headers = [
    'Merk',
    'Model',
    'VIN',
    'Kenteken',
    'Betaalstatus',
    'Pickup Status',
    'Klant'
  ];

  // Voeg header rij toe
  const headerRow = worksheet.addRow(headers);
  
  // Style header rij - BOLD met grijze achtergrond
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE9E9E9' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    cell.alignment = { vertical: 'middle' };
  });

  // Voeg data rijen toe
  vehicles.forEach(v => {
    const row = worksheet.addRow([
      v.brand || '',
      v.model || '',
      v.vin || '',
      v.licenseNumber || '',
      getPaymentStatusDisplay(v),
      getPickupStatusDisplay(v),
      getCustomerName(v)
    ]);

    // Voeg randen toe aan elke cel
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  // Stel kolombreedtes in
  worksheet.columns = [
    { width: 14 },  // Merk
    { width: 18 },  // Model
    { width: 20 },  // VIN
    { width: 14 },  // Kenteken
    { width: 14 },  // Betaalstatus
    { width: 18 },  // Pickup Status
    { width: 22 },  // Klant
  ];

  // Add watermark footer for non-owners
  if (watermark.shouldWatermark) {
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      `Geëxporteerd door: ${watermark.exportedBy} | ${watermark.exportedAt} | ID: ${watermark.exportId}`
    ]);
    footerRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
  }

  // Genereer bestandsnaam met datum
  const today = new Date().toISOString().split('T')[0];
  const filename = `AutoCity_Transport_Overzicht_${today}.xlsx`;

  // Genereer buffer en download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename, count: vehicles.length };
};
