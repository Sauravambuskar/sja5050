import jsPDF from "jspdf";
import type { IdCardSettings, Profile } from "@/types/database";

type ExportOptions = {
  profile: Profile;
  settings: IdCardSettings;
  email?: string | null;
  memberSinceLabel?: string;
  avatarDataUrl?: string;
  logoDataUrl?: string;
  backgroundDataUrl?: string;
  qrDataUrl?: string;
};

// Render at high resolution then export as PNG/PDF.
// This avoids DOM capture (which caused blank/cropped exports).
const CARD_W = 856;
const CARD_H = 540;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function loadImage(src?: string) {
  if (!src) return null;
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialPx: number, minPx: number, weight = 800) {
  let size = initialPx;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
    if (size <= minPx) return minPx;
  }
  return Math.max(minPx, size);
}

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function circleAvatar(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, r: number, fallbackText: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    const size = r * 2;
    drawCover(ctx, img, cx - r, cy - r, size, size);
  } else {
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#0F172A";
    ctx.font = `900 ${Math.round(r * 0.9)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackText, cx, cy);
  }

  ctx.restore();

  // border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();
}

export async function renderIdCardToPngDataUrl(options: ExportOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const accent = options.settings.accent_color || "#2563eb";

  const [bgImg, logoImg, avatarImg, qrImg] = await Promise.all([
    loadImage(options.backgroundDataUrl),
    loadImage(options.logoDataUrl),
    loadImage(options.avatarDataUrl),
    loadImage(options.qrDataUrl),
  ]);

  // Base background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (bgImg) {
    drawCover(ctx, bgImg, 0, 0, CARD_W, CARD_H);
    // mild overlay so text stays readable
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  // Layout
  const pad = 44;
  const headerH = 140;
  const footerH = 62;
  const footerY = CARD_H - footerH;

  // Header bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_W, headerH);

  // Logo (left)
  const logoBox = 88;
  const logoX = pad;
  const logoY = (headerH - logoBox) / 2;
  if (logoImg) {
    const iw = logoImg.naturalWidth || logoImg.width;
    const ih = logoImg.naturalHeight || logoImg.height;
    const scale = Math.min(logoBox / iw, logoBox / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(logoImg, logoX, logoY + (logoBox - dh) / 2, dw, dh);
  }

  // Company name (right)
  const company = (options.settings.company_name || "").trim();
  const companyRightX = CARD_W - pad;
  const companyLeftLimit = logoImg ? logoX + logoBox + 24 : pad;
  const companyMaxW = companyRightX - companyLeftLimit;

  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const companyFont = fitTextToWidth(ctx, company, companyMaxW, 54, 30, 900);
  ctx.font = `900 ${companyFont}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(company, companyRightX, headerH / 2);

  // Body panel (white)
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(0, headerH, CARD_W, footerY - headerH);

  // Avatar: overlap header/body but DO NOT overlap name
  const avatarR = 64;
  const avatarCx = pad + avatarR;
  const avatarCy = headerH + 22; // small overlap
  circleAvatar(ctx, avatarImg, avatarCx, avatarCy, avatarR, initials(options.profile.full_name));

  // Text content
  const contentX = pad;
  let y = headerH + 165; // pushed down to avoid avatar overlap

  // Full name
  const name = (options.profile.full_name || "").trim();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1E3A8A";
  const nameMaxW = CARD_W - pad * 2;
  const nameSize = fitTextToWidth(ctx, name, nameMaxW, 56, 34, 900);
  ctx.font = `900 ${nameSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(name, contentX, y);
  y += 46;

  // Member ID line
  const memberId = String(options.profile.member_id || "");
  ctx.fillStyle = "#64748B";
  ctx.font = `600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText("Member ID:", contentX, y);
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(memberId, contentX + 168, y);
  y += 62;

  // Phone + KYC row
  const rowY = y;

  // phone dot
  ctx.fillStyle = "#64748B";
  ctx.beginPath();
  ctx.arc(contentX + 18, rowY - 10, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0F172A";
  ctx.font = `800 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(String(options.profile.phone || "N/A"), contentX + 44, rowY);

  const kyc = String(options.profile.kyc_status || "N/A");
  const kycText = `KYC: ${kyc}`;
  ctx.font = `900 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  const kycTextW = ctx.measureText(kycText).width;
  const badgePadX = 18;
  const badgeW = clamp(kycTextW + badgePadX * 2, 180, 320);
  const badgeH = 52;
  const badgeX = CARD_W - pad - badgeW;
  const badgeY = rowY - 42;

  ctx.fillStyle = "#EEF2FF";
  roundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "#0F172A";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(kycText, badgeX + badgePadX, badgeY + badgeH / 2);

  // Bottom block (Member since + QR)
  const bottomLabelY = footerY - 96;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#64748B";
  ctx.font = `600 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText("Member Since", pad, bottomLabelY);

  ctx.fillStyle = "#0F172A";
  ctx.font = `900 32px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(options.memberSinceLabel || "N/A", pad, bottomLabelY + 44);

  // QR (above footer, no overlap)
  const qrSize = 104;
  const qrBoxPad = 14;
  const qrX = CARD_W - pad - qrSize;
  const qrY = footerY - qrSize - 34;

  ctx.fillStyle = "#FFFFFF";
  roundedRectPath(ctx, qrX - qrBoxPad, qrY - qrBoxPad, qrSize + qrBoxPad * 2, qrSize + qrBoxPad * 2, 16);
  ctx.fill();

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Footer
  ctx.fillStyle = accent;
  ctx.fillRect(0, footerY, CARD_W, footerH);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `900 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("sjamicrofoundation.com", CARD_W / 2, footerY + footerH / 2);

  return canvas.toDataURL("image/png");
}

export async function renderIdCardToPdfBlob(options: ExportOptions) {
  const png = await renderIdCardToPngDataUrl(options);

  // Standard credit card size
  const cardWidthMM = 85.6;
  const cardHeightMM = 53.98;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cardWidthMM, cardHeightMM],
  });

  doc.addImage(png, "PNG", 0, 0, cardWidthMM, cardHeightMM);
  return doc.output("blob");
}