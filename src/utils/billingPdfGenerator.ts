import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// MD Logistics Brand Colors
const BRAND = {
  primary: [30, 41, 59] as [number, number, number],      // slate-800
  accent: [79, 70, 229] as [number, number, number],       // indigo-600
  accentLight: [99, 102, 241] as [number, number, number], // indigo-500
  success: [16, 185, 129] as [number, number, number],     // emerald-500
  warning: [245, 158, 11] as [number, number, number],     // amber-500
  danger: [239, 68, 68] as [number, number, number],       // red-500
  bg: [248, 250, 252] as [number, number, number],         // slate-50
  bgAlt: [241, 245, 249] as [number, number, number],      // slate-100
  text: [15, 23, 42] as [number, number, number],          // slate-900
  textMuted: [100, 116, 139] as [number, number, number],  // slate-500
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],     // slate-200
};

// Helper to draw a rounded rectangle
const roundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FS' = 'F') => {
  doc.roundedRect(x, y, w, h, r, r, style);
};

// Helper to generate the Premium PDF document
const createPDFDoc = (
  type: 'delivery' | 'product',
  customerName: string,
  date: string,
  items: any[],
  totals: any
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;   // 210
  const ph = doc.internal.pageSize.height;  // 297
  const margin = 12;

  // ── BACKGROUND ──────────────────────────────────────────────
  doc.setFillColor(...BRAND.bg);
  doc.rect(0, 0, pw, ph, 'F');

  // Top dark band (full width)
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pw, 52, 'F');

  // Accent stripe
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 52, pw, 3, 'F');

  // Decorative circle (top-right)
  doc.setFillColor(255, 255, 255, 0.04);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.circle(pw - 20, 10, 38, 'S');
  doc.circle(pw - 20, 10, 22, 'S');

  // ── LOGO / BRAND ────────────────────────────────────────────
  // Logo box
  doc.setFillColor(...BRAND.accent);
  roundedRect(doc, margin, 10, 30, 30, 4, 'F');

  // Logo text "MD"
  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MD', margin + 15, 29, { align: 'center' });

  // Company Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.white);
  doc.text('MD LOGISTICS', margin + 35, 22);

  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Kondotty, Malappuram Dt.  |  +91 9633606862  |  mdcourierkdy@gmail.com', margin + 35, 31);

  // ── INVOICE LABEL ───────────────────────────────────────────
  const labelText = type === 'delivery' ? 'DELIVERY INVOICE' : 'PRODUCT INVOICE';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(165, 180, 252); // indigo-300
  doc.text(labelText, pw - margin, 22, { align: 'right' });

  // ── INFO SECTION ────────────────────────────────────────────
  const infoY = 65;

  // Left: Bill To Box
  doc.setFillColor(...BRAND.white);
  roundedRect(doc, margin, infoY, 85, 28, 3, 'F');
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, margin, infoY, 85, 28, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textMuted);
  doc.text('BILL TO', margin + 4, infoY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text(customerName || 'N/A', margin + 4, infoY + 16);

  // Right: Date & Invoice box
  doc.setFillColor(...BRAND.white);
  roundedRect(doc, pw - margin - 85, infoY, 85, 28, 3, 'F');
  doc.setDrawColor(...BRAND.border);
  roundedRect(doc, pw - margin - 85, infoY, 85, 28, 3, 'S');

  const rightX = pw - margin - 81;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textMuted);
  doc.text('INVOICE DATE', rightX, infoY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.text);
  doc.text(format(new Date(date), 'dd MMMM yyyy'), rightX, infoY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textMuted);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), rightX, infoY + 23);

  // ── TABLE ───────────────────────────────────────────────────
  let tableHead: any[] = [];
  let tableBody: any[] = [];

  if (type === 'delivery') {
    tableHead = [['Date/Desc', 'Total Qty', '20', '25', '30', '35', '40', '50', 'Amount (Rs.)']];
    tableBody = items.map(item => [
      item.description || '-',
      item.total || 0,
      item.q20 || '-',
      item.q25 || '-',
      item.q30 || '-',
      item.q35 || '-',
      item.q40 || '-',
      item.q50 || '-',
      item.amount ? `${Number(item.amount).toFixed(2)}` : '-'
    ]);
  } else {
    tableHead = [['#', 'Item Name', 'Quantity', 'Rate (Rs.)', 'Amount (Rs.)']];
    tableBody = items.map((item, i) => [
      i + 1,
      item.name || '-',
      item.qty,
      `${Number(item.rate).toFixed(2)}`,
      `${Number(item.amount).toFixed(2)}`
    ]);
  }

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: infoY + 35,
    theme: 'plain',
    headStyles: {
      fillColor: BRAND.primary,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
    },
    bodyStyles: {
      textColor: BRAND.text,
      fontSize: 9,
      halign: 'center',
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    columnStyles: type === 'delivery' ? {
      0: { halign: 'left', cellWidth: 28 },
      1: { fontStyle: 'bold', fillColor: BRAND.bgAlt },
      8: { halign: 'right', fontStyle: 'bold', textColor: BRAND.accent }
    } : {
      0: { cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold', textColor: BRAND.accent }
    },
    alternateRowStyles: { fillColor: BRAND.bgAlt },
    rowPageBreak: 'auto',
    margin: { left: margin, right: margin },
    tableLineColor: BRAND.border,
    tableLineWidth: 0.2,
    didDrawPage: (data) => {
      // Page number in footer
      const str = `Page ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.textMuted);
      doc.text(str, pw / 2, ph - 8, { align: 'center' });
    }
  });

  // ── TOTALS SECTION ──────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Summary box (right-aligned)
  const summaryWidth = 80;
  const summaryX = pw - margin - summaryWidth;

  doc.setFillColor(...BRAND.white);
  roundedRect(doc, summaryX, finalY, summaryWidth, type === 'delivery' ? 22 : 14, 3, 'F');
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  roundedRect(doc, summaryX, finalY, summaryWidth, type === 'delivery' ? 22 : 14, 3, 'S');

  if (type === 'delivery') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.textMuted);
    doc.text('Total Qty:', summaryX + 4, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.text);
    doc.text(String(totals.qty ?? 0), pw - margin - 4, finalY + 8, { align: 'right' });
  }

  const amtY = type === 'delivery' ? finalY + 17 : finalY + 10;

  // Total amount highlighted
  doc.setFillColor(...BRAND.accent);
  roundedRect(doc, summaryX, amtY - 5, summaryWidth, 12, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('TOTAL AMOUNT', summaryX + 4, amtY + 1.5);

  doc.setFontSize(13);
  doc.setTextColor(...BRAND.white);
  doc.text(`Rs. ${Number(totals.amount).toFixed(2)}`, pw - margin - 4, amtY + 1.5, { align: 'right' });

  // ── SIGNATURES ──────────────────────────────────────────────
  const sigY = ph - 38;

  // Divider
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.4);
  doc.line(margin, sigY - 4, pw - margin, sigY - 4);

  // Left signature
  doc.setDrawColor(...BRAND.textMuted);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY + 10, margin + 60, sigY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.textMuted);
  doc.text('Customer Signature', margin, sigY + 15);

  // Right signature
  doc.line(pw - margin - 60, sigY + 10, pw - margin, sigY + 10);
  doc.text('Authorized Signature', pw - margin - 60, sigY + 15);

  // ── FOOTER ──────────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, ph - 14, pw, 14, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.white);
  doc.text('MD Logistics · Kondotty, Malappuram · +91 9633606862 · mdcourierkdy@gmail.com', pw / 2, ph - 6, { align: 'center' });

  return doc;
};

export const generateBillingPDF = (
  type: 'delivery' | 'product',
  customerName: string,
  date: string,
  items: any[],
  totals: any
) => {
  const doc = createPDFDoc(type, customerName, date, items, totals);
  const filename = `Invoice_${(customerName || 'Customer').replace(/\s+/g, '_')}_${date}.pdf`;
  doc.save(filename);

  // Fallback for mobile WebViews
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (!newWindow) console.warn('Popup blocked. Using direct download.');
  } catch (e) {
    console.error('PDF fallback error:', e);
  }
};

export const getBillingPDFFile = (
  type: 'delivery' | 'product',
  customerName: string,
  date: string,
  items: any[],
  totals: any
): File => {
  const doc = createPDFDoc(type, customerName, date, items, totals);
  const blob = doc.output('blob');
  return new File([blob], `Invoice_${customerName || 'Customer'}.pdf`, { type: 'application/pdf' });
};
