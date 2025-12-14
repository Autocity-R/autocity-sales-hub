import ExcelJS from 'exceljs';
import type { DealerAnalysisResult } from '@/types/dealerAnalysis';
import { getExportWatermark } from './exportWatermarkService';

export const exportDealerAnalysisToExcel = async (results: DealerAnalysisResult[]) => {
  const watermark = await getExportWatermark();
  
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  
  if (watermark.shouldWatermark) {
    workbook.creator = `AutoCity CRM - ${watermark.exportedBy}`;
    workbook.subject = `Export ID: ${watermark.exportId}`;
  } else {
    workbook.creator = 'Auto City - Dealer Analyse';
  }

  const worksheet = workbook.addWorksheet('Dealer Analyse', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define columns
  worksheet.columns = [
    { header: '#', key: 'rowIndex', width: 6 },
    { header: 'Merk', key: 'brand', width: 12 },
    { header: 'Model', key: 'model', width: 16 },
    { header: 'Bouwjaar', key: 'buildYear', width: 10 },
    { header: 'Vraagprijs', key: 'askingPrice', width: 14 },
    { header: 'Brandstof', key: 'fuelType', width: 12 },
    { header: 'Transmissie', key: 'transmission', width: 14 },
    { header: 'KM (zoek)', key: 'searchMileage', width: 12 },
    { header: 'Kenteken', key: 'licensePlate', width: 12 },
    { header: 'Dealer', key: 'dealer', width: 28 },
    { header: 'Verkoopprijs', key: 'price', width: 14 },
    { header: 'KM-stand', key: 'mileage', width: 12 },
    { header: 'Stadagen', key: 'daysInStock', width: 12 },
    { header: 'Verkocht geleden', key: 'soldSince', width: 16 },
    { header: 'Website', key: 'website', width: 14 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  let currentRow = 2;
  let totalDealers = 0;
  let totalVehicles = 0;

  // Process each vehicle result
  for (const result of results) {
    if (result.status !== 'completed' || result.dealers.length === 0) {
      continue;
    }

    totalVehicles++;
    const vehicleLabel = `${result.vehicle.brand} ${result.vehicle.model} ${result.vehicle.buildYear}`;

    // Add vehicle header row
    const vehicleHeaderRow = worksheet.getRow(currentRow);
    vehicleHeaderRow.getCell(1).value = result.vehicle.rowIndex || '-';
    vehicleHeaderRow.getCell(2).value = result.vehicle.brand;
    vehicleHeaderRow.getCell(3).value = result.vehicle.model;
    vehicleHeaderRow.getCell(4).value = result.vehicle.buildYear;
    
    // Vraagprijs kolom
    if (result.vehicle.askingPrice) {
      vehicleHeaderRow.getCell(5).value = result.vehicle.askingPrice;
      vehicleHeaderRow.getCell(5).numFmt = '€#,##0';
    } else {
      vehicleHeaderRow.getCell(5).value = '-';
    }
    
    vehicleHeaderRow.getCell(6).value = result.vehicle.fuelType;
    vehicleHeaderRow.getCell(7).value = result.vehicle.transmission;
    vehicleHeaderRow.getCell(8).value = result.vehicle.mileage ? result.vehicle.mileage.toLocaleString('nl-NL') : '-';
    vehicleHeaderRow.getCell(9).value = result.vehicle.licensePlate || '-';
    vehicleHeaderRow.getCell(10).value = `📊 ${result.dealers.length} verkochte voertuigen`;

    vehicleHeaderRow.font = { bold: true, size: 11 };
    vehicleHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F4FC' },
    };
    vehicleHeaderRow.height = 24;

    currentRow++;

    // Sort dealers by soldSince (most recent first)
    const sortedDealers = [...result.dealers].sort((a, b) => {
      if (a.soldSince === null && b.soldSince === null) return 0;
      if (a.soldSince === null) return 1;
      if (b.soldSince === null) return -1;
      return a.soldSince - b.soldSince;
    });

    // Add dealer rows
    for (const dealer of sortedDealers) {
      totalDealers++;

      const row = worksheet.addRow({
        rowIndex: '',
        brand: '',
        model: '',
        buildYear: '',
        askingPrice: '',
        fuelType: '',
        transmission: '',
        searchMileage: '',
        licensePlate: '',
        dealer: dealer.dealerName,
        price: dealer.price,
        mileage: dealer.mileage,
        daysInStock: dealer.daysInStock,
        soldSince: `${dealer.soldSince} dagen`,
        website: dealer.url ? 'Bekijk →' : '-',
      });

      // Add hyperlink
      if (dealer.url) {
        const linkCell = row.getCell('website');
        linkCell.value = {
          text: 'Bekijk →',
          hyperlink: dealer.url,
        };
        linkCell.font = { color: { argb: 'FF0066CC' }, underline: true };
      }

      // Format currency
      const priceCell = row.getCell('price');
      if (priceCell.value && typeof priceCell.value === 'number') {
        priceCell.numFmt = '€#,##0';
      }

      // Format mileage
      const mileageCell = row.getCell('mileage');
      if (mileageCell.value && typeof mileageCell.value === 'number') {
        mileageCell.numFmt = '#,##0';
      }

      // Color code based on soldSince (recent sales are green)
      if (dealer.soldSince !== null && dealer.soldSince <= 7) {
        row.getCell('soldSince').font = { color: { argb: 'FF2E7D32' }, bold: true };
      } else if (dealer.soldSince !== null && dealer.soldSince <= 30) {
        row.getCell('soldSince').font = { color: { argb: 'FF1976D2' } };
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });

      currentRow++;
    }

    // Add subtotal row for vehicle
    const subtotalRow = worksheet.getRow(currentRow);
    subtotalRow.getCell(9).value = `Gemiddeld:`;
    subtotalRow.getCell(11).value = result.stats.avgPrice;
    subtotalRow.getCell(13).value = result.stats.avgDaysInStock;
    subtotalRow.getCell(14).value = result.stats.fastestSale !== null 
      ? `Snelste: ${result.stats.fastestSale} dgn` 
      : '-';

    subtotalRow.font = { italic: true, color: { argb: 'FF666666' } };
    subtotalRow.getCell(11).numFmt = '€#,##0';
    subtotalRow.getCell(13).numFmt = '#,##0';

    currentRow += 2; // Add empty row between vehicles
  }

  // Add summary section
  currentRow += 1;
  const summaryStartRow = currentRow;

  worksheet.getCell(`A${summaryStartRow}`).value = 'SAMENVATTING';
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 14 };

  worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Totaal voertuigen:';
  worksheet.getCell(`B${summaryStartRow + 1}`).value = totalVehicles;
  worksheet.getCell(`B${summaryStartRow + 1}`).font = { bold: true };

  worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Totaal dealers:';
  worksheet.getCell(`B${summaryStartRow + 2}`).value = totalDealers;
  worksheet.getCell(`B${summaryStartRow + 2}`).font = { bold: true };

  // Calculate overall average price
  const allPrices = results
    .filter(r => r.status === 'completed')
    .flatMap(r => r.dealers.map(d => d.price));
  
  if (allPrices.length > 0) {
    const overallAvgPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
    worksheet.getCell(`A${summaryStartRow + 3}`).value = 'Gem. verkoopprijs:';
    worksheet.getCell(`B${summaryStartRow + 3}`).value = overallAvgPrice;
    worksheet.getCell(`B${summaryStartRow + 3}`).numFmt = '€#,##0';
    worksheet.getCell(`B${summaryStartRow + 3}`).font = { bold: true };
  }

  // Calculate fastest sale
  const allSoldSince = results
    .filter(r => r.status === 'completed')
    .flatMap(r => r.dealers.filter(d => d.soldSince !== null).map(d => d.soldSince!));
  
  if (allSoldSince.length > 0) {
    const fastestOverall = Math.min(...allSoldSince);
    worksheet.getCell(`A${summaryStartRow + 4}`).value = 'Snelste verkoop:';
    worksheet.getCell(`B${summaryStartRow + 4}`).value = `${fastestOverall} dagen geleden`;
    worksheet.getCell(`B${summaryStartRow + 4}`).font = { bold: true, color: { argb: 'FF2E7D32' } };
  }

  // Add watermark footer for non-owners
  if (watermark.shouldWatermark) {
    const watermarkRow = summaryStartRow + 6;
    worksheet.getCell(`A${watermarkRow}`).value = `Geëxporteerd door: ${watermark.exportedBy} | ${watermark.exportedAt} | ID: ${watermark.exportId}`;
    worksheet.getCell(`A${watermarkRow}`).font = { size: 9, italic: true, color: { argb: 'FF888888' } };
  }

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dealer-analyse-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
