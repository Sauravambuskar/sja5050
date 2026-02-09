import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function keepTrying<T>(
  fn: () => Promise<{ data: T | null; error: Error | null }>,
  retries = 3,
  delay = 1000
): Promise<{ data: T | null; error: Error | null }> {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await fn();
    if (data) {
      return { data, error: null };
    }
    if (error && i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    } else if (error) {
      return { data: null, error };
    }
  }
  return { data: null, error: new Error("Failed after multiple retries") };
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

  const getImageFormat = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.endsWith('.png')) return 'PNG' as const;
    if (lower.endsWith('.webp')) return 'WEBP' as const;
    return 'JPEG' as const;
  };

  // Add Logo if provided
  if (logoUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;

    img.onload = () => {
      try {
        const imgWidth = 30;
        const imgHeight = (img.height * imgWidth) / img.width;
        const xPos = (pageWidth - imgWidth) / 2;

        try {
          doc.addImage(img, getImageFormat(logoUrl), xPos, 10, imgWidth, imgHeight);
          yOffset = 10 + imgHeight + 10;
        } catch (err) {
          // If the image can't be embedded (CORS/format issues), continue without the logo.
          console.warn('Failed to embed logo image in PDF:', err);
        }
      } finally {
        addContent();
      }
    };

    img.onerror = () => {
      addContent();
    };
  } else {
    addContent();
  }

  function addContent() {
    doc.setFontSize(20);
    doc.text(title, pageWidth / 2, yOffset, { align: 'center' });
    yOffset += 10;

    doc.setFontSize(12);
    doc.text(`Statement for: ${userName}`, 14, yOffset);
    yOffset += 6;
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, yOffset);
    yOffset += 10;

    autoTable(doc, {
      startY: yOffset,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      didDrawPage: function () {
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
          doc.text('SJA Foundation', 14, doc.internal.pageSize.getHeight() - 10);
        }
      },
    });

    doc.save(filename);
  }
}