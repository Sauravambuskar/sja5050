import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad from '@/components/profile/SignaturePad';
import SignatureCanvas from 'react-signature-canvas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import { Download, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { Separator } from '@/components/ui/separator';
import { fetchMyAgreementDynamicFields } from '@/lib/agreements';
import { InvestmentAgreement } from '@/types/database';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { generateAgreementPdf } from '@/lib/agreementPdfTemplate';
import { uploadAgreementPdf, createAgreementPdfSignedUrl } from '@/lib/agreementPdfStorage';
import { useProfile } from '@/hooks/useProfile';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

const userDetailsSchema = z.object({
  full_name: z.string().min(2, 'Full name is required.'),
  residential_address: z.string().min(5, 'Address is required.'),
  contact_number: z.string().min(8, 'Contact number is required.'),
  email_address: z.string().email('Valid email is required.').optional().or(z.literal('')),
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

  const { error } = await supabase.from('investment_agreements').upsert({
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
  });
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

  const { settings, isLoading: isSettingsLoading } = useSystemSettings();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  const { data: dynamicFields, isLoading: isDynamicLoading } = useQuery({
    queryKey: ['agreementDynamicFields', user?.id],
    queryFn: fetchMyAgreementDynamicFields,
    enabled: !!user,
  });

  const { data: agreementRow, isLoading } = useQuery({
    queryKey: ['investmentAgreement', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

  const brandLogoUrl = settings?.login_page_logo_url || FALLBACK_LOGO_URL;
  const templateText = (settings?.investment_agreement_text || '').trim() || FALLBACK_TEMPLATE;

  const detailsForm = useForm<UserDetailsFormValues>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      full_name: '',
      residential_address: '',
      contact_number: '',
      email_address: user?.email || '',
      aadhaar_number: '',
      pan_number: '',
      nominee_name: '',
      nominee_identification: '',
    },
  });

  useEffect(() => {
    if (agreementRow) return; // don't override if already signed
    detailsForm.reset({
      full_name: String(profile?.full_name || dynamicFields?.second_party_name || '').trim(),
      residential_address: String(profile?.address || '').trim(),
      contact_number: String(profile?.phone || '').trim(),
      email_address: user?.email || '',
      aadhaar_number: String(profile?.aadhaar_number || '').trim(),
      pan_number: String(profile?.pan_number || '').trim(),
      nominee_name: '',
      nominee_identification: '',
    });
  }, [agreementRow, detailsForm, profile, dynamicFields?.second_party_name, user?.email]);

  const watchedFullName = detailsForm.watch('full_name');

  const vars = useMemo(() => {
    if (!dynamicFields) return null;
    const secondPartyName = String(agreementRow?.second_party_name || watchedFullName || dynamicFields.second_party_name || '').trim();

    return {
      first_party_name: dynamicFields.first_party_name,
      second_party_name: secondPartyName,
      agreement_date: format(new Date(dynamicFields.investment_date), 'PPP'),
      invested_amount: dynamicFields.invested_amount.toLocaleString('en-IN'),
    };
  }, [dynamicFields, agreementRow?.second_party_name, watchedFullName]);

  const renderedAgreementText = useMemo(() => {
    if (!vars) return templateText;
    return renderTemplate(templateText, vars);
  }, [templateText, vars]);

  const pdfTemplateUrl = (settings?.agreement_pdf_template_url || '/agreement-templates/PGS_2.pdf').trim();
  const pdfFieldMap = (settings?.agreement_pdf_field_map || {}) as any;

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

  const handleSaveSignature = async () => {
    if (!user) return;
    if (!dynamicFields) {
      toast.error('Agreement details are still loading. Please try again.');
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

      organization_name: 'SJA Foundation (Sariputra Wankhade Foundation)',
      authorized_signatory_name: dynamicFields.first_party_name,
      agreement_execution_date: format(new Date(), 'PPP'),
      unique_agreement_reference_number: referenceNumber,
      registered_office_address: '',
      official_contact_details: '',
    };

    // Generate user-signed PDF from the original template (no clause modifications)
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
      });
      pdfBytes = out.pdfBytes;
      hash = out.hash;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate agreement PDF.');
      return;
    }

    // We need an agreement id to store PDFs under a stable path.
    let agreementId = agreementRow?.id;
    if (!agreementId) {
      const { data, error } = await supabase
        .from('investment_agreements')
        .insert({
          user_id: user.id,
          agreement_text: renderedAgreementText,
          signature_data_url: signatureDataUrl,
          first_party_name: dynamicFields.first_party_name,
          second_party_name: details.full_name,
          investment_date: dynamicFields.investment_date,
          invested_amount: dynamicFields.invested_amount,
          user_investment_id: dynamicFields.user_investment_id,
          status: 'user_signed',
        })
        .select('id')
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      agreementId = (data as any).id;
    }

    let userPdfPath = '';
    try {
      userPdfPath = await uploadAgreementPdf({ userId: user.id, agreementId, kind: 'user', pdfBytes });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload agreement PDF.');
      return;
    }

    mutation.mutate({
      userId: user.id,
      signatureDataUrl,
      agreementText: renderedAgreementText,
      firstPartyName: dynamicFields.first_party_name,
      secondPartyName: details.full_name,
      investmentDate: dynamicFields.investment_date,
      investedAmount: dynamicFields.invested_amount,
      userInvestmentId: dynamicFields.user_investment_id,
      filledFields,
      referenceNumber,
      documentHash: hash,
      userPdfPath,
    });
  };

  const handleDownloadPdf = async () => {
    if (!agreementRow || !user) {
      toast.error('Agreement data not available.');
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
    doc.text(`Second Party: ${agreementRow.second_party_name || user.email || ''}`, margin + 4, y + 22);
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

    y = await renderAgreementBody(agreementRow.agreement_text, y);

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
    const url = await createAgreementPdfSignedUrl(agreementRow.user_pdf_path);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading || isDynamicLoading || isSettingsLoading || isProfileLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investment Agreement</h1>
          <p className="text-muted-foreground">Fill your details, review the agreement and sign digitally.</p>
        </div>
        {agreementRow && (
          <div className="flex flex-wrap gap-2">
            {agreementRow.user_pdf_path && (
              <Button variant="outline" onClick={downloadUserPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download User PDF
              </Button>
            )}
            <Button onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download as PDF
            </Button>
          </div>
        )}
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
                Users only fill their details — the system automatically generates a clean, professional agreement PDF.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">First Party (Borrower)</div>
                <div className="font-medium">{dynamicFields?.first_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Second Party (Lender)</div>
                <div className="font-medium">{agreementRow?.second_party_name || detailsForm.getValues('full_name') || dynamicFields?.second_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Agreement Date</div>
                <div className="font-medium">{dynamicFields ? format(new Date(dynamicFields.investment_date), 'PPP') : ''}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-medium">INR {dynamicFields?.invested_amount.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

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

          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
            {agreementRow ? agreementRow.agreement_text : renderedAgreementText}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Official PDF template preview</div>
            <div className="aspect-[3/4] w-full overflow-hidden rounded-md border bg-background">
              <iframe title="Agreement PDF template" src={pdfTemplateUrl} className="h-full w-full" />
            </div>
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
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium">Please Sign in the Box Below</label>
                <SignaturePad ref={sigCanvas} />
              </div>
              <div className="flex gap-4">
                <Button onClick={() => void handleSaveSignature()} disabled={mutation.isPending}>
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