import ExcelJS from 'exceljs';
import { DealerSearchResult } from '@/hooks/useDealerSearch';

export const exportDealerSearchToExcel = async (result: DealerSearchResult) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Autobedrijf CRM - Concurrentie Monitor';
  workbook.created = new Date();

  // Create worksheet
  const worksheet = workbook.addWorksheet('Dealer Analyse', {
    views: [{ state: 'frozen', ySplit: 4 }]
  });

  // Title row
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Concurrentie Monitor: ${result.dealerName}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF7C3AED' } };
  titleCell.alignment = { horizontal: 'center' };

  // Stats row
  worksheet.mergeCells('A2:I2');
  const statsCell = worksheet.getCell('A2');
  statsCell.value = `Totaal: ${result.totalVehicles} voertuigen | Voorraad: ${result.inStock.length} | Verkocht: ${result.sold.length} | Gem. prijs: €${result.stats.avgPrice.toLocaleString('nl-NL')} | Gem. stadagen: ${result.stats.avgStockDays}`;
  statsCell.font = { size: 11, color: { argb: 'FF666666' } };
  statsCell.alignment = { horizontal: 'center' };

  // Top brands row
  if (result.stats.topBrands.length > 0) {
    worksheet.mergeCells('A3:I3');
    const brandsCell = worksheet.getCell('A3');
    brandsCell.value = `Top merken: ${result.stats.topBrands.map(b => `${b.brand} (${b.count})`).join(' | ')}`;
    brandsCell.font = { size: 10, italic: true, color: { argb: 'FF888888' } };
    brandsCell.alignment = { horizontal: 'center' };
  }

  // Define columns
  worksheet.columns = [
    { header: 'Kenteken', key: 'licensePlate', width: 12 },
    { header: 'Merk', key: 'brand', width: 14 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Bouwjaar', key: 'buildYear', width: 10 },
    { header: 'KM-stand', key: 'mileage', width: 12 },
    { header: 'Prijs', key: 'price', width: 12 },
    { header: 'Stadagen', key: 'stockDays', width: 10 },
    { header: 'Verkocht', key: 'soldSince', width: 10 },
    { header: 'APR', key: 'apr', width: 8 },
    { header: 'Brandstof', key: 'fuel', width: 10 },
    { header: 'Carrosserie', key: 'body', width: 12 },
    { header: 'URL', key: 'url', width: 40 }
  ];

  // Header row (row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.values = ['Kenteken', 'Merk', 'Model', 'Bouwjaar', 'KM-stand', 'Prijs', 'Stadagen', 'Verkocht', 'APR', 'Brandstof', 'Carrosserie', 'URL'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' }
  };
  headerRow.alignment = { horizontal: 'center' };

  let currentRow = 5;

  // In Stock section
  if (result.inStock.length > 0) {
    const inStockHeader = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    inStockHeader.getCell(1).value = `🚗 VOORRAAD (${result.inStock.length} voertuigen)`;
    inStockHeader.getCell(1).font = { bold: true, size: 12 };
    inStockHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' }
    };
    currentRow++;

    result.inStock.forEach(vehicle => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        vehicle.licensePlate || '-',
        vehicle.brand,
        vehicle.model,
        vehicle.buildYear || '-',
        vehicle.mileage || '-',
        vehicle.price || '-',
        vehicle.stockDays,
        '-',
        vehicle.apr,
        vehicle.fuel || '-',
        vehicle.body || '-',
        vehicle.url || ''
      ];

      // Format cells
      if (vehicle.mileage) {
        row.getCell(5).numFmt = '#,##0';
      }
      if (vehicle.price) {
        row.getCell(6).numFmt = '€#,##0';
      }

      // Add hyperlink for URL
      if (vehicle.url) {
        row.getCell(12).value = { text: 'Bekijk →', hyperlink: vehicle.url };
        row.getCell(12).font = { color: { argb: 'FF0066CC' }, underline: true };
      }

      currentRow++;
    });

    currentRow++; // Empty row between sections
  }

  // Sold section
  if (result.sold.length > 0) {
    const soldHeader = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:L${currentRow}`);
    soldHeader.getCell(1).value = `✅ VERKOCHT (${result.sold.length} voertuigen)`;
    soldHeader.getCell(1).font = { bold: true, size: 12 };
    soldHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' }
    };
    currentRow++;

    result.sold.forEach(vehicle => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        vehicle.licensePlate || '-',
        vehicle.brand,
        vehicle.model,
        vehicle.buildYear || '-',
        vehicle.mileage || '-',
        vehicle.price || '-',
        vehicle.stockDays,
        vehicle.soldSince !== null ? `${vehicle.soldSince} dgn` : '-',
        vehicle.apr,
        vehicle.fuel || '-',
        vehicle.body || '-',
        vehicle.url || ''
      ];

      // Format cells
      if (vehicle.mileage) {
        row.getCell(5).numFmt = '#,##0';
      }
      if (vehicle.price) {
        row.getCell(6).numFmt = '€#,##0';
      }

      // Highlight sold since column
      row.getCell(8).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }
      };

      // Add hyperlink for URL
      if (vehicle.url) {
        row.getCell(12).value = { text: 'Bekijk →', hyperlink: vehicle.url };
        row.getCell(12).font = { color: { argb: 'FF0066CC' }, underline: true };
      }

      currentRow++;
    });
  }

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const safeDealer = result.dealerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Concurrentie_${safeDealer}_${timestamp}.xlsx`;

  // Export file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
