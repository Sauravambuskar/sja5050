/**
 * Downloads a QR code canvas element as a PNG image file.
 *
 * @param canvas - The HTMLCanvasElement rendered by QRCodeCanvas.
 * @param filename - The desired filename (without extension).
 */
export function downloadQrCodeCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
}
