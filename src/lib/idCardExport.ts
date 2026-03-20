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
// Increased from 540 → 600 to fit all four info fields (phone, email, DOB, KYC)
// without cramping the "Member Since" section.
const CARD_H = 600;

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

function fitTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialPx: number,
  minPx: number,
  weight = 800,
) {
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
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";
}

function circleAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  r: number,
  fallbackText: string,
) {
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
  const headerH = 120;
  const footerH = 62;
  const footerY = CARD_H - footerH;

  // Shared font stack used throughout this renderer
  const FONT = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";

  // Header bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_W, headerH);

  // Logo (left)
  const logoBox = 78;
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
  const companyFont = fitTextToWidth(ctx, company, companyMaxW, 50, 28, 900);
  ctx.font = `900 ${companyFont}px ${FONT}`;
  ctx.fillText(company, companyRightX, headerH / 2);

  // Body panel (white)
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fillRect(0, headerH, CARD_W, footerY - headerH);

  // Avatar
  const avatarR = 56;
  const avatarCx = pad + avatarR;
  const avatarCy = headerH + 28;
  circleAvatar(ctx, avatarImg, avatarCx, avatarCy, avatarR, initials(options.profile.full_name));

  // Text content
  const contentX = pad;

  // Fixed y-positions so sections never overlap.
  const nameY = headerH + 140;
  const memberIdY = nameY + 44;

  // Full name
  const name = (options.profile.full_name || "").trim();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1E3A8A";
  const nameMaxW = CARD_W - pad * 2;
  const nameSize = fitTextToWidth(ctx, name, nameMaxW, 54, 34, 900);
  ctx.font = `900 ${nameSize}px ${FONT}`;
  ctx.fillText(name, contentX, nameY);

  // Member ID line
  const memberId = String(options.profile.member_id || "");
  ctx.fillStyle = "#64748B";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("Member ID:", contentX, memberIdY);
  ctx.fillStyle = "#0F172A";
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(memberId, contentX + 160, memberIdY);

  // ── 2-column info grid (Phone | Email, DOB | KYC) ────────────────────
  // Mirrors the 2-column layout shown in the UI preview card.
  const gridStartY = memberIdY + 54;  // first row baseline
  const gridRowH   = 50;              // pixels between row baselines
  const col1X      = pad;             // left column x
  const col2X      = Math.round(CARD_W / 2) + 20;  // right column x (≈ 448)
  const maxColValW = col2X - col1X - 90; // max value width before truncation

  // QR (right side, vertically spanning the grid + bottom area)
  const qrSize   = 100;
  const qrBoxPad = 12;
  const qrX      = CARD_W - pad - qrSize;    // 712
  const qrY      = gridStartY - 16;           // align top of QR with first grid row

  // Helper: draw a single "label: value" field with a colored bullet.
  const drawField = (
    x: number,
    y: number,
    label: string,
    value: string,
    bulletColor: string,
  ) => {
    const bulletR = 8;
    // Bullet
    ctx.fillStyle = bulletColor;
    ctx.beginPath();
    ctx.arc(x + bulletR, y - bulletR + 1, bulletR, 0, Math.PI * 2);
    ctx.fill();

    const textX = x + bulletR * 2 + 10;

    // Label (muted)
    ctx.fillStyle = "#64748B";
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const labelStr = `${label}: `;
    ctx.fillText(labelStr, textX, y);
    const labelW = ctx.measureText(labelStr).width;

    // Value (bold, dark) — truncate if too wide
    ctx.fillStyle = "#0F172A";
    ctx.font = `800 24px ${FONT}`;
    const availW = maxColValW - labelW;
    let val = value;
    if (ctx.measureText(val).width > availW) {
      while (val.length > 1 && ctx.measureText(val + "…").width > availW) {
        val = val.slice(0, -1);
      }
      val += "…";
    }
    ctx.fillText(val, textX + labelW, y);
  };

  // Row 1: Phone (col1) | Email (col2)
  drawField(col1X, gridStartY,           "Phone", String(options.profile.phone || "N/A"), "#2563EB");
  drawField(col2X, gridStartY,           "Email", String(options.email         || "N/A"), "#16A34A");

  // Row 2: DOB (col1) | KYC badge (col2)
  const dobRaw = options.profile.dob;
  let dobText = "N/A";
  if (dobRaw) {
    try {
      const d = new Date(dobRaw);
      dobText = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      dobText = dobRaw.substring(0, 10);
    }
  }
  drawField(col1X, gridStartY + gridRowH, "DOB",   dobText,                               "#EA580C");

  // KYC badge (col2, row 2) — pill badge matching the UI Badge component
  const kyc      = String(options.profile.kyc_status || "N/A");
  const kycText  = `KYC: ${kyc}`;
  const badgePadX = 18;
  const badgeH    = 42;
  ctx.font = `800 22px ${FONT}`;
  const kycTextW  = ctx.measureText(kycText).width;
  const badgeW    = clamp(kycTextW + badgePadX * 2, 160, 300);
  const badgeX    = col2X;
  const badgeMidY = gridStartY + gridRowH - 4;          // visual center aligned with row 2

  ctx.fillStyle = "#EEF2FF";
  roundedRectPath(ctx, badgeX, badgeMidY - badgeH / 2, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.fillStyle = "#3730A3";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(kycText, badgeX + badgePadX, badgeMidY);

  // ── Bottom block: Member Since (left) + QR (right) ────────────────────
  const bottomLabelY = footerY - 104;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#64748B";
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText("Member Since", pad, bottomLabelY);

  ctx.fillStyle = "#0F172A";
  ctx.font = `900 30px ${FONT}`;
  ctx.fillText(options.memberSinceLabel || "N/A", pad, bottomLabelY + 40);

  // QR box (white rounded square)
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
  ctx.font = `900 30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("sjamicrofoundation.com", CARD_W / 2, footerY + footerH / 2);

  return canvas.toDataURL("image/png");
}

export async function renderIdCardToPdfBlob(options: ExportOptions) {
  const png = await renderIdCardToPngDataUrl(options);

  // Scale PDF page to match the canvas aspect ratio (CARD_W × CARD_H).
  // Width stays at credit-card width (85.6 mm); height is derived proportionally.
  const cardWidthMM  = 85.6;
  const cardHeightMM = Math.round((cardWidthMM * CARD_H) / CARD_W * 100) / 100; // ≈ 58.0 mm

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [cardWidthMM, cardHeightMM],
  });

  doc.addImage(png, "PNG", 0, 0, cardWidthMM, cardHeightMM);
  return doc.output("blob");
}