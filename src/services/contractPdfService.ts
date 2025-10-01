import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import html2pdf from 'html2pdf.js';

/**
 * Generates a PDF from HTML contract content with full styling
 * Preserves all layout, CSS, tables, and images
 */
export const generatePdfFromHtml = async (htmlContent: string): Promise<Blob> => {
  const opt = {
    margin: 10,
    filename: 'contract.pdf',
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  // Generate PDF from HTML
  const pdfBlob = await html2pdf().set(opt).from(htmlContent).output('blob');
  return pdfBlob;
};

/**
 * Generates a PDF from plain text contract content
 * Handles multi-line text with automatic page breaks
 * @deprecated Use generatePdfFromHtml for better layout preservation
 */
export const generatePdfFromText = async (text: string): Promise<Uint8Array> => {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Page settings (A4 size)
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 50;
  const maxWidth = pageWidth - (margin * 2);
  const fontSize = 10;
  const lineHeight = fontSize * 1.5;
  
  // Split text into lines
  const lines = text.split('\n');
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;
  
  for (const line of lines) {
    // Check if we need a new page
    if (yPosition < margin + lineHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
    
    // Determine if line should be bold (headers, titles)
    const isBold = line.includes('KOOPOVEREENKOMST') || 
                   line.includes('ARTIKEL') || 
                   line.startsWith('Verkoper:') ||
                   line.startsWith('Koper:') ||
                   line.startsWith('Voertuiggegevens:') ||
                   line.trim().endsWith(':');
    
    const currentFont = isBold ? boldFont : font;
    const currentFontSize = isBold && line.includes('KOOPOVEREENKOMST') ? 16 : fontSize;
    
    // Word wrap if line is too long
    if (line.length > 0) {
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = currentFont.widthOfTextAtSize(testLine, currentFontSize);
        
        if (textWidth > maxWidth && currentLine) {
          // Draw current line
          currentPage.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: currentFontSize,
            font: currentFont,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
          
          // Check if we need a new page
          if (yPosition < margin + lineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - margin;
          }
          
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw remaining text
      if (currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: currentFontSize,
          font: currentFont,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    yPosition -= lineHeight;
  }
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
