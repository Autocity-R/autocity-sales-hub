import ExcelJS from 'exceljs';
import { Vehicle } from "@/types/inventory";
import { getExportWatermark } from "@/services/exportWatermarkService";

// Helper function to determine payment status display
export const getPaymentStatusDisplay = (vehicle: Vehicle): string => {
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
export const getPickupStatusDisplay = (vehicle: Vehicle): string => {
  if (vehicle.details?.pickupDocumentSent) return 'Transport verstuurd';
  return 'Niet ready';
};

// Helper function to get customer name
export const getCustomerName = (vehicle: Vehicle): string => {
  // Use customerContact if available
  if (vehicle.customerContact) {
    const name = vehicle.customerContact.name || '';
    if (name) return name;
  }
  
  // Fallback to customerName
  if (vehicle.customerName) return vehicle.customerName;
  
  return 'AUTOCITY';
};

// Helper function to get supplier/leverancier name
export const getSupplierName = (vehicle: Vehicle): string => {
  // Use supplierContact if available
  if (vehicle.supplierContact?.name) {
    return vehicle.supplierContact.name;
  }
  
  return '-';
};

// Helper function to check if payment is complete
export const isPaymentComplete = (vehicle: Vehicle): boolean => {
  const purchasePaymentStatus = vehicle.details?.purchase_payment_status;
  if (purchasePaymentStatus === 'volledig_betaald') return true;
  if (vehicle.paymentStatus === 'volledig_betaald') return true;
  return false;
};

// Helper function to check if pickup document is sent
export const isPickupSent = (vehicle: Vehicle): boolean => {
  return vehicle.details?.pickupDocumentSent === true;
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

// NEW: Transport Planning Excel export with color-coded statuses
export const exportTransportPlanningToExcel = async (vehicles: Vehicle[]) => {
  // Get watermark info before creating workbook
  const watermark = await getExportWatermark();
  
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transport Planning');

  // Set metadata (watermark for non-owners)
  if (watermark.shouldWatermark) {
    workbook.creator = `AutoCity CRM - ${watermark.exportedBy}`;
    workbook.subject = `Export ID: ${watermark.exportId}`;
  }

  // Color fills for status cells
  const greenFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' } // Light green
  };

  const redFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCCCB' } // Light red
  };

  // Headers
  const headers = [
    'Merk',
    'Model',
    'Kenteken',
    'VIN',
    'Leverancier',
    'Betaalstatus',
    'Pickup Status'
  ];

  // Add header row
  const headerRow = worksheet.addRow(headers);
  
  // Style header row - BOLD with dark background
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2D3748' } // Dark gray/blue
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Add data rows with color-coded statuses
  vehicles.forEach(v => {
    const isPaid = isPaymentComplete(v);
    const isSent = isPickupSent(v);
    
    const row = worksheet.addRow([
      v.brand || '',
      v.model || '',
      v.licenseNumber || '-',
      v.vin || '',
      getSupplierName(v),
      isPaid ? 'Betaald' : 'Niet betaald',
      isSent ? 'Verstuurd' : 'Niet verstuurd'
    ]);

    // Add borders to all cells
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Apply color to Betaalstatus cell (column 6)
    const paymentCell = row.getCell(6);
    paymentCell.fill = isPaid ? greenFill : redFill;
    paymentCell.font = { bold: true };
    paymentCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Apply color to Pickup Status cell (column 7)
    const pickupCell = row.getCell(7);
    pickupCell.fill = isSent ? greenFill : redFill;
    pickupCell.font = { bold: true };
    pickupCell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Set column widths
  worksheet.columns = [
    { width: 14 },  // Merk
    { width: 18 },  // Model
    { width: 14 },  // Kenteken
    { width: 22 },  // VIN
    { width: 24 },  // Leverancier
    { width: 16 },  // Betaalstatus
    { width: 16 },  // Pickup Status
  ];

  // Add watermark footer for non-owners
  if (watermark.shouldWatermark) {
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      `Geëxporteerd door: ${watermark.exportedBy} | ${watermark.exportedAt} | ID: ${watermark.exportId}`
    ]);
    footerRow.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
  }

  // Generate filename with date
  const today = new Date().toISOString().split('T')[0];
  const filename = `AutoCity_Transport_Planning_${today}.xlsx`;

  // Generate buffer and download
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
