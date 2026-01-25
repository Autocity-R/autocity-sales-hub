import ExcelJS from 'exceljs';
import { Vehicle } from '@/types/inventory';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Kleurdefinities (ARGB formaat voor ExcelJS)
const COLORS = {
  RED: 'FFFF4444',
  GREEN: 'FF00AA00',
  ORANGE: 'FFFF8C00',
  WHITE: 'FFFFFFFF',
  HEADER_BG: 'FF1a1a2e',
  HEADER_TEXT: 'FFFFFFFF',
};

// Locatie kleur logica
const getLocationStyle = (location: string | undefined) => {
  const loc = location?.toLowerCase() || '';
  if (loc === 'onderweg') {
    return { fill: COLORS.RED, text: 'Onderweg' };
  } else if (loc === 'afgeleverd') {
    return { fill: COLORS.GREEN, text: 'Afgeleverd' };
  } else {
    // Showroom, opslag, calandstraat, werkplaats, etc.
    return { fill: COLORS.ORANGE, text: location || '-' };
  }
};

// Papieren kleur logica
const getPapersStyle = (papersReceived: boolean) => {
  if (papersReceived) {
    return { fill: COLORS.GREEN, text: '✓ Binnen' };
  } else {
    return { fill: COLORS.RED, text: '✗ Niet binnen' };
  }
};

// Betaling kleur logica
const getPaymentStyle = (status: string | undefined) => {
  switch (status) {
    case 'volledig_betaald':
      return { fill: COLORS.GREEN, text: 'Betaald' };
    case 'aanbetaling':
      return { fill: COLORS.ORANGE, text: 'Aanbetaling' };
    case 'niet_betaald':
    default:
      return { fill: COLORS.RED, text: 'Niet betaald' };
  }
};

// Format valuta
const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const exportB2BPaymentOverview = async (vehicles: Vehicle[]) => {
  if (vehicles.length === 0) {
    console.warn('Geen voertuigen om te exporteren');
    return;
  }

  // 1. Sorteer op klant, dan merk/model
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const customerA = a.customerName || 'Onbekend';
    const customerB = b.customerName || 'Onbekend';
    if (customerA !== customerB) return customerA.localeCompare(customerB);
    return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
  });

  // 2. Maak workbook en worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AutoCity CRM';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('B2B Betalingsoverzicht');

  // 3. Titel rij
  const dateStr = format(new Date(), 'dd-MM-yyyy', { locale: nl });
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `B2B Betalingsoverzicht - ${dateStr}`;
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.HEADER_BG } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // 4. Headers
  const headers = [
    'Merk',
    'Model', 
    'Kenteken',
    'VIN',
    'Klant',
    'Verkoopprijs',
    'Locatie',
    'Papieren',
    'Klant Betaling'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.HEADER_BG }
    };
    cell.font = { bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 5. Data rijen met kleurcodering
  sortedVehicles.forEach((vehicle) => {
    const locationStyle = getLocationStyle(vehicle.location);
    const papersStyle = getPapersStyle(vehicle.papersReceived);
    const paymentStyle = getPaymentStyle(vehicle.details?.sales_payment_status);

    const row = worksheet.addRow([
      vehicle.brand || '-',
      vehicle.model || '-',
      vehicle.licenseNumber || '-',
      vehicle.vin || '-',
      vehicle.customerName || 'Onbekend',
      formatCurrency(vehicle.sellingPrice),
      locationStyle.text,
      papersStyle.text,
      paymentStyle.text
    ]);

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle' };

      // Locatie kolom (7)
      if (colNumber === 7) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: locationStyle.fill }
        };
        cell.font = { color: { argb: COLORS.WHITE }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      
      // Papieren kolom (8)
      if (colNumber === 8) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: papersStyle.fill }
        };
        cell.font = { color: { argb: COLORS.WHITE }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      
      // Betaling kolom (9)
      if (colNumber === 9) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: paymentStyle.fill }
        };
        cell.font = { color: { argb: COLORS.WHITE }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Verkoopprijs kolom (6) - rechts uitlijnen
      if (colNumber === 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });
  });

  // 6. Kolom breedtes
  worksheet.columns = [
    { width: 12 },  // Merk
    { width: 15 },  // Model
    { width: 12 },  // Kenteken
    { width: 20 },  // VIN
    { width: 25 },  // Klant
    { width: 14 },  // Verkoopprijs
    { width: 14 },  // Locatie
    { width: 14 },  // Papieren
    { width: 16 },  // Klant Betaling
  ];

  // 7. Genereer en download bestand
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const fileName = `B2B_Betalingsoverzicht_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return fileName;
};
