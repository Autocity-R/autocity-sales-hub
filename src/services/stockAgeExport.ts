import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';

interface StockAgeVehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  mileage: number | null;
  purchase_price: number | null;
  details: Record<string, unknown> | null;
  online_since_date: string | null;
  daysOnline: number;
}

export const exportStockAgeToExcel = async (): Promise<{ success: boolean; filename: string; count: number }> => {
  // Fetch all online vehicles (same filter as StockAgeAnalysis)
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, mileage, purchase_price, details, online_since_date, created_at')
    .eq('status', 'voorraad')
    .contains('details', { showroomOnline: true });

  if (error) {
    throw new Error(`Fout bij ophalen voorraad: ${error.message}`);
  }

  if (!vehicles || vehicles.length === 0) {
    throw new Error('Geen online voorraad gevonden');
  }

  const today = new Date();
  
  // Calculate days online and sort
  const vehiclesWithDays: StockAgeVehicle[] = vehicles
    .map(v => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      mileage: v.mileage,
      purchase_price: v.purchase_price,
      details: v.details as Record<string, unknown> | null,
      online_since_date: v.online_since_date,
      daysOnline: v.online_since_date 
        ? differenceInDays(today, new Date(v.online_since_date))
        : v.created_at
          ? differenceInDays(today, new Date(v.created_at))
          : 0
    }))
    .sort((a, b) => b.daysOnline - a.daysOnline);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stadagen Analyse');

  // Define columns
  worksheet.columns = [
    { header: 'Merk', key: 'brand', width: 15 },
    { header: 'Model', key: 'model', width: 20 },
    { header: 'Bouwjaar', key: 'year', width: 12 },
    { header: 'KM Stand', key: 'mileage', width: 14 },
    { header: 'Inkoopprijs', key: 'purchasePrice', width: 14 },
    { header: 'Stadagen', key: 'daysOnline', width: 12 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' } // Dark blue
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;

  // Add data rows
  vehiclesWithDays.forEach((vehicle, index) => {
    const purchasePrice = vehicle.purchase_price || 
      (vehicle.details?.purchasePrice as number) || 0;

    const row = worksheet.addRow({
      brand: vehicle.brand || '-',
      model: vehicle.model || '-',
      year: vehicle.year || '-',
      mileage: vehicle.mileage || 0,
      purchasePrice: purchasePrice,
      daysOnline: vehicle.daysOnline
    });

    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };
    }

    // Color-code stadagen cell
    const daysCell = row.getCell('daysOnline');
    if (vehicle.daysOnline > 90) {
      daysCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' } // Dark red
      };
      daysCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else if (vehicle.daysOnline > 60) {
      daysCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' } // Red/orange
      };
      daysCell.font = { color: { argb: 'FFFFFFFF' } };
    } else if (vehicle.daysOnline > 30) {
      daysCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF59E0B' } // Orange
      };
    } else {
      daysCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF22C55E' } // Green
      };
      daysCell.font = { color: { argb: 'FFFFFFFF' } };
    }

    // Format mileage with thousands separator
    const mileageCell = row.getCell('mileage');
    mileageCell.numFmt = '#,##0';

    // Format purchase price as currency
    const priceCell = row.getCell('purchasePrice');
    priceCell.numFmt = '€ #,##0';
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        left: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E5E5' } },
        right: { style: 'thin', color: { argb: 'FFE5E5E5' } }
      };
    });
  });

  // Add summary section
  const summaryStartRow = vehiclesWithDays.length + 3;
  
  const avgDays = vehiclesWithDays.reduce((sum, v) => sum + v.daysOnline, 0) / vehiclesWithDays.length;
  const count0to30 = vehiclesWithDays.filter(v => v.daysOnline <= 30).length;
  const count31to60 = vehiclesWithDays.filter(v => v.daysOnline > 30 && v.daysOnline <= 60).length;
  const count61to90 = vehiclesWithDays.filter(v => v.daysOnline > 60 && v.daysOnline <= 90).length;
  const count90plus = vehiclesWithDays.filter(v => v.daysOnline > 90).length;

  worksheet.getCell(`A${summaryStartRow}`).value = 'SAMENVATTING';
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };
  
  worksheet.getCell(`A${summaryStartRow + 1}`).value = 'Totaal voertuigen:';
  worksheet.getCell(`B${summaryStartRow + 1}`).value = vehiclesWithDays.length;
  
  worksheet.getCell(`A${summaryStartRow + 2}`).value = 'Gemiddelde stadagen:';
  worksheet.getCell(`B${summaryStartRow + 2}`).value = Math.round(avgDays);
  
  worksheet.getCell(`A${summaryStartRow + 4}`).value = '0-30 dagen:';
  worksheet.getCell(`B${summaryStartRow + 4}`).value = count0to30;
  worksheet.getCell(`B${summaryStartRow + 4}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
  worksheet.getCell(`B${summaryStartRow + 4}`).font = { color: { argb: 'FFFFFFFF' } };
  
  worksheet.getCell(`A${summaryStartRow + 5}`).value = '31-60 dagen:';
  worksheet.getCell(`B${summaryStartRow + 5}`).value = count31to60;
  worksheet.getCell(`B${summaryStartRow + 5}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
  
  worksheet.getCell(`A${summaryStartRow + 6}`).value = '61-90 dagen:';
  worksheet.getCell(`B${summaryStartRow + 6}`).value = count61to90;
  worksheet.getCell(`B${summaryStartRow + 6}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  worksheet.getCell(`B${summaryStartRow + 6}`).font = { color: { argb: 'FFFFFFFF' } };
  
  worksheet.getCell(`A${summaryStartRow + 7}`).value = '90+ dagen:';
  worksheet.getCell(`B${summaryStartRow + 7}`).value = count90plus;
  worksheet.getCell(`B${summaryStartRow + 7}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  worksheet.getCell(`B${summaryStartRow + 7}`).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const filename = `Stadagen_Analyse_${dateStr}.xlsx`;

  // Create and download file
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

  return { success: true, filename, count: vehiclesWithDays.length };
};
