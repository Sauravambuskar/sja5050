import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad from '@/components/profile/SignaturePad';
import SignatureCanvas from 'react-signature-canvas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import { Download, FileText, Loader2, CheckCircle, Clock } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { Separator } from '@/components/ui/separator';
import { fetchMyAgreementDynamicFields } from '@/lib/agreements';
import { InvestmentAgreement } from '@/types/database';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { generateAgreementPdf } from '@/lib/agreementPdfTemplate';
import { uploadAgreementPdf, createAgreementPdfSignedUrl } from '@/lib/agreementPdfStorage';
import { generateQrPngDataUrl } from '@/lib/qrDataUrl';
import { useProfile } from '@/hooks/useProfile';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { numberToWordsIN } from '@/lib/numberToWordsIN';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { downloadQrCodeCanvas } from '@/lib/downloadQrCode';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QRCode from 'qrcode';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Fixed agreement content template fallback (body).
// Admin can override this in System Management.
const FALLBACK_TEMPLATE = `
This Agreement is made on {{agreement_date}} between:

First Party: {{first_party_name}}
Second Party: {{second_party_name}}

WHEREAS, the Second Party has invested an amount of INR {{invested_amount}} with the First Party on the investment date mentioned above.

1. The Second Party confirms that the investment is made voluntarily and with full understanding of the associated risks.
2. The First Party will manage the invested funds in accordance with the platform rules and applicable regulations.
3. The parties acknowledge that returns (if any) are subject to market and operational risks.
4. Confidentiality: Both parties agree to keep non-public information confidential.
5. This Agreement is legally binding once digitally signed by both parties.

IN WITNESS WHEREOF, the parties have signed this Agreement digitally on the date mentioned above.
`;

const FALLBACK_LOGO_URL = 'https://i.ibb.co/Jjq5fZbM/sja-pnggg.png';

const renderTemplate = (template: string, vars: Record<string, string>) => {
  return template.replace(/\{\{(.*?)\}\}/g, (_, keyRaw) => {
    const key = String(keyRaw).trim();
    return vars[key] ?? '';
  });
};

function normalizeAgreementTextForDisplay(input: string) {
  // Prevent overflow + fix common copy/paste artifacts from PDF/Word.
  // - Keep line breaks.
  // - Collapse excessive spacing.
  // - Repair "spaced letters" lines like "T h e L e n d e r".
  // - Repair "spaced numbers" like "1 7,50,000".
  const fixSpacedLetters = (line: string) => {
    // Join sequences of single letters separated by spaces: "T h e" => "The"
    return line.replace(/\b(?:[A-Za-z]\s){3,}[A-Za-z]\b/g, (m) => m.replace(/\s+/g, ""));
  };

  const fixSpacedNumbers = (line: string) => {
    // Join sequences of digits separated by spaces: "1 7 5 0 0" => "17500"
    let out = line.replace(/\b(?:\d\s){3,}\d\b/g, (m) => m.replace(/\s+/g, ""));

    // Also remove spaces between digits when separated by punctuation used in amounts
    // e.g. "1 7,50,000" => "17,50,000"
    out = out.replace(/(?<=\d)\s+(?=[\d,])/g, "");
    out = out.replace(/(?<=[\d,])\s+(?=\d)/g, "");

    return out;
  };

  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00A0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trimEnd())
    .map(fixSpacedLetters)
    .map(fixSpacedNumbers)
    .join("\n");
}

const userDetailsSchema = z.object({
  full_name: z.string().optional().or(z.literal('')),
  residential_address: z.string().min(5, 'Address is required.'),
  contact_number: z.string().min(8, 'Contact number is required.'),
  email_address: z.string().email('Valid email is required.').optional().or(z.literal('')),

  // IMPORTANT: users sign BEFORE investing, so the agreement amount must be provided here.
  investment_amount: z.coerce
    .number({ invalid_type_error: 'Investment amount is required.' })
    .positive('Investment amount must be greater than 0.'),

  aadhaar_number: z.string().optional().or(z.literal('')),
  pan_number: z.string().optional().or(z.literal('')),
  nominee_name: z.string().optional().or(z.literal('')),
  nominee_identification: z.string().optional().or(z.literal('')),
});

type UserDetailsFormValues = z.infer<typeof userDetailsSchema>;

const fetchAgreement = async (userId: string): Promise<InvestmentAgreement | null> => {
  const { data, error } = await supabase
    .from('investment_agreements')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as InvestmentAgreement) ?? null;
};

