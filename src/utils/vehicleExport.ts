import ExcelJS from 'exceljs';
import { Vehicle } from "@/types/inventory";

export const exportVehiclesToExcel = async (vehicles: Vehicle[]) => {
  // Maak workbook en worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Verkooplijst');

  // Headers
  const headers = [
    'Merk',
    'Model',
    'Bouwjaar',
    'Kleur',
    'VIN',
    'KM stand',
    'Schadeomschrijving',
    'Inkoopprijs',
    'Verkoopprijs'
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
      v.year?.toString() || '',
      v.color || '',
      v.vin || '',
      v.mileage ? v.mileage.toLocaleString('nl-NL') : '',
      v.damage?.description || '',
      v.purchasePrice ? `€ ${v.purchasePrice.toLocaleString('nl-NL')}` : '',
      v.sellingPrice ? `€ ${v.sellingPrice.toLocaleString('nl-NL')}` : ''
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
    { width: 12 },  // Merk
    { width: 15 },  // Model
    { width: 10 },  // Bouwjaar
    { width: 12 },  // Kleur
    { width: 20 },  // VIN
    { width: 12 },  // KM stand
    { width: 30 },  // Schadeomschrijving
    { width: 14 },  // Inkoopprijs
    { width: 14 },  // Verkoopprijs
  ];

  // Genereer bestandsnaam met datum
  const today = new Date().toISOString().split('T')[0];
  const filename = `Auto_City_Verkooplijst_${today}.xlsx`;

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
