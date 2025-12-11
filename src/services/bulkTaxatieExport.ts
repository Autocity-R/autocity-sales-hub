import ExcelJS from 'exceljs';
import type { BulkTaxatieResult } from '@/types/bulkTaxatie';

export const exportBulkTaxatieToExcel = async (results: BulkTaxatieResult[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Auto City Taxatie';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Bulk Taxatie Resultaten', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define simplified 11 columns
  worksheet.columns = [
    { header: 'Merk', key: 'brand', width: 14 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Brandstof', key: 'fuelType', width: 12 },
    { header: 'KM', key: 'mileage', width: 12 },
    { header: 'Bouwjaar', key: 'buildYear', width: 10 },
    { header: 'APR', key: 'apr', width: 8 },
    { header: 'ETR', key: 'etr', width: 8 },
    { header: 'JP Prijs', key: 'jpPrice', width: 14 },
    { header: 'AI Verkoopprijs', key: 'aiSellingPrice', width: 16 },
    { header: 'AI Inkoopprijs', key: 'aiPurchasePrice', width: 16 },
    { header: 'Gaspedaal', key: 'gaspedaalLink', width: 14 },
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
  headerRow.height = 24;

  // Add data rows
  results.forEach((result) => {
    const recommendation = result.aiAdvice?.recommendation || '';
    const gaspedaalUrl = result.jpCarsData?.portalUrls?.gaspedaal || '';
    
    const row = worksheet.addRow({
      brand: result.input.brand,
      model: result.input.model,
      fuelType: result.input.fuelType || '-',
      mileage: result.input.mileage,
      buildYear: result.input.buildYear,
      apr: result.jpCarsData?.apr || null,
      etr: result.jpCarsData?.etr || null,
      jpPrice: result.jpCarsData?.totalValue || null,
      aiSellingPrice: result.aiAdvice?.recommendedSellingPrice || null,
      aiPurchasePrice: result.aiAdvice?.recommendedPurchasePrice || null,
      gaspedaalLink: gaspedaalUrl ? 'Bekijk' : '-',
    });

    // Add hyperlink to Gaspedaal cell
    if (gaspedaalUrl) {
      const linkCell = row.getCell('gaspedaalLink');
      linkCell.value = {
        text: 'Bekijk →',
        hyperlink: gaspedaalUrl,
      };
      linkCell.font = { color: { argb: 'FF0066CC' }, underline: true };
    }

    // Color code row based on recommendation
    let bgColor = 'FFFFFFFF';
    if (recommendation === 'kopen') {
      bgColor = 'FFE8F5E9'; // Light green
    } else if (recommendation === 'niet_kopen') {
      bgColor = 'FFFFEBEE'; // Light red
    } else if (recommendation === 'twijfel') {
      bgColor = 'FFFFF8E1'; // Light amber
    }

    row.eachCell((cell, colNumber) => {
      // Don't override hyperlink styling for link cell
      if (colNumber !== 11) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });

    // Format currency cells
    ['jpPrice', 'aiSellingPrice', 'aiPurchasePrice'].forEach(key => {
      const cell = row.getCell(key);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '€#,##0';
      }
    });

    // Format KM
    const kmCell = row.getCell('mileage');
    if (kmCell.value) {
      kmCell.numFmt = '#,##0';
    }

    // APR/ETR color coding
    const aprCell = row.getCell('apr');
    const etrCell = row.getCell('etr');
    
    const aprValue = result.jpCarsData?.apr || 0;
    const etrValue = result.jpCarsData?.etr || 0;

    if (aprValue >= 4) {
      aprCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
    } else if (aprValue < 3) {
      aprCell.font = { color: { argb: 'FFC62828' }, bold: true };
    }

    if (etrValue >= 4) {
      etrCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
    } else if (etrValue < 3) {
      etrCell.font = { color: { argb: 'FFC62828' }, bold: true };
    }
  });

  // Add summary row
  const summaryRowNum = results.length + 3;
  const kopenCount = results.filter(r => r.aiAdvice?.recommendation === 'kopen').length;
  const nietKopenCount = results.filter(r => r.aiAdvice?.recommendation === 'niet_kopen').length;
  const twijfelCount = results.filter(r => r.aiAdvice?.recommendation === 'twijfel').length;

  worksheet.getCell(`A${summaryRowNum}`).value = 'SAMENVATTING';
  worksheet.getCell(`A${summaryRowNum}`).font = { bold: true, size: 12 };

  worksheet.getCell(`A${summaryRowNum + 1}`).value = 'Totaal:';
  worksheet.getCell(`B${summaryRowNum + 1}`).value = results.length;

  worksheet.getCell(`A${summaryRowNum + 2}`).value = '✓ Kopen:';
  worksheet.getCell(`B${summaryRowNum + 2}`).value = kopenCount;
  worksheet.getCell(`B${summaryRowNum + 2}`).font = { color: { argb: 'FF2E7D32' }, bold: true };

  worksheet.getCell(`A${summaryRowNum + 3}`).value = '? Twijfel:';
  worksheet.getCell(`B${summaryRowNum + 3}`).value = twijfelCount;
  worksheet.getCell(`B${summaryRowNum + 3}`).font = { color: { argb: 'FFF57C00' }, bold: true };

  worksheet.getCell(`A${summaryRowNum + 4}`).value = '✗ Niet kopen:';
  worksheet.getCell(`B${summaryRowNum + 4}`).value = nietKopenCount;
  worksheet.getCell(`B${summaryRowNum + 4}`).font = { color: { argb: 'FFC62828' }, bold: true };

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bulk-taxatie-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
