import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to draw the MD LOGISTICS Header
export const drawPDFHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Blue Header Background
  doc.setFillColor(79, 70, 229); // Indigo-600 like color
  doc.rect(0, 0, pageWidth, 45, 'F'); // Increased height slightly

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text("MD LOGISTICS", pageWidth / 2, 18, { align: 'center' });

  // Address
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text("Kondotty, Malappuram Dt.", pageWidth / 2, 28, { align: 'center' });

  // Contact
  doc.setFontSize(11);
  doc.text("Phone: +91 9633606862 | Email: mdcourierkdy@gmail.com", pageWidth / 2, 36, { align: 'center' });
};

// Helper to draw the Customer Info section
export const drawCustomerInfo = (doc: jsPDF, label: string, value: string, date: string, startY: number = 60) => {
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Left Column
  doc.text(label, 14, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(value, 55, startY);

  // Date Row
  doc.setFont('helvetica', 'bold');
  doc.text("Report Date:", 14, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(date, 55, startY + 8);
};

// Helper to draw the Green Footer
export const drawGreenFooter = (doc: jsPDF, label: string, value: string | number) => {
  const pageWidth = doc.internal.pageSize.width;
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Green Box
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(pageWidth - 90, finalY, 76, 24, 'F');

  // Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(label, pageWidth - 85, finalY + 10);
  
  doc.setFontSize(18);
  doc.text(String(value), pageWidth - 85, finalY + 19);
};

// Smart Save Function for Mobile WebViews
export const savePDF = (doc: jsPDF, filename: string) => {
  // 1. Try the standard save (works on Desktop & some Androids)
  doc.save(filename);

  // 2. Fallback for WebViews that block downloads: Open in new window
  // This creates a Blob URL and tries to open it.
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    // Opening in new window often triggers the native PDF viewer on Android
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      console.warn('Popup blocked. PDF download might fail in WebView.');
    }
  } catch (e) {
    console.error('Error opening PDF fallback:', e);
  }
};
