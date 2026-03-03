import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

export async function generateQrPngDataUrl(params: {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
}) {
  const { value, size = 256, level = "M" } = params;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "-10000px";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <QRCodeCanvas
      value={value}
      size={size}
      level={level}
      includeMargin={false}
      bgColor="#ffffff"
      fgColor="#000000"
    />
  );

  // Wait for React to commit and canvas to be painted
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const canvas = container.querySelector("canvas");
  const dataUrl = canvas?.toDataURL("image/png") || null;

  root.unmount();
  container.remove();

  if (!dataUrl) throw new Error("Failed to generate QR code");
  return dataUrl;
}
