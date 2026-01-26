import ExcelJS from 'exceljs';
import { Task, TaskCategory } from '@/types/tasks';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const categoryLabels: Record<TaskCategory, string> = {
  klaarmaken: 'Klaarmaken',
  onderdelen: 'Onderdelen',
  onderdelen_bestellen: 'Onderdelen Bestellen',
  werkplaats: 'Werkplaats',
  schadeherstel: 'Schadeherstel',
  transport: 'Transport',
  schoonmaak: 'Schoonmaak',
  reparatie: 'Reparatie',
  aflevering: 'Aflevering',
  overig: 'Overig'
};

export const exportTasksToExcel = async (
  tasks: Task[],
  categoryFilter: TaskCategory | 'all'
): Promise<void> => {
  // Filter tasks: only non-completed and by category
  let filteredTasks = tasks.filter(t => 
    t.status !== 'voltooid' && t.status !== 'geannuleerd'
  );

  if (categoryFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.category === categoryFilter);
  }

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const categoryName = categoryFilter === 'all' ? 'Alle Taken' : categoryLabels[categoryFilter];
  const worksheet = workbook.addWorksheet('Werklijst');

  // Set print properties for A4 landscape
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    }
  };

  // Title row
  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: nl });
  const titleRow = worksheet.addRow([`WERKLIJST ${categoryName.toUpperCase()} - ${dateStr}`]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.height = 25;
  worksheet.mergeCells('A1:F1');
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Empty row
  worksheet.addRow([]);

  // Header row
  const headerRow = worksheet.addRow(['Merk', 'Model', 'Kenteken', 'VIN', 'Taak', '✓']);
  headerRow.font = { bold: true, size: 11 };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Set column widths (optimized for A4 landscape)
  worksheet.columns = [
    { key: 'brand', width: 12 },
    { key: 'model', width: 14 },
    { key: 'license', width: 12 },
    { key: 'vin', width: 12 },
    { key: 'task', width: 45 },
    { key: 'checkbox', width: 6 }
  ];

  // Data rows
  filteredTasks.forEach((task) => {
    // Get last 8 chars of VIN or show dash
    const vinShort = task.vehicleVin 
      ? `...${task.vehicleVin.slice(-8)}` 
      : '-';

    const row = worksheet.addRow([
      task.vehicleBrand || '-',
      task.vehicleModel || '-',
      task.vehicleLicenseNumber || '-',
      vinShort,
      task.title || task.description,
      '○'
    ]);

    row.height = 22;
    row.font = { size: 11 };
    
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Checkbox column centered
      if (colNumber === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 14 };
      } else {
        cell.alignment = { vertical: 'middle', wrapText: colNumber === 5 };
      }
    });
  });

  // Add footer with count
  worksheet.addRow([]);
  const footerRow = worksheet.addRow([`Totaal: ${filteredTasks.length} taken`]);
  footerRow.font = { italic: true, size: 10 };

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateFileName = format(new Date(), 'dd-MM-yyyy');
  const categoryFileName = categoryFilter === 'all' ? 'Alle' : categoryLabels[categoryFilter];
  link.href = url;
  link.download = `Werklijst_${categoryFileName}_${dateFileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