const saveAgreement = async (params: {
  userId: string;
  signatureDataUrl: string;
  agreementText: string;
  firstPartyName: string;
  secondPartyName: string;
  investmentDate: string;
  investedAmount: number;
  userInvestmentId: string | null;
  filledFields: Record<string, any>;
  referenceNumber: string;
  documentHash: string;
  userPdfPath: string;
}) => {
  const {
    userId,
    signatureDataUrl,
    agreementText,
    firstPartyName,
    secondPartyName,
    investmentDate,
    investedAmount,
    userInvestmentId,
    filledFields,
    referenceNumber,
    documentHash,
    userPdfPath,
  } = params;

  // IMPORTANT: upsert on user_id (uq_user_agreement) to avoid duplicate key errors
  const { error } = await supabase
    .from('investment_agreements')
    .upsert(
      {
        user_id: userId,
        signature_data_url: signatureDataUrl,
        agreement_text: agreementText,
        first_party_name: firstPartyName,
        second_party_name: secondPartyName,
        investment_date: investmentDate,
        invested_amount: investedAmount,
        user_investment_id: userInvestmentId,
        status: 'user_signed',
        filled_fields: filledFields,
        reference_number: referenceNumber,
        document_hash: documentHash,
        user_pdf_path: userPdfPath,
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
};

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

const Agreement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [includeQr, setIncludeQr] = useState(true);

  const { settings, isLoading: isSettingsLoading } = useSystemSettings();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  const {
    data: dynamicFields,
    isLoading: isDynamicLoading,
  } = useQuery({
    queryKey: ['agreementDynamicFields', user?.id],
    queryFn: fetchMyAgreementDynamicFields,
    enabled: !!user,
    // fetchMyAgreementDynamicFields never throws — it returns a safe fallback on error
    retry: false,
  });

  const { data: agreementRow, isLoading } = useQuery({
    queryKey: ['investmentAgreement', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

  // Keep the agreement live: if profile/investments/system settings change, refresh dynamic fields.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`agreement-live-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
          queryClient.invalidateQueries({ queryKey: ['agreementDynamicFields', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['myProfile'] });
          queryClient.invalidateQueries({ queryKey: ['agreementDynamicFields', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_investments', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['agreementDynamicFields', user.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const brandLogoUrl = settings?.login_page_logo_url || FALLBACK_LOGO_URL;
  const templateText = (settings?.investment_agreement_text || '').trim() || FALLBACK_TEMPLATE;

  // Always build a complete set of dynamic fields so agreement generation never fails.
  // Priority: RPC result > profile data > settings > sensible defaults.
  const effectiveDynamicFields = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      first_party_name: String(
        dynamicFields?.first_party_name ||
        settings?.agreement_first_party_name ||
        'SJA Foundation'
      ).trim(),
      second_party_name: String(
        dynamicFields?.second_party_name ||
        profile?.full_name ||
        ''
      ).trim(),
      investment_date: dynamicFields?.investment_date || today,
      invested_amount: Number(dynamicFields?.invested_amount || 0),
      user_investment_id: dynamicFields?.user_investment_id ?? null,
    };
  }, [dynamicFields, profile, settings]);

  const detailsForm = useForm<UserDetailsFormValues>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      full_name: '',
      residential_address: '',
      contact_number: '',
      email_address: user?.email || '',
      investment_amount: 0,
      aadhaar_number: '',
      pan_number: '',
      nominee_name: '',
      nominee_identification: '',
    },
  });

  useEffect(() => {
    if (agreementRow) return; // don't override if already signed

    const maybeAmountFromDb = Number(effectiveDynamicFields.invested_amount ?? 0);

    detailsForm.reset({
      full_name: String(profile?.full_name || effectiveDynamicFields.second_party_name || '').trim(),
      residential_address: String(profile?.address || '').trim(),
      contact_number: String(profile?.phone || '').trim(),
      email_address: user?.email || '',
      investment_amount: maybeAmountFromDb > 0 ? maybeAmountFromDb : 0,
      aadhaar_number: String(profile?.aadhaar_number || '').trim(),
      pan_number: String(profile?.pan_number || '').trim(),
      nominee_name: '',
      nominee_identification: '',
    });
  }, [agreementRow, detailsForm, profile, effectiveDynamicFields, user?.email, user?.id]);

  const watchedFullName = detailsForm.watch('full_name');
  const [watchedInvestmentAmount, watchedAadhaar, watchedPan, watchedNominee, watchedNomineeId] =
    detailsForm.watch([
      'investment_amount',
      'aadhaar_number',
      'pan_number',
      'nominee_name',
      'nominee_identification',
    ]);

  const liveVars = useMemo(() => {
    const amountNum = Number(watchedInvestmentAmount || 0) || Number(effectiveDynamicFields.invested_amount || 0) || 0;

    const secondPartyName = String(
      agreementRow?.second_party_name || watchedFullName || effectiveDynamicFields.second_party_name || ''
    ).trim();

    const investDate = new Date(effectiveDynamicFields.investment_date);
    const agreement_day = String(investDate.getDate());
    const agreement_month = format(investDate, 'MMMM');
    const agreement_year = String(investDate.getFullYear());

    const lender_aadhaar = String(watchedAadhaar || profile?.aadhaar_number || '').trim();
    const lender_pan = String(watchedPan || profile?.pan_number || '').trim();
    const nominee = String(watchedNominee || '').trim();
    const nominee_identification = String(watchedNomineeId || '').trim();

    // Borrower IDs are not stored in user profile; keep blank if not configured.
    const borrower_aadhaar = '';
    const borrower_pan = '';

    const invested_amount = amountNum.toLocaleString('en-IN');
    const invested_amount_words = amountNum > 0 ? numberToWordsIN(amountNum) : '';

    return {
      first_party_name: effectiveDynamicFields.first_party_name,
      second_party_name: secondPartyName,
      agreement_date: format(investDate, 'PPP'),
      agreement_day,
      agreement_month,
      agreement_year,
      invested_amount,
      invested_amount_words,
      lender_aadhaar,
      lender_pan,
      borrower_aadhaar,
      borrower_pan,
      nominee,
      nominee_identification,
    };
  }, [
    effectiveDynamicFields,
    profile,
    agreementRow?.second_party_name,
    watchedFullName,
    watchedInvestmentAmount,
    watchedAadhaar,
    watchedPan,
    watchedNominee,
    watchedNomineeId,
  ]);

  // If a user already signed, show the LATEST template text, but fill with the SIGNED snapshot values.
  const displayVars = useMemo(() => {
    if (!agreementRow) return liveVars;

    const investDate = agreementRow.investment_date ? new Date(agreementRow.investment_date) : new Date();
    const filled: any = agreementRow.filled_fields || {};

    const investedAmountNum = Number(agreementRow.invested_amount ?? 0);

    return {
      first_party_name: String(agreementRow.first_party_name || liveVars.first_party_name || '').trim(),
      second_party_name: String(agreementRow.second_party_name || '').trim(),
      agreement_date: format(investDate, 'PPP'),
      agreement_day: String(investDate.getDate()),
      agreement_month: format(investDate, 'MMMM'),
      agreement_year: String(investDate.getFullYear()),
      invested_amount: investedAmountNum.toLocaleString('en-IN'),
      invested_amount_words: String(
        filled.invested_amount_words || (investedAmountNum ? numberToWordsIN(investedAmountNum) : '')
      ).trim(),
      lender_aadhaar: String(filled.lender_aadhaar || '').trim(),
      lender_pan: String(filled.lender_pan || '').trim(),
      borrower_aadhaar: '',
      borrower_pan: '',
      nominee: String(filled.nominee || '').trim(),
      nominee_identification: String(filled.nominee_identification || '').trim(),
    };
  }, [agreementRow, liveVars]);

  const renderedAgreementText = useMemo(() => {
    return renderTemplate(templateText, displayVars);
  }, [templateText, displayVars]);

  const renderedAgreementTextForDisplay = useMemo(
    () => normalizeAgreementTextForDisplay(renderedAgreementText),
    [renderedAgreementText]
  );

  const pdfTemplateUrl = (settings?.agreement_pdf_template_url || '/agreement-templates/PGS_2.pdf').trim();
  const pdfFieldMap = (settings?.agreement_pdf_field_map || {}) as any;

  const missingDynamicRequirements = useMemo(() => {
    const missing: string[] = [];

    // User-provided loan/investment amount is required for agreement.
    const amt = Number(watchedInvestmentAmount || 0);
    if (!(amt > 0)) missing.push('Investment amount');

    const dateOk = !Number.isNaN(new Date(effectiveDynamicFields.investment_date).getTime());
    if (!dateOk) missing.push('Agreement date');

    return missing;
  }, [effectiveDynamicFields, watchedInvestmentAmount]);

  const mutation = useMutation({
    mutationFn: saveAgreement,
    onSuccess: () => {
      toast.success('Agreement signed and saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['investmentAgreement', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['investmentAgreementCheck', user?.id] });
    },
    onError: (error) => {
      toast.error(`Failed to save agreement: ${error.message}`);
    },
  });

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleDownloadQr = useCallback(() => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      toast.error('QR code not available.');
      return;
    }
    const refPart = agreementRow?.reference_number || agreementRow?.id?.substring(0, 8) || 'code';
    downloadQrCodeCanvas(canvas, `Agreement_QR_${refPart}`);
  }, [agreementRow?.reference_number, agreementRow?.id]);
  const buildPublicPayload = (params: {
    referenceNumber: string;
    firstPartyName: string;
    secondPartyName: string;
    investmentDate: string;
    investedAmount: number;
    status: string;
    documentHash?: string;
  }) => {
    return {
      agreement_name: 'Investment Agreement',
      reference_number: params.referenceNumber,
      first_party_name: params.firstPartyName,
      second_party_name: params.secondPartyName,
      investment_date: params.investmentDate,
      invested_amount: params.investedAmount,
      status: params.status,
      document_hash: params.documentHash || '',
      generated_at: new Date().toISOString(),
    };
  };

  const handleSaveSignature = async () => {
    if (!user) return;

    if (missingDynamicRequirements.length) {
      toast.error(`Missing required agreement data: ${missingDynamicRequirements.join(', ')}`);
      return;
    }

    const detailsValid = await detailsForm.trigger();
    if (!detailsValid) {
      toast.error('Please fill the required details.');
      return;
    }

    if (sigCanvas.current?.isEmpty()) {
      toast.error('Please provide your signature.');
      return;
    }

    const details = detailsForm.getValues();
    const amountNum = Number(details.investment_amount || 0);

    const signatureDataUrl = sigCanvas.current?.toDataURL('image/png') ?? '';

    // Build filled fields snapshot (immutable for this agreement)
    const referenceNumber = `SJA-AGR-${user.id.slice(0, 6).toUpperCase()}-${Date.now()}`;

    const governmentIdDetails = [
      details.aadhaar_number ? `Aadhaar: ${details.aadhaar_number}` : '',
      details.pan_number ? `PAN: ${details.pan_number}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const filledFields = {
      full_name: details.full_name,
      residential_address: details.residential_address,
      contact_number: details.contact_number,
      email_address: details.email_address || user.email || '',
      government_id_details: governmentIdDetails,
      business_name_if_applicable: '',

      nominee: details.nominee_name || '',
      nominee_identification: details.nominee_identification || '',

      // These are used for the PDF template placeholders
      lender_aadhaar: details.aadhaar_number || '',
      lender_pan: details.pan_number || '',

      organization_name: 'SJA Foundation (Sariputra Wankhade Foundation)',
      authorized_signatory_name: effectiveDynamicFields.first_party_name,
      agreement_execution_date: format(new Date(), 'PPP'),
      unique_agreement_reference_number: referenceNumber,
      registered_office_address: '',
      official_contact_details: '',

      invested_amount_words: numberToWordsIN(amountNum),
    };

    // Generate user-signed PDF from the original template (no clause modifications)
    
    // Ensure an agreement row exists and get a stable id for storage paths.
    let agreementId = agreementRow?.id;
    if (!agreementId) {
      const { data: idRow, error: idErr } = await supabase
        .from('investment_agreements')
        .upsert(
          {
            user_id: user.id,
            agreement_text: renderedAgreementText,
            signature_data_url: signatureDataUrl,
            first_party_name: effectiveDynamicFields.first_party_name,
            second_party_name: details.full_name,
            investment_date: effectiveDynamicFields.investment_date,
            invested_amount: amountNum,
            user_investment_id: effectiveDynamicFields.user_investment_id,
            status: 'user_signed',
            filled_fields: filledFields,
            reference_number: referenceNumber,
          },
          { onConflict: 'user_id' }
        )
        .select('id')
        .single();

      if (idErr) {
        toast.error(idErr.message);
        return;
      }
      agreementId = (idRow as { id: string }).id;
    }

    if (!agreementId) {
      toast.error('Failed to retrieve agreement ID.');
      return;
    }

    // Optional QR verification: generate a public token and embed QR in the PDF.
    let qrDataUrl: string | undefined;
    try {
      if (includeQr) {
        const payload = buildPublicPayload({
          referenceNumber,
          firstPartyName: effectiveDynamicFields.first_party_name,
          secondPartyName: details.full_name,
          investmentDate: effectiveDynamicFields.investment_date,
          investedAmount: amountNum,
          status: 'user_signed',
        });

        const { data: token, error: tokenErr } = await supabase.rpc('upsert_agreement_public_view', {
          p_agreement_id: agreementId,
          p_payload: payload,
        });
        if (tokenErr) throw tokenErr;

        const verifyUrl = `${window.location.origin}/verify-agreement/${token}`;
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate verification QR.');
      return;
    }

    // Generate user-signed PDF from the original template
    let pdfBytes: Uint8Array;
    let hash: string;
    try {
      const out = await generateAgreementPdf({
        templateUrl: pdfTemplateUrl,
        fieldMap: pdfFieldMap,
        textValues: filledFields,
        images: {
          user_signature: { dataUrl: signatureDataUrl },
        },
        qrCode: qrDataUrl
          ? {
              dataUrl: qrDataUrl,
              date: format(new Date(), 'PPP'),
              label: 'Scan to verify agreement',
            }
          : undefined,
      });
      pdfBytes = out.pdfBytes;
      hash = out.hash;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate agreement PDF.');
      return;
    }

    let userPdfPath = '';
    try {
      userPdfPath = await uploadAgreementPdf({ userId: user.id, agreementId, kind: 'user', pdfBytes });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload agreement PDF.');
      return;
    }

    // Update the public payload with the final PDF hash.
    if (includeQr) {
      try {
        const payload = buildPublicPayload({
          referenceNumber,
          firstPartyName: effectiveDynamicFields.first_party_name,
          secondPartyName: details.full_name,
          investmentDate: effectiveDynamicFields.investment_date,
          investedAmount: amountNum,
          status: 'user_signed',
          documentHash: hash,
        });

        await supabase.rpc('upsert_agreement_public_view', {
          p_agreement_id: agreementId,
          p_payload: payload,
        });
      } catch {
        // ignore (QR still works; hash just won't display)
      }
    }

    mutation.mutate({
      userId: user.id,
      signatureDataUrl,
      agreementText: renderedAgreementText,
      firstPartyName: effectiveDynamicFields.first_party_name,
      secondPartyName: details.full_name,
      investmentDate: effectiveDynamicFields.investment_date,
      investedAmount: amountNum,
      userInvestmentId: effectiveDynamicFields.user_investment_id,
      filledFields,
      referenceNumber,
      documentHash: hash,
      userPdfPath,
    });
  };

  const handleDownloadPdfWithQr = async () => {
    if (!agreementRow) {
      toast.error('Agreement data not available.');
      return;
    }

    // Validate that required fields are present in the agreement
    const fullName = agreementRow.second_party_name || (agreementRow.filled_fields as any)?.full_name;
    if (!fullName || fullName.trim().length < 2) {
      toast.error('Full name is missing in the agreement. Please contact support.');
      return;
    }

    const filledFields = (agreementRow.filled_fields || {}) as Record<string, string>;

    try {
      const payload = buildPublicPayload({
        referenceNumber: String(agreementRow.reference_number || ''),
        firstPartyName: String(agreementRow.first_party_name || ''),
        secondPartyName: String(fullName),
        investmentDate: String(agreementRow.investment_date || ''),
        investedAmount: Number(agreementRow.invested_amount || 0),
        status: String(agreementRow.status || ''),
        documentHash: String(agreementRow.document_hash || ''),
      });

      const { data: token, error: tokenErr } = await supabase.rpc('upsert_agreement_public_view', {
        p_agreement_id: agreementRow.id,
        p_payload: payload,
      });
      if (tokenErr) throw tokenErr;

      const verifyUrl = `${window.location.origin}/verify-agreement/${token}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 });

      const out = await generateAgreementPdf({
        templateUrl: pdfTemplateUrl,
        fieldMap: pdfFieldMap,
        textValues: filledFields,
        images: {
          user_signature: { dataUrl: agreementRow.signature_data_url },
        },
        qrCode: { dataUrl: qrDataUrl, date: format(new Date(), 'PPP'), label: 'Scan to verify agreement' },
      });

      const blob = new Blob([out.pdfBytes as unknown as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate QR PDF.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!agreementRow || !user) {
      toast.error('Agreement data not available.');
      return;
    }

    // Validate that required fields are present in the agreement
    const fullName = agreementRow.second_party_name || (agreementRow.filled_fields as any)?.full_name;
    if (!fullName || fullName.trim().length < 2) {
      toast.error('Full name is missing in the agreement. Please contact support.');
      return;
    }

    // Prefer template-based PDF if present
    if (agreementRow.pdf_path) {
      const url = await createAgreementPdfSignedUrl(agreementRow.pdf_path);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (agreementRow.user_pdf_path) {
      const url = await createAgreementPdfSignedUrl(agreementRow.user_pdf_path);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback to text-based PDF
    const muted = { r: 241, g: 245, b: 249 }; // slate-100
    const border = { r: 226, g: 232, b: 240 }; // slate-200

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const loadImageAsDataUrl = async (url: string) => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await blobToDataUrl(blob);
      } catch {
        return null;
      }
    };

    const imageFormatFromDataUrl = (dataUrl: string): 'PNG' | 'JPEG' => {
      if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
      return 'PNG';
    };

    const addHeader = async (pageTitle: string) => {
      const logoDataUrl = await loadImageAsDataUrl(brandLogoUrl);
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, imageFormatFromDataUrl(logoDataUrl), margin, 6, 16, 16);
        } catch {
          // ignore
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text(pageTitle, margin + 20, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Digitally signed agreement', margin + 20, 21);

      doc.setDrawColor(border.r, border.g, border.b);
      doc.line(margin, 24, pageWidth - margin, 24);
      doc.setTextColor(17, 24, 39);
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, margin, pageHeight - 8);
      doc.setTextColor(17, 24, 39);
    };

    const ensureSpace = async (y: number, requiredHeight: number) => {
      if (y + requiredHeight <= pageHeight - 18) return y;
      doc.addPage();
      await addHeader('Investment Agreement');
      return 30;
    };

    const renderAgreementBody = async (text: string, startY: number) => {
      let y = startY;
      const maxWidth = pageWidth - margin * 2;
      const lineH = 5;

      // Preserve line breaks & indentation exactly as entered.
      // Only wrap when a single line exceeds page width.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);

      const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');

      const wrapLine = (raw: string) => {
        const line = raw.replace(/\t/g, '    ');
        const prefixMatch = line.match(/^\s*(?:•|-|\d+(?:\.\d+)*\)|\d+(?:\.\d+)*\.)\s+/);
        const leadingSpaces = line.match(/^\s+/)?.[0] ?? '';

        if (prefixMatch) {
          const prefix = prefixMatch[0];
          const rest = line.slice(prefix.length);
          const prefixW = doc.getTextWidth(prefix);
          const available = Math.max(10, maxWidth - prefixW);
          const wrapped = doc.splitTextToSize(rest, available);
          return { kind: 'prefix' as const, prefix, prefixW, wrapped };
        }

        if (leadingSpaces) {
          const rest = line.slice(leadingSpaces.length);
          const indentW = doc.getTextWidth(leadingSpaces);
          const available = Math.max(10, maxWidth - indentW);
          const wrapped = rest ? doc.splitTextToSize(rest, available) : [''];
          return { kind: 'indent' as const, indentW, wrapped };
        }

        const wrapped = doc.splitTextToSize(line, maxWidth);
        return { kind: 'plain' as const, wrapped };
      };

      for (const raw of lines) {
        if (raw.trim() === '') {
          y = await ensureSpace(y, lineH);
          y += lineH; // keep blank line
          continue;
        }

        const w = wrapLine(raw);

        if (w.kind === 'prefix') {
          for (let i = 0; i < w.wrapped.length; i++) {
            y = await ensureSpace(y, lineH);
            if (i === 0) doc.text(w.prefix, margin, y);
            doc.text(String(w.wrapped[i]), margin + w.prefixW, y);
            y += lineH;
          }
          continue;
        }

        if (w.kind === 'indent') {
          for (const part of w.wrapped) {
            y = await ensureSpace(y, lineH);
            doc.text(String(part), margin + w.indentW, y);
            y += lineH;
          }
          continue;
        }

        for (const part of w.wrapped) {
          y = await ensureSpace(y, lineH);
          doc.text(String(part), margin, y);
          y += lineH;
        }
      }

      return y;
    };

    await addHeader('Investment Agreement');
    let y = 30;

    // Summary box
    doc.setDrawColor(border.r, border.g, border.b);
    doc.setFillColor(muted.r, muted.g, muted.b);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Agreement Details', margin + 4, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    const signedAt = agreementRow.signed_at ? format(new Date(agreementRow.signed_at), 'PPP p') : 'N/A';
    doc.text(`First Party: ${agreementRow.first_party_name || ''}`, margin + 4, y + 16);
    doc.text(`Second Party: ${fullName || user.email || ''}`, margin + 4, y + 22);
    doc.text(
      `Agreement Date: ${agreementRow.investment_date ? format(new Date(agreementRow.investment_date), 'PPP') : ''}`,
      margin + 4,
      y + 28
    );
    doc.text(`Invested Amount: INR ${(agreementRow.invested_amount ?? 0).toLocaleString('en-IN')}`, margin + 4, y + 34);

    y += 44;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Agreement', margin, y);
    y += 7;

    y = await renderAgreementBody(renderedAgreementText, y);

    y += 2;
    y = await ensureSpace(y, 55);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Investor Signature', margin, y);
    y += 6;

    doc.setDrawColor(border.r, border.g, border.b);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Signed at: ${signedAt}`, margin + 4, y + 8);

    try {
      doc.addImage(
        agreementRow.signature_data_url,
        agreementRow.signature_data_url?.startsWith('data:image/jpeg') || agreementRow.signature_data_url?.startsWith('data:image/jpg')
          ? 'JPEG'
          : 'PNG',
        margin + 4,
        y + 12,
        70,
        24
      );
    } catch {
      doc.setTextColor(148, 163, 184);
      doc.text('(Signature image not available)', margin + 4, y + 22);
      doc.setTextColor(51, 65, 85);
    }

    y += 48;

    // QR Code section at the bottom of the agreement
    const qrPageUrl = agreementRow.reference_number || agreementRow.id
      ? `${window.location.origin}/agreement?ref=${agreementRow.reference_number || agreementRow.id}`
      : '';

    if (qrPageUrl) {
      y = await ensureSpace(y, 52);
      y += 4;

      doc.setDrawColor(border.r, border.g, border.b);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('Agreement QR Code', margin, y);
      y += 6;

      try {
        const qrImgDataUrl = await generateQrPngDataUrl({ value: qrPageUrl, size: 200, level: 'M' });
        doc.addImage(qrImgDataUrl, 'PNG', margin, y, 36, 36);
      } catch {
        // non-fatal
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const qrLabelX = margin + 40;
      doc.text(
        `QR Date: ${agreementRow.signed_at ? format(new Date(agreementRow.signed_at), 'PPP') : format(new Date(), 'PPP')}`,
        qrLabelX,
        y + 8
      );
      doc.text('Scan to view and verify this agreement', qrLabelX, y + 16);
      y += 40;
    }
    y += 44;

    // QR Code section
    const qrUrl = `${window.location.origin}/agreement?ref=${agreementRow.reference_number || agreementRow.id}`;
    try {
      const qrDataUrl = await generateQrPngDataUrl({ value: qrUrl, size: 128, level: 'M' });
      y = await ensureSpace(y, 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Agreement QR Code', margin, y);
      y += 6;
      doc.addImage(qrDataUrl, 'PNG', margin, y, 36, 36);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(qrUrl, margin + 40, y + 8, { maxWidth: pageWidth - margin * 2 - 44 });
      y += 40;
    } catch {
      // Skip QR code if generation fails
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`Investment_Agreement_${user.id.substring(0, 8)}.pdf`);
  };

  const downloadUserPdf = async () => {
    if (!agreementRow?.user_pdf_path) {
      toast.error('User agreement PDF not available yet.');
      return;
    }

    // Validate that required fields are present in the agreement
    const fullName = agreementRow.second_party_name || (agreementRow.filled_fields as any)?.full_name;
    if (!fullName || fullName.trim().length < 2) {
      toast.error('Full name is missing in the agreement. Please contact support.');
      return;
    }

    const url = await createAgreementPdfSignedUrl(agreementRow.user_pdf_path);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const statusBadge = useMemo(() => {
    if (!agreementRow) return null;
    
    switch (agreementRow.status) {
      case 'finalized':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Finalized
          </Badge>
        );
      case 'user_signed':
        return (
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Clock className="mr-1 h-3 w-3" />
            Pending Admin Approval
          </Badge>
        );
      default:
        return <Badge variant="outline">{agreementRow.status}</Badge>;
    }
  }, [agreementRow]);

  if (isLoading || isDynamicLoading || isSettingsLoading || isProfileLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const liveValues = displayVars
    ? [
        { key: '{{first_party_name}}', label: 'Borrower name', value: displayVars.first_party_name },
        { key: '{{second_party_name}}', label: 'Lender name', value: displayVars.second_party_name },
        { key: '{{agreement_day}}', label: 'Agreement day', value: displayVars.agreement_day },
        { key: '{{agreement_month}}', label: 'Agreement month', value: displayVars.agreement_month },
        { key: '{{agreement_year}}', label: 'Agreement year', value: displayVars.agreement_year },
        { key: '{{invested_amount}}', label: 'Investment amount (INR)', value: displayVars.invested_amount },
        { key: '{{invested_amount_words}}', label: 'Amount in words', value: displayVars.invested_amount_words || '(blank)' },
        { key: '{{lender_aadhaar}}', label: 'Lender Aadhaar', value: displayVars.lender_aadhaar || '(blank)' },
        { key: '{{lender_pan}}', label: 'Lender PAN', value: displayVars.lender_pan || '(blank)' },
        { key: '{{nominee}}', label: 'Nominee', value: displayVars.nominee || '(blank)' },
        {
          key: '{{nominee_identification}}',
          label: 'Nominee identification',
          value: displayVars.nominee_identification || '(blank)',
        },
      ]
    : [];

  const amountForUi = agreementRow ? Number(agreementRow.invested_amount ?? 0) : Number(watchedInvestmentAmount || 0);

  const agreementQrUrl = agreementRow
    ? `${window.location.origin}/agreement?ref=${agreementRow.reference_number || agreementRow.id}`
    : '';

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investment Agreement</h1>
          <p className="text-muted-foreground">Fill your details, review the agreement and sign digitally.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {statusBadge}
          {agreementRow && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDownloadPdfWithQr}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF (with QR)
              </Button>
              {agreementRow.user_pdf_path && (
                <Button variant="outline" onClick={downloadUserPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download User PDF
                </Button>
              )}
              {agreementRow.pdf_path && (
                <Button onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Final PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl border bg-background p-2">
              <img
                src={brandLogoUrl}
                alt="Company logo"
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agreement Document
              </CardTitle>
              <CardDescription>
                Values are filled automatically from your profile + latest investment, and update live when data changes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {agreementRow && agreementRow.status === 'finalized' && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200">Agreement Finalized</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your agreement has been finalized with the company signature and stamp. You can download the final PDF from the buttons above.
                {agreementRow.admin_signed_at && (
                  <span className="block mt-1 text-sm">Admin signed on: {format(new Date(agreementRow.admin_signed_at), 'PPP p')}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {agreementRow && agreementRow.status === 'user_signed' && (
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Pending Admin Approval</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                You have signed the agreement. It is now pending admin approval. The admin will review and finalize it with the company signature and stamp.
              </AlertDescription>
            </Alert>
          )}

          {!agreementRow && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-4">
              <Checkbox id="include-qr" checked={includeQr} onCheckedChange={(v) => setIncludeQr(Boolean(v))} />
              <div className="space-y-1">
                <Label htmlFor="include-qr">Include QR code on PDF (public verification)</Label>
                <div className="text-xs text-muted-foreground">
                  Anyone can scan and view non-sensitive agreement details (name, reference, amount, status, hash).
                </div>
              </div>
            </div>
          )}

          {missingDynamicRequirements.length > 0 && !agreementRow && (
            <Alert variant="destructive">
              <AlertTitle>Missing required agreement data</AlertTitle>
              <AlertDescription>
                Please complete the missing items before signing: {missingDynamicRequirements.join(', ')}.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">First Party (Borrower)</div>
                <div className="font-medium">{effectiveDynamicFields.first_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Second Party (Lender)</div>
                <div className="font-medium">{agreementRow?.second_party_name || detailsForm.getValues('full_name') || effectiveDynamicFields.second_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Agreement Date</div>
                <div className="font-medium">{format(new Date(effectiveDynamicFields.investment_date), 'PPP')}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-medium">INR {Number.isFinite(amountForUi) ? amountForUi.toLocaleString('en-IN') : '-'}</div>
              </div>
            </div>
          </div>

          {displayVars && (
            <div className="rounded-md border">
              <div className="border-b bg-muted/30 px-4 py-3">
                <div className="text-sm font-medium">Live placeholder mapping</div>
                <div className="text-xs text-muted-foreground">
                  These placeholders are replaced with the values shown below.
                </div>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[260px]">Placeholder</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveValues.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-mono text-xs">{row.key}</TableCell>
                        <TableCell className="text-sm">{row.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!agreementRow && (
            <>
              <Separator />
              <div className="rounded-md border p-4">
                <div className="mb-3 text-sm font-medium">Your details (auto-filled, edit if needed)</div>
                <Form {...detailsForm}>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
                    <FormField
                      control={detailsForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="contact_number"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Contact number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="email_address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="investment_amount"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Investment amount (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="residential_address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Residential address</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[84px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="aadhaar_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhaar (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="pan_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="nominee_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Nominee (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={detailsForm.control}
                      name="nominee_identification"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Nominee identification (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </>
          )}

          <Separator />

          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line break-words rounded-md border p-4">
            {renderedAgreementTextForDisplay}
          </div>

          {agreementRow ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold">Your Signature:</h3>
                <div className="mt-2 rounded-md border p-4">
                  <img src={agreementRow.signature_data_url} alt="Your signature" className="h-auto max-h-40" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Signed on: {agreementRow.signed_at ? format(new Date(agreementRow.signed_at), 'PPP p') : 'N/A'}
                </p>
              </div>

              <Separator />

              <div className="flex flex-col items-center gap-3 rounded-md border p-6">
                <p className="text-sm font-medium text-muted-foreground">Agreement QR Code</p>
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={agreementQrUrl}
                  size={140}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
                <p className="text-center text-xs text-muted-foreground break-all">
                  {agreementQrUrl}
                </p>
                <p className="text-xs text-muted-foreground">
                  QR Date: {agreementRow.signed_at ? format(new Date(agreementRow.signed_at), 'PPP') : 'N/A'}
                </p>
                <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium">Please Sign in the Box Below</label>
                <SignaturePad ref={sigCanvas} />
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => void handleSaveSignature()}
                  disabled={mutation.isPending || missingDynamicRequirements.length > 0}
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Agreement & Submit
                </Button>
                <Button variant="outline" onClick={clearSignature}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default Agreement;
