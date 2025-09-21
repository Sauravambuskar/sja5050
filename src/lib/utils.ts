import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function exportToCsv(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = (row as any)[k] === null || (row as any)[k] === undefined ? '' : (row as any)[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToPdf(
  filename: string,
  title: string,
  headers: string[],
  data: (string | number)[][],
  userName: string,
  logoUrl?: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yOffset = 20;

  // Create a promise to handle logo loading
  const loadLogo = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = url;
    });
  };

  const generatePdf = async () => {
    try {
      // Add Logo if provided
      if (logoUrl) {
        try {
          const img = await loadLogo(logoUrl);
          const imgWidth = 30;
          const imgHeight = (img.height * imgWidth) / img.width;
          const xPos = (pageWidth - imgWidth) / 2;
          doc.addImage(img, 'JPEG', xPos, 10, imgWidth, imgHeight);
          yOffset = 10 + imgHeight + 10;
        } catch (error) {
          console.warn('Logo failed to load, proceeding without logo:', error);
          yOffset = 20; // Reset to default if logo fails
        }
      }

      // Header
      doc.setFontSize(20);
      doc.text(title, pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 10;
      doc.setFontSize(12);
      doc.text(`Statement for: ${userName}`, 14, yOffset);
      yOffset += 6;
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, yOffset);
      yOffset += 10;

      // Table
      autoTable(doc, {
        startY: yOffset,
        head: [headers],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 'auto' }
        },
        didDrawPage: function (data) {
          // Footer on each page
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(
              `Page ${i} of ${pageCount}`,
              pageWidth - 14,
              doc.internal.pageSize.getHeight() - 10,
              { align: 'right' }
            );
            doc.text(
              'SJA Foundation',
              14,
              doc.internal.pageSize.getHeight() - 10
            );
          }
        }
      });

      doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  };

  generatePdf();
}