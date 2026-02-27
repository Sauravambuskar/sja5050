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

function fitTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialPx: number, minPx: number) {
  let size = initialPx;
  for (let i = 0; i < 20; i++) {
    ctx.font = `700 ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
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
    ctx.font = `800 ${Math.round(r * 0.9)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallbackText, cx, cy);
  }

  ctx.restore();

  // border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.lineWidth = Math.max(6, Math.round(r * 0.07));
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();
}

export async function renderIdCardToPngDataUrl(options: ExportOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const accent = options.settings.accent_color || "#2563eb";

  const [bgImg, logoImg, avatarImg, qrImg] = await Promise.all([
    loadImage(options.backgroundDataUrl),
    loadImage(options.logoDataUrl),
    loadImage(options.avatarDataUrl),
    loadImage(options.qrDataUrl),
  ]);

  if (bgImg) {
    drawCover(ctx, bgImg, 0, 0, CARD_W, CARD_H);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  // Header
  const headerH = 150;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_W, headerH);

  const pad = 44;

  // Logo
  const logoBox = 96;
  const logoX = pad;
  const logoY = 28;
  if (logoImg) {
    // fit into square
    const iw = logoImg.naturalWidth || logoImg.width;
    const ih = logoImg.naturalHeight || logoImg.height;
    const scale = Math.min(logoBox / iw, logoBox / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(logoImg, logoX, logoY + (logoBox - dh) / 2, dw, dh);
  }

  // Company name (right aligned, fit)
  const company = options.settings.company_name || "";
  const companyMaxW = CARD_W - pad - (logoImg ? (logoX + logoBox + 24) : (pad + 24));
  const companyFont = fitTextToWidth(ctx, company, companyMaxW, 52, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${companyFont}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(company, CARD_W - pad, headerH / 2);

  // Body panel
  const bodyY = 150;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fillRect(0, bodyY, CARD_W, CARD_H - bodyY);

  // Avatar overlaps header/body
  const avatarR = 92;
  const avatarCx = pad + avatarR;
  const avatarCy = headerH - 10;
  circleAvatar(ctx, avatarImg, avatarCx, avatarCy, avatarR, initials(options.profile.full_name));

  const textX = pad;
  let y = headerH + 70;

  // Name
  ctx.fillStyle = "#1E3A8A";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 54px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  const name = options.profile.full_name || "";
  const maxNameW = CARD_W - pad * 2;
  // If too long, shrink
  let nameSize = 54;
  while (nameSize > 34) {
    ctx.font = `800 ${nameSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    if (ctx.measureText(name).width <= maxNameW) break;
    nameSize -= 2;
  }
  ctx.fillText(name, textX, y);
  y += 44;

  // Member ID
  ctx.fillStyle = "#64748B";
  ctx.font = `500 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText("Member ID:", textX, y);
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(String(options.profile.member_id || ""), textX + 160, y);
  y += 56;

  // Phone + KYC
  const rowY = y;
  ctx.fillStyle = "#0F172A";
  ctx.font = `600 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(String(options.profile.phone || "N/A"), textX + 48, rowY);

  // simple phone dot
  ctx.fillStyle = "#64748B";
  ctx.beginPath();
  ctx.arc(textX + 20, rowY - 10, 10, 0, Math.PI * 2);
  ctx.fill();

  const kyc = String(options.profile.kyc_status || "N/A");
  const kycBadgeX = CARD_W - pad - 240;
  const badgeW = 240;
  const badgeH = 52;
  const badgeY = rowY - 40;
  ctx.fillStyle = "#EEF2FF";
  ctx.beginPath();
  ctx.roundRect(kycBadgeX, badgeY, badgeW, badgeH, 26);
  ctx.fill();
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`KYC: ${kyc}`, kycBadgeX + 20, badgeY + badgeH / 2);

  // Bottom area
  const bottomY = CARD_H - 140;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#64748B";
  ctx.font = `500 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText("Member Since", pad, bottomY);
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillText(options.memberSinceLabel || "N/A", pad, bottomY + 44);

  // QR
  const qrSize = 128;
  const qrBox = 24;
  const qrX = CARD_W - pad - qrSize - qrBox;
  const qrY = bottomY - 20;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(qrX - qrBox / 2, qrY - qrBox / 2, qrSize + qrBox, qrSize + qrBox, 16);
  ctx.fill();

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Footer bar
  const footerH = 70;
  ctx.fillStyle = accent;
  ctx.fillRect(0, CARD_H - footerH, CARD_W, footerH);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("sjamicrofoundation.com", CARD_W / 2, CARD_H - footerH / 2);

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
