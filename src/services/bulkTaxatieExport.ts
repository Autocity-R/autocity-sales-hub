import ExcelJS from 'exceljs';
import type { BulkTaxatieResult } from '@/types/bulkTaxatie';

export const exportBulkTaxatieToExcel = async (results: BulkTaxatieResult[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Auto City Taxatie';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Bulk Taxatie Resultaten', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  // Define columns
  worksheet.columns = [
    { header: '#', key: 'rowIndex', width: 6 },
    { header: 'Merk', key: 'brand', width: 15 },
    { header: 'Model', key: 'model', width: 20 },
    { header: 'Bouwjaar', key: 'buildYear', width: 12 },
    { header: 'KM', key: 'mileage', width: 12 },
    { header: 'Brandstof', key: 'fuelType', width: 12 },
    { header: 'Vraagprijs', key: 'askingPrice', width: 14 },
    { header: 'APR', key: 'apr', width: 8 },
    { header: 'ETR', key: 'etr', width: 8 },
    { header: 'Courantheid', key: 'courantheid', width: 14 },
    { header: 'JP Cars Waarde', key: 'jpCarsValue', width: 16 },
    { header: 'Advies', key: 'recommendation', width: 14 },
    { header: 'Max Inkoopprijs', key: 'maxPurchasePrice', width: 16 },
    { header: 'Verw. Verkoopprijs', key: 'expectedSellingPrice', width: 18 },
    { header: 'Verw. Marge %', key: 'targetMargin', width: 14 },
    { header: 'Verw. Statijd', key: 'expectedDays', width: 14 },
    { header: 'Risico\'s', key: 'risks', width: 40 },
    { header: 'Kansen', key: 'opportunities', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
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
  results.forEach((result, index) => {
    const recommendation = result.aiAdvice?.recommendation || '';
    const row = worksheet.addRow({
      rowIndex: result.input.rowIndex,
      brand: result.input.brand,
      model: result.input.model,
      buildYear: result.input.buildYear,
      mileage: result.input.mileage,
      fuelType: result.input.fuelType || '-',
      askingPrice: result.input.askingPrice || null,
      apr: result.jpCarsData?.apr || null,
      etr: result.jpCarsData?.etr || null,
      courantheid: result.jpCarsData?.courantheid || '-',
      jpCarsValue: result.jpCarsData?.totalValue || null,
      recommendation: recommendation === 'kopen' ? '✓ KOPEN' : 
                     recommendation === 'niet_kopen' ? '✗ NIET KOPEN' : 
                     recommendation === 'twijfel' ? '? TWIJFEL' : '-',
      maxPurchasePrice: result.aiAdvice?.recommendedPurchasePrice || null,
      expectedSellingPrice: result.aiAdvice?.recommendedSellingPrice || null,
      targetMargin: result.aiAdvice?.targetMargin || null,
      expectedDays: result.aiAdvice?.expectedDaysToSell || null,
      risks: result.aiAdvice?.riskFactors?.join('; ') || '-',
      opportunities: result.aiAdvice?.opportunities?.join('; ') || '-',
      status: result.status === 'completed' ? 'Voltooid' : 
              result.status === 'error' ? 'Fout' : 'In behandeling',
    });

    // Color code based on recommendation
    let bgColor = 'FFFFFFFF';
    if (recommendation === 'kopen') {
      bgColor = 'FFE8F5E9'; // Light green
    } else if (recommendation === 'niet_kopen') {
      bgColor = 'FFFFEBEE'; // Light red
    } else if (recommendation === 'twijfel') {
      bgColor = 'FFFFF8E1'; // Light amber
    }

    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });

    // Format currency cells
    ['askingPrice', 'jpCarsValue', 'maxPurchasePrice', 'expectedSellingPrice'].forEach(key => {
      const cell = row.getCell(key);
      if (cell.value) {
        cell.numFmt = '€#,##0';
      }
    });

    // Format percentage
    const marginCell = row.getCell('targetMargin');
    if (marginCell.value) {
      marginCell.numFmt = '0"%"';
    }

    // Format KM
    const kmCell = row.getCell('mileage');
    kmCell.numFmt = '#,##0" km"';

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

    // Recommendation cell styling
    const recCell = row.getCell('recommendation');
    if (recommendation === 'kopen') {
      recCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
    } else if (recommendation === 'niet_kopen') {
      recCell.font = { color: { argb: 'FFC62828' }, bold: true };
    } else if (recommendation === 'twijfel') {
      recCell.font = { color: { argb: 'FFF57C00' }, bold: true };
    }
  });

  // Add summary row
  const summaryRowNum = results.length + 3;
  const kopenCount = results.filter(r => r.aiAdvice?.recommendation === 'kopen').length;
  const nietKopenCount = results.filter(r => r.aiAdvice?.recommendation === 'niet_kopen').length;
  const twijfelCount = results.filter(r => r.aiAdvice?.recommendation === 'twijfel').length;

  worksheet.getCell(`A${summaryRowNum}`).value = 'SAMENVATTING';
  worksheet.getCell(`A${summaryRowNum}`).font = { bold: true, size: 12 };

  worksheet.getCell(`A${summaryRowNum + 1}`).value = 'Totaal getaxeerd:';
  worksheet.getCell(`B${summaryRowNum + 1}`).value = results.length;

  worksheet.getCell(`A${summaryRowNum + 2}`).value = '✓ Kopen:';
  worksheet.getCell(`B${summaryRowNum + 2}`).value = kopenCount;
  worksheet.getCell(`B${summaryRowNum + 2}`).font = { color: { argb: 'FF2E7D32' }, bold: true };

  worksheet.getCell(`A${summaryRowNum + 3}`).value = '? Twijfel:';
  worksheet.getCell(`B${summaryRowNum + 3}`).value = twijfelCount;
  worksheet.getCell(`B${summaryRowNum + 3}`).font = { color: { argb: 'FFF57C00' }, bold: true };

  worksheet.getCell(`A${summaryRowNum + 4}`).value = '✗ Niet Kopen:';
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
