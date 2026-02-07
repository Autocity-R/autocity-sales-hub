

# Plan: Excel Export voor Voertuig Checklist

## Samenvatting

Een Excel export knop toevoegen aan de Checklist tab in het voertuigdetails menu. De export bevat voertuiginformatie bovenaan en alle checklist items overzichtelijk daaronder.

## Gewenste Output Structuur

```text
┌────────────────────────────────────────────────────────────────┐
│            CHECKLIST VOERTUIG - 7 februari 2025               │
├────────────────────────────────────────────────────────────────┤
│  Merk:      Volkswagen                                         │
│  Model:     Golf                                               │
│  Kenteken:  XX-123-YY                                          │
│  VIN:       WVWZZZ3CZWE123456                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CHECKLIST                                                     │
├────────────────────────────────────────────────────────────────┤
│  #   │ Taak                           │ Status    │ ✓         │
├──────┼────────────────────────────────┼───────────┼───────────┤
│  1   │ Autopapieren controleren       │ Voltooid  │ ✓         │
│  2   │ Poetsen interieur              │ Open      │ ○         │
│  3   │ Bandenspanning controleren     │ Open      │ ○         │
└────────────────────────────────────────────────────────────────┘
```

## Bestanden

### Nieuw bestand: `src/utils/checklistExportExcel.ts`

Excel export functie die:
1. Een workbook aanmaakt met ExcelJS (al geïnstalleerd)
2. Voertuiginfo als header toevoegt (Merk, Model, Kenteken, VIN)
3. Alle checklist items in een tabel plaatst
4. Status kolom met "Voltooid" of "Open"
5. Checkbox kolom (✓ of ○) voor printen
6. A4 portrait formaat met goede marges

```typescript
import ExcelJS from 'exceljs';
import { Vehicle, ChecklistItem } from '@/types/inventory';
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

  // Title
  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: nl });
  worksheet.addRow([`CHECKLIST VOERTUIG - ${dateStr}`]);
  // Merge and style...

  // Vehicle info section
  worksheet.addRow([]);
  worksheet.addRow(['Merk:', vehicle.brand]);
  worksheet.addRow(['Model:', vehicle.model]);
  worksheet.addRow(['Kenteken:', vehicle.licenseNumber || '-']);
  worksheet.addRow(['VIN:', vehicle.vin || '-']);

  // Checklist section
  worksheet.addRow([]);
  worksheet.addRow(['CHECKLIST']);
  worksheet.addRow(['#', 'Taak', 'Status', '✓']);

  checklist.forEach((item, index) => {
    worksheet.addRow([
      index + 1,
      item.description,
      item.completed ? 'Voltooid' : 'Open',
      item.completed ? '✓' : '○'
    ]);
  });

  // Footer
  const completedCount = checklist.filter(i => i.completed).length;
  worksheet.addRow([]);
  worksheet.addRow([`${completedCount} van ${checklist.length} taken voltooid`]);

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: '...' });
  // Download link logic...
};
```

### Wijziging: `src/components/inventory/detail-tabs/ChecklistTab.tsx`

1. Import toevoegen voor de export functie en Download icon
2. Export knop toevoegen in de header van de Progress Card
3. onClick handler die de export functie aanroept met vehicle data

```typescript
// Nieuwe import
import { Download } from 'lucide-react';
import { exportChecklistToExcel } from '@/utils/checklistExportExcel';

// In de Progress Card header:
<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        Voortgang Checklist
      </CardTitle>
      <CardDescription>
        {/* bestaande tekst */}
      </CardDescription>
    </div>
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => exportChecklistToExcel(vehicle)}
      disabled={totalCount === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Excel
    </Button>
  </div>
</CardHeader>
```

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/utils/checklistExportExcel.ts` | **Nieuw bestand** - Excel export functie voor voertuig checklist |
| `src/components/inventory/detail-tabs/ChecklistTab.tsx` | Export knop toevoegen in Progress Card header |

## Verwacht Resultaat

- Nieuwe "Excel" knop in de Checklist tab
- Klikken genereert een Excel bestand met:
  - Voertuiginfo (Merk, Model, Kenteken, VIN) bovenaan
  - Alle checklist items onder elkaar
  - Status kolom (Voltooid/Open)
  - Checkbox kolom voor afvinken op papier
- Bestandsnaam: `Checklist_Volkswagen_Golf_XX-123-YY_07-02-2025.xlsx`

