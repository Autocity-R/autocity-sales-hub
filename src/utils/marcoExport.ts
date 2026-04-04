import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

type PipelineStep = 'nieuw' | 'betaald' | 'pickup' | 'aangekomen' | 'import' | 'ingeschreven' | 'b2b_papieren';

interface MarcoVehicle {
  id: string;
  brand: string | null;
  model: string | null;
  license_number: string | null;
  vin: string | null;
  status: string | null;
  import_status: string | null;
  created_at: string | null;
  details: any;
  supplier_id: string | null;
  customer_id: string | null;
}

interface ContactInfo {
  company_name?: string | null;
  first_name?: string;
  last_name?: string;
}

function isTruthy(val: any): boolean {
  return val === true || val === 'true';
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function contactName(c: ContactInfo | null | undefined): string {
  if (!c) return '—';
  return c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—';
}

function getCustomerName(v: MarcoVehicle, customerMap: Record<string, ContactInfo>): string {
  if (v.customer_id && customerMap[v.customer_id]) return contactName(customerMap[v.customer_id]);
  const d = v.details || {};
  return d.customerName || '—';
}

function getSoldStatus(v: MarcoVehicle): string {
  if (v.status === 'verkocht_b2b') return 'Verkocht B2B';
  if (v.status === 'verkocht_b2c') return 'Verkocht B2C';
  if (v.status === 'verkocht') return 'Verkocht';
  return '—';
}

const STEP_LABELS: Record<PipelineStep, string> = {
  nieuw: 'Nog te betalen',
  betaald: 'Betaald — pickup versturen',
  pickup: 'Pickup gereed / onderweg',
  aangekomen: 'Aangekomen — CMR versturen',
  import: 'Import in behandeling',
  ingeschreven: 'Ingeschreven',
  b2b_papieren: 'B2B papieren verwacht',
};

interface ColumnDef {
  header: string;
  width: number;
  value: (v: MarcoVehicle, supplierMap: Record<string, ContactInfo>, customerMap: Record<string, ContactInfo>) => string | number;
  color?: (v: MarcoVehicle) => string | null;
}

function getColumnsForStep(step: PipelineStep): ColumnDef[] {
  const merk: ColumnDef = { header: 'Merk', width: 12, value: v => v.brand || '—' };
  const model: ColumnDef = { header: 'Model', width: 14, value: v => v.model || '—' };
  const kenteken: ColumnDef = { header: 'Kenteken', width: 14, value: v => v.license_number || '—' };
  const vin: ColumnDef = { header: 'VIN', width: 20, value: v => v.vin || '—' };
  const dagen: ColumnDef = { header: 'Dagen', width: 8, value: v => daysSince(v.created_at) };

  const betaald: ColumnDef = {
    header: 'Betaald', width: 12,
    value: v => (v.details?.purchase_payment_status === 'volledig_betaald') ? 'Ja' : 'Nee',
    color: v => (v.details?.purchase_payment_status === 'volledig_betaald') ? 'FF27AE60' : 'FFE74C3C',
  };
  const pickup: ColumnDef = {
    header: 'Pickup', width: 12,
    value: v => isTruthy(v.details?.pickupDocumentSent) ? 'Verstuurd' : 'Niet verstuurd',
    color: v => isTruthy(v.details?.pickupDocumentSent) ? 'FF27AE60' : 'FFE74C3C',
  };
  const leverancier: ColumnDef = {
    header: 'Leverancier', width: 20,
    value: (v, sm) => contactName(v.supplier_id ? sm[v.supplier_id] : null),
  };
  const cmr: ColumnDef = {
    header: 'CMR', width: 12,
    value: v => isTruthy(v.details?.cmrSent) ? 'Verstuurd' : 'Niet verstuurd',
    color: v => isTruthy(v.details?.cmrSent) ? 'FF27AE60' : 'FFE74C3C',
  };
  const verkocht: ColumnDef = { header: 'Verkocht', width: 14, value: v => getSoldStatus(v) };
  const klant: ColumnDef = { header: 'Klant', width: 20, value: (v, _s, cm) => getCustomerName(v, cm) };
  const importStatus: ColumnDef = {
    header: 'Import Status', width: 16,
    value: v => v.import_status || 'niet_gestart',
  };

  switch (step) {
    case 'nieuw':
      return [merk, model, kenteken, vin, dagen, betaald, pickup, leverancier];
    case 'betaald':
      return [merk, model, kenteken, vin, dagen, betaald, pickup, leverancier];
    case 'pickup':
      return [merk, model, kenteken, vin, dagen, betaald, pickup, verkocht, klant, leverancier];
    case 'aangekomen':
      return [merk, model, kenteken, vin, dagen, cmr, leverancier];
    case 'import':
      return [merk, model, kenteken, vin, dagen, importStatus, verkocht, klant];
    case 'b2b_papieren':
      return [merk, model, vin, dagen, klant, leverancier];
    default:
      return [merk, model, kenteken, vin];
  }
}

const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  },
};

const cellBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
  right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
};

export async function exportMarcoExcel(
  step: PipelineStep,
  vehicles: MarcoVehicle[],
  supplierMap: Record<string, ContactInfo>,
  customerMap: Record<string, ContactInfo>,
) {
  const workbook = new ExcelJS.Workbook();
  const columns = getColumnsForStep(step);
  const label = STEP_LABELS[step];
  const worksheet = workbook.addWorksheet(label);

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };

  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: nl });
  const titleRow = worksheet.addRow([`${label.toUpperCase()} — ${dateStr}`]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.height = 28;
  worksheet.mergeCells(1, 1, 1, columns.length);
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow(columns.map(c => c.header));
  headerRow.height = 24;
  headerRow.eachCell(cell => { Object.assign(cell, { style: headerStyle }); });

  worksheet.columns = columns.map(c => ({ width: c.width }));

  vehicles.forEach((v, idx) => {
    const row = worksheet.addRow(columns.map(c => c.value(v, supplierMap, customerMap)));
    row.height = 22;

    const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
    row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      cell.border = cellBorder;
      cell.alignment = { vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };

      const colDef = columns[colIdx - 1];
      if (colDef?.color) {
        const c = colDef.color(v);
        if (c) cell.font = { color: { argb: c }, bold: true };
      }
    });
  });

  worksheet.addRow([]);
  const footer = worksheet.addRow([`Totaal: ${vehicles.length} voertuigen`]);
  footer.font = { italic: true, size: 10 };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateFile = format(new Date(), 'dd-MM-yyyy');
  a.href = url;
  a.download = `Marco_${step}_${dateFile}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
