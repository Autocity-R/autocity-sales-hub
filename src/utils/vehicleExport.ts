import { Vehicle } from "@/types/inventory";

export const exportVehiclesToExcel = (vehicles: Vehicle[]) => {
  // CSV header met Nederlandse kolomnamen
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

  // Map vehicles naar rijen
  const rows = vehicles.map(v => [
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

  // Escape functie voor CSV cellen
  const escapeCell = (cell: string) => {
    // Als de cel speciale karakters bevat, wrap in quotes en escape bestaande quotes
    if (cell.includes(';') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return `"${cell}"`;
  };

  // Maak CSV content met ; separator voor Nederlandse Excel
  const csvContent = [
    headers.map(escapeCell).join(';'),
    ...rows.map(row => row.map(escapeCell).join(';'))
  ].join('\r\n');

  // Maak blob met UTF-8 BOM voor correcte weergave van € en speciale tekens
  const BOM = '\ufeff';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });

  // Genereer bestandsnaam met datum
  const today = new Date().toISOString().split('T')[0];
  const filename = `Auto_City_Verkooplijst_${today}.csv`;

  // Trigger download
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
