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
  logoUrl?: string // Added logoUrl parameter
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yOffset = 20; // Initial Y offset for content

  // Add Logo if provided
  if (logoUrl) {
    const img = new Image();
    img.src = logoUrl;
    // Ensure image is loaded before adding to PDF
    img.onload = () => {
      const imgWidth = 30; // Desired width for the logo
      const imgHeight = (img.height * imgWidth) / img.width; // Maintain aspect ratio
      const xPos = (pageWidth - imgWidth) / 2; // Center the logo
      doc.addImage(img, 'JPEG', xPos, 10, imgWidth, imgHeight);
      yOffset = 10 + imgHeight + 10; // Adjust yOffset below the logo with some padding
      addContent();
    };
    img.onerror = () => {
      console.error("Failed to load logo image.");
      addContent(); // Proceed without logo if it fails to load
    };
  } else {
    addContent();
  }

  function addContent() {
    // Header
    doc.setFontSize(20);
    doc.text(title, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 10; // Add some space after title
    doc.setFontSize(12);
    doc.text(`Statement for: ${userName}`, 14, yOffset);
    yOffset += 6;
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, yOffset);
    yOffset += 10; // Add space before table

    // Table
    autoTable(doc, {
      startY: yOffset,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }, // Blue color for header
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
  }
}