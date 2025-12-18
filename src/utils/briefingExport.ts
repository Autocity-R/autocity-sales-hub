import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Briefing {
  id: string;
  agent_id: string;
  briefing_type: string;
  briefing_date: string;
  content: string;
  summary: string | null;
  alerts_included: number | null;
  memories_used: number | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
}

const BriefingTypeLabels: Record<string, string> = {
  daily: 'Dagelijkse Briefing',
  weekly: 'Wekelijkse Strategie',
  monthly: 'Maandelijkse Deep Dive'
};

/**
 * Export briefing to Excel format
 */
export const exportBriefingToExcel = async (briefing: Briefing): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Jacob AI';
    workbook.created = new Date();

    const typeLabel = BriefingTypeLabels[briefing.briefing_type] || briefing.briefing_type;
    const dateStr = format(parseISO(briefing.briefing_date), 'd MMMM yyyy', { locale: nl });

    // Main briefing sheet
    const briefingSheet = workbook.addWorksheet('Briefing');

    // Title row
    briefingSheet.mergeCells('A1:D1');
    const titleCell = briefingSheet.getCell('A1');
    titleCell.value = `${typeLabel} - ${dateStr}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    briefingSheet.getRow(1).height = 30;

    // Meta info
    briefingSheet.getCell('A3').value = 'Type:';
    briefingSheet.getCell('B3').value = typeLabel;
    briefingSheet.getCell('A4').value = 'Datum:';
    briefingSheet.getCell('B4').value = dateStr;
    briefingSheet.getCell('A5').value = 'Alerts:';
    briefingSheet.getCell('B5').value = briefing.alerts_included || 0;
    briefingSheet.getCell('A6').value = 'Inzichten Gebruikt:';
    briefingSheet.getCell('B6').value = briefing.memories_used || 0;

    // Style meta labels
    ['A3', 'A4', 'A5', 'A6'].forEach(cell => {
      briefingSheet.getCell(cell).font = { bold: true };
    });

    // Summary
    if (briefing.summary) {
      briefingSheet.mergeCells('A8:D8');
      briefingSheet.getCell('A8').value = 'Samenvatting';
      briefingSheet.getCell('A8').font = { bold: true, size: 12 };
      
      briefingSheet.mergeCells('A9:D9');
      briefingSheet.getCell('A9').value = briefing.summary;
      briefingSheet.getCell('A9').alignment = { wrapText: true };
      briefingSheet.getRow(9).height = 40;
    }

    // Content header
    const contentStartRow = briefing.summary ? 11 : 8;
    briefingSheet.mergeCells(`A${contentStartRow}:D${contentStartRow}`);
    briefingSheet.getCell(`A${contentStartRow}`).value = 'Briefing Inhoud';
    briefingSheet.getCell(`A${contentStartRow}`).font = { bold: true, size: 12 };
    briefingSheet.getCell(`A${contentStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };

    // Content - split by sections
    const contentLines = briefing.content.split('\n');
    let currentRow = contentStartRow + 1;
    
    contentLines.forEach(line => {
      briefingSheet.mergeCells(`A${currentRow}:D${currentRow}`);
      briefingSheet.getCell(`A${currentRow}`).value = line;
      briefingSheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' };
      
      // Style headers (lines starting with emoji or #)
      if (line.match(/^[📊🚨🟢📚💡✅🌅📈🎯🏆⚠️]/)) {
        briefingSheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
        briefingSheet.getCell(`A${currentRow}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      }
      
      currentRow++;
    });

    // Column widths
    briefingSheet.getColumn('A').width = 25;
    briefingSheet.getColumn('B').width = 30;
    briefingSheet.getColumn('C').width = 20;
    briefingSheet.getColumn('D').width = 20;

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `Jacob_${briefing.briefing_type}_briefing_${format(parseISO(briefing.briefing_date), 'yyyy-MM-dd')}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Error exporting briefing to Excel:', error);
    throw error;
  }
};

/**
 * Export briefing to PDF format
 */
export const exportBriefingToPDF = async (briefing: Briefing): Promise<void> => {
  try {
    // Dynamic import for html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    
    const typeLabel = BriefingTypeLabels[briefing.briefing_type] || briefing.briefing_type;
    const dateStr = format(parseISO(briefing.briefing_date), 'd MMMM yyyy', { locale: nl });

    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .header .subtitle {
              margin-top: 8px;
              opacity: 0.9;
              font-size: 14px;
            }
            .meta {
              display: flex;
              gap: 20px;
              margin-bottom: 30px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .meta-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .meta-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 12px;
            }
            .meta-value {
              font-weight: 700;
              color: #1f2937;
            }
            .summary {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px 20px;
              margin-bottom: 30px;
              border-radius: 0 8px 8px 0;
            }
            .summary h2 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #1e40af;
            }
            .content {
              white-space: pre-wrap;
              font-size: 13px;
            }
            .content-section {
              margin-bottom: 20px;
            }
            .section-header {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 10px;
              color: #1e40af;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🤖 ${typeLabel}</h1>
            <div class="subtitle">${dateStr} • Jacob AI CEO Assistant</div>
          </div>
          
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Alerts:</span>
              <span class="meta-value">${briefing.alerts_included || 0}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Inzichten:</span>
              <span class="meta-value">${briefing.memories_used || 0}</span>
            </div>
          </div>
          
          ${briefing.summary ? `
            <div class="summary">
              <h2>Samenvatting</h2>
              <p>${briefing.summary}</p>
            </div>
          ` : ''}
          
          <div class="content">
            ${briefing.content.replace(/\n/g, '<br>')}
          </div>
          
          <div class="footer">
            Gegenereerd door Jacob AI • AutoCity CRM • ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: nl })}
          </div>
        </body>
      </html>
    `;

    // Create a container element
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const fileName = `Jacob_${briefing.briefing_type}_briefing_${format(parseISO(briefing.briefing_date), 'yyyy-MM-dd')}.pdf`;

    // Generate PDF
    await html2pdf()
      .set({
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(container)
      .save();

    // Cleanup
    document.body.removeChild(container);

  } catch (error) {
    console.error('Error exporting briefing to PDF:', error);
    throw error;
  }
};

/**
 * Export multiple briefings to a summary Excel
 */
export const exportBriefingsSummary = async (briefings: Briefing[]): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Jacob AI';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Briefings Overzicht');

    // Headers
    sheet.columns = [
      { header: 'Datum', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Samenvatting', key: 'summary', width: 50 },
      { header: 'Alerts', key: 'alerts', width: 10 },
      { header: 'Inzichten', key: 'insights', width: 12 },
      { header: 'Gelezen', key: 'read', width: 10 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    briefings.forEach(briefing => {
      sheet.addRow({
        date: format(parseISO(briefing.briefing_date), 'd MMM yyyy', { locale: nl }),
        type: BriefingTypeLabels[briefing.briefing_type] || briefing.briefing_type,
        summary: briefing.summary || '-',
        alerts: briefing.alerts_included || 0,
        insights: briefing.memories_used || 0,
        read: briefing.is_read ? 'Ja' : 'Nee'
      });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const fileName = `Jacob_Briefings_Overzicht_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Error exporting briefings summary:', error);
    throw error;
  }
};
