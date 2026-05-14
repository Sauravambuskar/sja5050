export interface ExtractedMainUserData {
  full_name?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  blood_group?: string;
  pan_number?: string;
  aadhaar_number?: string;
  bank_name?: string;
  bank_account_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
}

export interface ExtractedNomineeData {
  full_name?: string;
  dob?: string;
  blood_group?: string;
}

export type OcrTarget = 'main_user' | 'nominee';

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'driving_license'
  | 'voter_id'
  | 'bank_passbook'
  | 'other';

export interface OcrExtractionResult {
  raw_text: string;
  document_type: DocumentType;
  main_user: ExtractedMainUserData;
  nominee: ExtractedNomineeData;
}

export const toUpperName = (name: string): string =>
  name
    .toUpperCase()
    .replace(/[^A-Z\s\-'\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const parseDate = (dateStr: string): string | undefined => {
  const ddmmyyyy = dateStr.match(/(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const yyyymmdd = dateStr.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return undefined;
};

const INDIAN_STATES = [
  'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
  'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA',
  'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM',
  'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA',
  'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL', 'DELHI', 'ANDAMAN',
  'CHANDIGARH', 'DADRA', 'DAMAN', 'JAMMU', 'KASHMIR', 'LADAKH', 'LAKSHADWEEP', 'PUDUCHERRY',
];

const BANK_NAMES = [
  'STATE BANK OF INDIA', 'PUNJAB NATIONAL BANK', 'BANK OF BARODA',
  'CANARA BANK', 'UNION BANK OF INDIA', 'HDFC BANK', 'ICICI BANK', 'AXIS BANK',
  'KOTAK MAHINDRA BANK', 'IDBI BANK', 'BANK OF INDIA', 'CENTRAL BANK OF INDIA',
  'INDIAN BANK', 'UCO BANK', 'INDIAN OVERSEAS BANK', 'ALLAHABAD BANK', 'YES BANK',
  'FEDERAL BANK', 'SOUTH INDIAN BANK', 'KARNATAKA BANK', 'BANDHAN BANK',
  'AU SMALL FINANCE BANK', 'INDUSIND BANK', 'RBL BANK', 'DCB BANK',
  'STATE BANK', 'SBI', 'PNB', 'BOB', 'BOI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'IDBI',
];

const AADHAAR_SKIP = /^(GOVERNMENT|INDIA|UNIQUE|IDENTIFICATION|AUTHORITY|AADHAAR|AADHAR|MALE|FEMALE|TRANSGENDER|DOB|DATE|YEAR|OF|BIRTH|HELP|ENROL|VALID|DOWNLOAD|DIGITALLY|SIGNED|UID|RESIDENT|ISSUE|ENROLLMENT|BIOMETRIC|MOBILE)/i;

export const detectDocumentType = (text: string): DocumentType => {
  const u = text.toUpperCase();
  if (u.includes('AADHAAR') || u.includes('AADHAR') || u.includes('UNIQUE IDENTIFICATION AUTHORITY')) return 'aadhaar';
  if (u.includes('PERMANENT ACCOUNT NUMBER') || u.includes('INCOME TAX DEPARTMENT')) return 'pan';
  if (u.includes('PASSPORT') || (u.includes('REPUBLIC OF INDIA') && u.includes('NATIONALITY'))) return 'passport';
  if (u.includes('DRIVING LICENCE') || u.includes('DRIVING LICENSE') || u.includes('MOTOR VEHICLES')) return 'driving_license';
  if (u.includes('ELECTION COMMISSION') || u.includes('ELECTORS PHOTO') || u.includes('VOTER')) return 'voter_id';
  if (u.includes('PASSBOOK') || u.includes('SAVINGS ACCOUNT') || u.includes('CURRENT ACCOUNT') || (u.includes('ACCOUNT') && u.includes('IFSC'))) return 'bank_passbook';
  return 'other';
};

export const extractFields = (text: string): OcrExtractionResult => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();
  const documentType = detectDocumentType(text);

  const result: OcrExtractionResult = {
    raw_text: text,
    document_type: documentType,
    main_user: {},
    nominee: {},
  };

  const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
  if (panMatch) result.main_user.pan_number = panMatch[0];

  const aadhaarSpaced = text.match(/[2-9]\d{3}\s\d{4}\s\d{4}/);
  if (aadhaarSpaced) {
    result.main_user.aadhaar_number = aadhaarSpaced[0].replace(/\s/g, '');
  } else {
    const aadhaarCont = text.replace(/\s/g, '').match(/[2-9]\d{11}/);
    if (aadhaarCont) result.main_user.aadhaar_number = aadhaarCont[0];
  }

  const ifscMatch = text.match(/[A-Z]{4}0[A-Z0-9]{6}/);
  if (ifscMatch) result.main_user.bank_ifsc_code = ifscMatch[0];

  const mobileMatch = text.match(/(?<!\d)[6-9]\d{9}(?!\d)/);
  if (mobileMatch) result.main_user.phone = mobileMatch[0];

  const pincodeMatch = text.match(/\b[1-9]\d{5}\b/);
  if (pincodeMatch) result.main_user.pincode = pincodeMatch[0];

  const dobLabeled = text.match(/(?:DOB|Date\s*of\s*Birth|Birth\s*Date|D\.O\.B)\s*[:\-\s]+(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i);
  if (dobLabeled) {
    const parsed = parseDate(dobLabeled[1]);
    if (parsed) { result.main_user.dob = parsed; result.nominee.dob = parsed; }
  } else {
    const yobMatch = text.match(/Year\s*of\s*Birth\s*[:\-]?\s*(\d{4})/i);
    if (yobMatch) {
      result.main_user.dob = `${yobMatch[1]}-01-01`;
      result.nominee.dob = result.main_user.dob;
    } else {
      const anyDate = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
      if (anyDate) {
        const parsed = parseDate(anyDate[0]);
        if (parsed) { result.main_user.dob = parsed; result.nominee.dob = parsed; }
      }
    }
  }

  const bloodMatch = text.match(/\b(A\+|A\-|B\+|B\-|AB\+|AB\-|O\+|O\-)\b/i);
  if (bloodMatch) {
    result.main_user.blood_group = bloodMatch[0].toUpperCase();
    result.nominee.blood_group = result.main_user.blood_group;
  }

  let extractedName: string | undefined;

  if (documentType === 'aadhaar') {
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length < 5) continue;
      if (/\d/.test(cleaned)) continue;
      if (AADHAAR_SKIP.test(cleaned)) continue;
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.length <= 5 && /^[A-Za-z\s]+$/.test(cleaned)) {
        extractedName = toUpperName(cleaned);
        break;
      }
    }
  } else if (documentType === 'pan') {
    const nameAfterLabel = text.match(/(?:Name|नाम)\s*[\n\r]?\s*([A-Za-z][A-Za-z\s]{2,49})/i);
    if (nameAfterLabel) {
      extractedName = toUpperName(nameAfterLabel[1].split('\n')[0]);
    } else {
      for (const line of lines) {
        const t = line.trim();
        if (/^[A-Z][A-Z\s]{4,39}$/.test(t) && !/^(GOVERNMENT|INCOME|TAX|PERMANENT|ACCOUNT|NUMBER|INDIA|DEPARTMENT|SIGNATURE)/.test(t)) {
          extractedName = t;
          break;
        }
      }
    }
  } else if (documentType === 'bank_passbook') {
    const holderMatch = text.match(/(?:Account\s*Holder(?:\s*Name)?|A\/C\s*(?:Name|Holder)|Customer\s*Name|Name)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,59})/i);
    if (holderMatch) {
      extractedName = toUpperName(holderMatch[1].split('\n')[0]);
      result.main_user.bank_account_holder_name = extractedName;
    }
  } else {
    const nameMatch = text.match(/(?:Name|नाम)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,59})/i);
    if (nameMatch) extractedName = toUpperName(nameMatch[1].split('\n')[0]);
  }

  if (extractedName) {
    result.main_user.full_name = extractedName;
    result.nominee.full_name = extractedName;
  }

  if (documentType === 'bank_passbook') {
    const accMatch = text.match(/(?:Account\s*(?:No|Number|Num)[\.:]?|A\/C\s*No[\.:]?|Acct\s*No[\.:]?)\s*([0-9]{9,18})/i);
    if (accMatch) result.main_user.bank_account_number = accMatch[1];

    for (const bn of BANK_NAMES) {
      if (upper.includes(bn)) {
        result.main_user.bank_name = bn;
        break;
      }
    }
    if (!result.main_user.bank_name) {
      for (const line of lines) {
        if (/bank/i.test(line) && line.length < 80) {
          result.main_user.bank_name = line.toUpperCase();
          break;
        }
      }
    }
  }

  const addrLabelMatch = text.match(/(?:Address|Addr|पता)\s*[:\-]?\s*([\s\S]{5,300}?)(?=\n\n|\n[A-Z][a-z]|\d{6}|$)/i);
  if (addrLabelMatch) {
    const addr = addrLabelMatch[1].replace(/\n/g, ', ').replace(/,\s*,/g, ',').trim();
    if (addr.length > 5) result.main_user.address = addr.substring(0, 255).toUpperCase();
  } else {
    const relMatch = text.match(/(?:S\/O|D\/O|W\/O|C\/O)\s*([^\n]+)/i);
    if (relMatch) result.main_user.address = relMatch[0].toUpperCase();
  }

  for (const state of INDIAN_STATES) {
    if (upper.includes(state)) {
      result.main_user.state = state;
      break;
    }
  }

  return result;
};

export const renderPdfPageToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d')!;
  await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
  return canvas;
};

export const preprocessCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const c = gray < 128 ? Math.max(0, gray - 40) : Math.min(255, gray + 40);
    data[i] = c; data[i + 1] = c; data[i + 2] = c;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const runOcrOnFile = async (
  file: File,
  onProgress: (progress: number) => void,
  preprocess = true,
): Promise<string> => {
  const Tesseract = await import('tesseract.js');
  let imageSource: HTMLCanvasElement | string;

  if (file.type === 'application/pdf') {
    const canvas = await renderPdfPageToCanvas(file);
    imageSource = preprocess ? preprocessCanvas(canvas) : canvas;
  } else {
    const blobUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = blobUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    imageSource = preprocess ? preprocessCanvas(canvas) : canvas;
    URL.revokeObjectURL(blobUrl);
  }

  const result = await Tesseract.recognize(imageSource, 'eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return result.data.text;
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  driving_license: 'Driving License',
  voter_id: 'Voter ID',
  bank_passbook: 'Bank Passbook / Cheque',
  other: 'Other Document',
};
