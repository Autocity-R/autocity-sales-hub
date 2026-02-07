import ExcelJS from 'exceljs';
import { Vehicle } from '@/types/inventory';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export const exportChecklistToExcel = async (vehicle: Vehicle): Promise<void> => {
  const checklist = vehicle.details?.preDeliveryChecklist || [];
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Checklist');

  // Page setup A4 portrait
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
  };

  // Set column widths
  worksheet.columns = [
    { width: 5 },   // #
    { width: 45 },  // Taak
    { width: 12 },  // Status
    { width: 5 },   // ✓
  ];

  // Title row
  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: nl });
  const titleRow = worksheet.addRow([`CHECKLIST VOERTUIG - ${dateStr}`]);
  worksheet.mergeCells('A1:D1');
  titleRow.getCell(1).font = { bold: true, size: 14 };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  titleRow.height = 25;

  // Empty row
  worksheet.addRow([]);

  // Vehicle info section
  const infoStyle = { font: { size: 11 } };
  const labelStyle = { font: { bold: true, size: 11 } };

  const merkRow = worksheet.addRow(['Merk:', vehicle.brand]);
  merkRow.getCell(1).font = labelStyle.font;
  merkRow.getCell(2).font = infoStyle.font;

  const modelRow = worksheet.addRow(['Model:', vehicle.model]);
  modelRow.getCell(1).font = labelStyle.font;
  modelRow.getCell(2).font = infoStyle.font;

  const kentekenRow = worksheet.addRow(['Kenteken:', vehicle.licenseNumber || '-']);
  kentekenRow.getCell(1).font = labelStyle.font;
  kentekenRow.getCell(2).font = infoStyle.font;

  const vinRow = worksheet.addRow(['VIN:', vehicle.vin || '-']);
  vinRow.getCell(1).font = labelStyle.font;
  vinRow.getCell(2).font = infoStyle.font;

  // Empty rows before checklist
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Checklist header
  const checklistTitleRow = worksheet.addRow(['CHECKLIST']);
  worksheet.mergeCells(`A${checklistTitleRow.number}:D${checklistTitleRow.number}`);
  checklistTitleRow.getCell(1).font = { bold: true, size: 12 };
  checklistTitleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Table header
  const headerRow = worksheet.addRow(['#', 'Taak', 'Status', '✓']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } }
    };
    cell.alignment = { horizontal: 'left' };
  });
  headerRow.getCell(1).alignment = { horizontal: 'center' };
  headerRow.getCell(4).alignment = { horizontal: 'center' };

  // Checklist items
  checklist.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      item.description,
      item.completed ? 'Voltooid' : 'Open',
      item.completed ? '✓' : '○'
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    
    // Color coding for status
    if (item.completed) {
      row.getCell(3).font = { color: { argb: 'FF16A34A' } }; // green
      row.getCell(4).font = { color: { argb: 'FF16A34A' } };
    } else {
      row.getCell(3).font = { color: { argb: 'FFEA580C' } }; // orange
    }

    // Add light border
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }
      };
    });
  });

  // Footer with summary
  worksheet.addRow([]);
  const completedCount = checklist.filter(i => i.completed).length;
  const summaryRow = worksheet.addRow([`${completedCount} van ${checklist.length} taken voltooid`]);
  worksheet.mergeCells(`A${summaryRow.number}:D${summaryRow.number}`);
  summaryRow.getCell(1).font = { italic: true, size: 10 };

  // Generate filename
  const licensePlate = vehicle.licenseNumber?.replace(/[^a-zA-Z0-9]/g, '-') || 'onbekend';
  const dateForFile = format(new Date(), 'dd-MM-yyyy');
  const filename = `Checklist_${vehicle.brand}_${vehicle.model}_${licensePlate}_${dateForFile}.xlsx`;

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
