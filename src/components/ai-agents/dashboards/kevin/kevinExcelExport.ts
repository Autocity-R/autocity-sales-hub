import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import type { JoinedVehicle } from './types';

const HEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
const BODY_FONT: Partial<ExcelJS.Font> = { size: 10, name: 'Arial' };

const RED_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
const YELLOW_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
const GREEN_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };

const STATUS_LABELS: Record<string, string> = { red: 'Actie vereist', yellow: 'Let op', green: 'Goed' };

function addVehicleSheet(wb: ExcelJS.Workbook, sheetName: string, vehicles: JoinedVehicle[]) {
  const ws = wb.addWorksheet(sheetName);

  const headers = [
    'Status', 'Merk', 'Model', 'Bouwjaar', 'Brandstof', 'KM Stand',
    'Prijs Online', 'Adviesprijs (VVP50)', 'Verschil', 'Prijsadvies',
    'Stagedagen', 'Markt Gem. Dagen', 'Rang', 'Concurrenten',
    'APR', 'Verkocht vgl.', 'Kenteken', 'JP Cars Link'
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };
  });
  headerRow.height = 30;

  for (const v of vehicles) {
    const advies = v.price_warning != null
      ? (v.price_warning > 50 ? `Zak €${v.price_warning.toLocaleString('nl-NL')}` : v.price_warning < -50 ? `Verhoog €${Math.abs(v.price_warning).toLocaleString('nl-NL')}` : '-')
      : '-';

    const row = ws.addRow([
      STATUS_LABELS[v.category] ?? v.category,
      v.brand,
      v.model,
      v.build_year ?? '-',
      v.fuel ?? '-',
      v.mileage ?? '-',
      v.price_local ?? '-',
      v.vvp_50 ?? '-',
      v.price_vs_market ?? '-',
      advies,
      v.stock_days ?? '-',
      v.stock_days_average ?? '-',
      v.rank_current ?? '-',
      v.window_size ?? '-',
      v.apr ?? '-',
      v.stat_sold_count ?? '-',
      v.license_number ?? '-',
      v.jpcars_url ?? '-',
    ]);

    row.eachCell(cell => { cell.font = BODY_FONT; });

    // Row color by category
    const fill = v.category === 'red' ? RED_FILL : v.category === 'yellow' ? YELLOW_FILL : GREEN_FILL;
    row.eachCell(cell => { cell.fill = fill; });

    // Format price columns as currency
    [7, 8, 9].forEach(col => {
      const cell = row.getCell(col);
      if (typeof cell.value === 'number') {
        cell.numFmt = '€#,##0';
      }
    });

    // Format mileage
    const kmCell = row.getCell(6);
    if (typeof kmCell.value === 'number') {
      kmCell.numFmt = '#,##0';
    }

    // Make JP Cars link clickable
    const linkCell = row.getCell(18);
    if (v.jpcars_url && v.jpcars_url !== '-') {
      linkCell.value = { text: 'Bekijk op Gaspedaal', hyperlink: v.jpcars_url };
      linkCell.font = { ...BODY_FONT, color: { argb: 'FF2563EB' }, underline: true };
    }
  }

  // Column widths
  const widths = [14, 14, 16, 10, 14, 12, 14, 16, 12, 18, 12, 14, 8, 12, 8, 12, 14, 24];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: `R${vehicles.length + 1}` };
}

export function exportVehiclesExcel(vehicles: JoinedVehicle[], fileName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kevin Voorraadbewaking';
  wb.created = new Date();

  addVehicleSheet(wb, 'Voorraad', vehicles);

  wb.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportTieredExcel(
  redVehicles: JoinedVehicle[],
  yellowVehicles: JoinedVehicle[],
  greenVehicles: JoinedVehicle[],
  tierLabel: 'red' | 'yellow' | 'green' | 'all'
) {
  const dateStr = format(new Date(), 'yyyy-MM-dd');

  if (tierLabel === 'all') {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Kevin Voorraadbewaking';
    wb.created = new Date();
    if (redVehicles.length) addVehicleSheet(wb, 'Actie Vereist', redVehicles);
    if (yellowVehicles.length) addVehicleSheet(wb, 'Let Op', yellowVehicles);
    if (greenVehicles.length) addVehicleSheet(wb, 'Goed', greenVehicles);

    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kevin-voorraad-compleet-${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
    return;
  }

  const map = { red: redVehicles, yellow: yellowVehicles, green: greenVehicles };
  const labels = { red: 'actie-vereist', yellow: 'let-op', green: 'goed' };
  const sheetNames = { red: 'Actie Vereist', yellow: 'Let Op', green: 'Goed' };
  const vehicles = map[tierLabel];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kevin Voorraadbewaking';
  wb.created = new Date();
  addVehicleSheet(wb, sheetNames[tierLabel], vehicles);

  wb.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kevin-${labels[tierLabel]}-${dateStr}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
