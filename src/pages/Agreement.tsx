import { useMemo, useRef } from 'react';
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
  });
  if (error) throw error;
};

const Agreement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const { settings, isLoading: isSettingsLoading } = useSystemSettings();

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

  const vars = useMemo(() => {
    if (!dynamicFields) return null;
    return {
      first_party_name: dynamicFields.first_party_name,
      second_party_name: dynamicFields.second_party_name,
      agreement_date: format(new Date(dynamicFields.investment_date), 'PPP'),
      invested_amount: dynamicFields.invested_amount.toLocaleString('en-IN'),
    };
  }, [dynamicFields]);

  const renderedAgreementText = useMemo(() => {
    if (!vars) return templateText;
    return renderTemplate(templateText, vars);
  }, [templateText, vars]);

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

  const handleSaveSignature = () => {
    if (!user) return;
    if (!dynamicFields) {
      toast.error('Agreement details are still loading. Please try again.');
      return;
    }

    if (sigCanvas.current?.isEmpty()) {
      toast.error('Please provide your signature.');
      return;
    }

    const signatureDataUrl = sigCanvas.current?.toDataURL('image/png') ?? '';

    mutation.mutate({
      userId: user.id,
      signatureDataUrl,
      agreementText: renderedAgreementText,
      firstPartyName: dynamicFields.first_party_name,
      secondPartyName: dynamicFields.second_party_name,
      investmentDate: dynamicFields.investment_date,
      investedAmount: dynamicFields.invested_amount,
      userInvestmentId: dynamicFields.user_investment_id,
    });
  };

  const handleDownloadPdf = async () => {
    if (!agreementRow || !user) {
      toast.error('Agreement data not available.');
      return;
    }

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
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        });
        return dataUrl;
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

      const paragraphs = String(text || '').split(/\n\s*\n/);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);

      for (const paraRaw of paragraphs) {
        const para = paraRaw.replace(/\s+$/g, '');
        const trimmed = para.trim();
        if (!trimmed) continue;

        const listMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (listMatch) {
          const num = `${listMatch[1]}.`;
          const content = listMatch[2].replace(/\s+/g, ' ').trim();

          const numW = doc.getTextWidth(num + ' ');
          const indentX = margin + Math.min(10, Math.max(6, numW));
          const available = pageWidth - margin - indentX;

          const lines = doc.splitTextToSize(content, available);
          y = await ensureSpace(y, lineH);
          doc.text(num, margin, y);
          doc.text(String(lines[0] ?? ''), indentX, y);
          y += lineH;

          for (let i = 1; i < lines.length; i++) {
            y = await ensureSpace(y, lineH);
            doc.text(String(lines[i]), indentX, y);
            y += lineH;
          }
          y += 1.5;
          continue;
        }

        const cleaned = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const lines = doc.splitTextToSize(cleaned, maxWidth);
        for (const line of lines) {
          y = await ensureSpace(y, lineH);
          doc.text(String(line), margin, y);
          y += lineH;
        }
        y += 3;
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

  if (isLoading || isDynamicLoading || isSettingsLoading) {
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
          <p className="text-muted-foreground">Review the agreement and sign digitally.</p>
        </div>
        {agreementRow && (
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download as PDF
          </Button>
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
                This document is dynamically generated using your current investment date and invested amount.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">First Party</div>
                <div className="font-medium">{dynamicFields?.first_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Second Party</div>
                <div className="font-medium">{dynamicFields?.second_party_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Agreement Date</div>
                <div className="font-medium">{dynamicFields ? format(new Date(dynamicFields.investment_date), 'PPP') : ''}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Invested Amount</div>
                <div className="font-medium">INR {dynamicFields?.invested_amount.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <Separator />

          {agreementRow ? (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
                {agreementRow.agreement_text}
              </div>
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
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
                {renderedAgreementText}
              </div>
              <div>
                <label className="text-sm font-medium">Please Sign in the Box Below</label>
                <SignaturePad ref={sigCanvas} />
              </div>
              <div className="flex gap-4">
                <Button onClick={handleSaveSignature} disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign & Submit Agreement
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