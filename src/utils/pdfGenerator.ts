import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND, CONTACT_INFO } from '../constants/branding';
import { formatReportDate } from './dateUtils';

// Helper to draw a rounded rectangle
const roundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FS' = 'F') => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

export const drawPDFHeader = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.width;
  const margin = 12;

  // Top dark band
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pw, 52, 'F');

  // Indigo accent stripe
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 52, pw, 3, 'F');

  // Decorative circles top-right
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.1);
  const circX = pw - 22;
  const circY = 12;
  doc.circle(circX, circY, 38, 'S');
  doc.circle(circX, circY, 22, 'S');

  // LOGO TEXT: MD LOGISTICS
  const logoX = margin;
  const logoY = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.setTextColor(...BRAND.white);
  doc.text('MD', logoX, logoY + 26);

  const mdWidth = doc.getTextWidth('MD');
  const stackedX = logoX + mdWidth + 4;

  doc.setFontSize(14);
  doc.text('LOGISTICS', stackedX, logoY + 22);

  const logWidth = doc.getTextWidth('LOGISTICS');
  const divX = stackedX + logWidth + 8;
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(divX, logoY + 10, divX, logoY + 24);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`${CONTACT_INFO.address}  |  ${CONTACT_INFO.phone}`, divX + 6, logoY + 16);
  doc.text(CONTACT_INFO.email, divX + 6, logoY + 22.5);
};

export const drawCustomerInfo = (doc: jsPDF, label: string, value: string, date: string, startY: number = 65) => {
  const pw = doc.internal.pageSize.width;
  const margin = 12;

  // Left: Primary Info Box
  doc.setFillColor(...BRAND.white);
  roundedRect(doc, margin, startY, 85, 28, 3, 'F');
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, margin, startY, 85, 28, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textMuted);
  doc.text(label.toUpperCase(), margin + 4, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  doc.text(value || 'N/A', margin + 4, startY + 16);

  // Right: Date & Report Info box
  doc.setFillColor(...BRAND.white);
  roundedRect(doc, pw - margin - 85, startY, 85, 28, 3, 'F');
  doc.setDrawColor(...BRAND.border);
  roundedRect(doc, pw - margin - 85, startY, 85, 28, 3, 'S');

  const rightX = pw - margin - 81;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textMuted);
  doc.text('REPORT DATE', rightX, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  
  if (date.includes(' to ')) {
    doc.setFontSize(9); // Smaller font for range
    doc.text(date, rightX, startY + 16);
  } else {
    doc.text(formatReportDate(date), rightX, startY + 16);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textMuted);
  doc.text(`Doc ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, rightX, startY + 23);
};

export const drawGreenFooter = (doc: jsPDF, label: string, value: string | number) => {
  const pw = doc.internal.pageSize.width;
  const margin = 12;
  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 150;

  const summaryWidth = 80;
  const summaryX = pw - margin - summaryWidth;

  doc.setFillColor(...BRAND.success);
  roundedRect(doc, summaryX, finalY, summaryWidth, 14, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(209, 250, 229); // emerald-100
  doc.text(label.toUpperCase(), summaryX + 4, finalY + 9);

  doc.setFontSize(13);
  doc.setTextColor(...BRAND.white);
  doc.text(String(value), pw - margin - 4, finalY + 9, { align: 'right' });
};

export const savePDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (!newWindow) console.warn('Popup blocked.');
  } catch (e) {
    console.error('PDF fallback error:', e);
  }
};

export const calculateTotalItemCount = (itemNumbers: (string | undefined | null)[]): number => {
  return itemNumbers.reduce((sum: number, str) => {
    if (!str) return sum;
    const trimmed = str.trim();
    if (!trimmed || trimmed === '-') return sum;

    const match = trimmed.match(/\d+/);
    if (match) {
      return sum + parseInt(match[0], 10);
    }
    return sum + 1;
  }, 0);
};

