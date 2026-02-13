import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad from '@/components/profile/SignaturePad';
import SignatureCanvas from 'react-signature-canvas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import { Download, FileText, Gavel, Loader2, ShieldCheck, TrendingUp, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Separator } from '@/components/ui/separator';

const FALLBACK_AGREEMENT_TEXT = `
This Investment Agreement ("Agreement") is made and entered into on this day by and between SJA Foundation ("the Company") and the undersigned user ("the Investor").

1.  **Investment:** The Investor agrees to invest funds into the plans offered by the Company. The Company agrees to manage these funds according to the terms of the selected investment plan.
2.  **Returns:** The Company will pay returns to the Investor as per the rates and schedule specified in the chosen investment plan. Returns are not guaranteed and are subject to market risks.
3.  **Term:** The investment term shall be as specified in the selected plan. Early withdrawal may be subject to penalties as outlined in the plan details.
4.  **Risks:** The Investor acknowledges that all investments carry risk, and the value of investments can go down as well as up. The Investor has read and understood the risks associated with the investment.
5.  **Confidentiality:** Both parties agree to keep all non-public information confidential.
6.  **Governing Law:** This Agreement shall be governed by the laws of the jurisdiction in which the Company is registered.

By signing below, the Investor acknowledges that they have read, understood, and agree to be bound by the terms and conditions of this Agreement.
`;

// Uses the global app logo configured by admin (system_settings.login_page_logo_url)
const FALLBACK_LOGO_URL = 'https://i.ibb.co/Jjq5fZbM/sja-pnggg.png';

const fetchAgreement = async (userId: string) => {
  const { data, error } = await supabase
    .from('investment_agreements')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const saveAgreement = async ({
  userId,
  signatureDataUrl,
  agreementText,
}: {
  userId: string;
  signatureDataUrl: string;
  agreementText: string;
}) => {
  const { error } = await supabase.from('investment_agreements').upsert({
    user_id: userId,
    signature_data_url: signatureDataUrl,
    agreement_text: agreementText,
  });
  if (error) throw error;
};

const Agreement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const { settings } = useSystemSettings();

  const agreementText =
    (settings?.investment_agreement_text && settings.investment_agreement_text.trim()) ||
    FALLBACK_AGREEMENT_TEXT;

  const brandLogoUrl = settings?.login_page_logo_url || FALLBACK_LOGO_URL;

  const highlights = [
    {
      icon: TrendingUp,
      title: 'Investment & Returns',
      desc: 'Returns depend on the selected plan and are subject to market risks.',
    },
    {
      icon: CalendarDays,
      title: 'Term & Withdrawals',
      desc: 'Term is based on the plan. Early withdrawal may include penalties.',
    },
    {
      icon: ShieldCheck,
      title: 'Confidentiality',
      desc: 'Both parties agree to keep non-public information confidential.',
    },
    {
      icon: Gavel,
      title: 'Legally Binding',
      desc: 'By signing, you confirm you read and accepted the agreement terms.',
    },
  ];

  const { data: signedAgreement, isLoading } = useQuery({
    queryKey: ['investmentAgreement', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

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
    if (sigCanvas.current?.isEmpty()) {
      toast.error('Please provide your signature.');
      return;
    }
    const signatureDataUrl = sigCanvas.current?.toDataURL('image/png') ?? '';
    mutation.mutate({ userId: user.id, signatureDataUrl, agreementText });
  };

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

  const handleDownloadPdf = async () => {
    if (!signedAgreement || !user) {
      toast.error('Agreement data not available.');
      return;
    }

    const primary = { r: 37, g: 99, b: 235 }; // blue-600
    const muted = { r: 241, g: 245, b: 249 }; // slate-100
    const border = { r: 226, g: 232, b: 240 }; // slate-200

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const addHeader = async (pageTitle: string) => {
      // Header bar
      doc.setFillColor(primary.r, primary.g, primary.b);
      doc.rect(0, 0, pageWidth, 24, 'F');

      // Logo (best-effort)
      const logoDataUrl = await loadImageAsDataUrl(brandLogoUrl);
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', margin, 5, 18, 14);
        } catch {
          // ignore logo failures
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(pageTitle, pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(9);
      doc.text('SJA Foundation', pageWidth - margin, 15, { align: 'right' });

      // Reset
      doc.setTextColor(17, 24, 39);
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, margin, pageHeight - 8);
      doc.setTextColor(17, 24, 39);
    };

    await addHeader('Investment Agreement');

    // Content starts after header
    let y = 30;

    // Summary box
    doc.setDrawColor(border.r, border.g, border.b);
    doc.setFillColor(muted.r, muted.g, muted.b);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Agreement Summary', margin + 4, y + 8);

    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    const clientName = (user.user_metadata.full_name as string | undefined) || user.email || 'Client';
    const signedAt = signedAgreement.signed_at ? format(new Date(signedAgreement.signed_at), 'PPP p') : 'N/A';

    doc.text(`Client: ${clientName}`, margin + 4, y + 15);
    doc.text(`Email: ${user.email || 'N/A'}`, margin + 4, y + 20);
    doc.text(`Signed at: ${signedAt}`, margin + 4, y + 25);

    // Highlights (2 columns)
    y += 36;
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Points', margin, y);

    y += 4;
    const colGap = 6;
    const colW = (pageWidth - margin * 2 - colGap) / 2;
    const boxH = 14;

    highlights.forEach((h, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = margin + col * (colW + colGap);
      const yy = y + row * (boxH + 4);

      doc.setDrawColor(border.r, border.g, border.b);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, yy, colW, boxH, 2, 2, 'FD');

      doc.setFontSize(9.5);
      doc.setTextColor(37, 99, 235);
      doc.text(h.title, x + 3, yy + 5);

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const descLines = doc.splitTextToSize(h.desc, colW - 6);
      doc.text(descLines, x + 3, yy + 9);
    });

    y += 2 * (boxH + 4) + 8;

    // Agreement body
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Full Agreement', margin, y);
    y += 6;

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    const textLines = doc.splitTextToSize(signedAgreement.agreement_text, pageWidth - margin * 2);
    const lineH = 5;

    const ensureSpace = async (requiredHeight: number) => {
      if (y + requiredHeight <= pageHeight - 18) return;
      doc.addPage();
      await addHeader('Investment Agreement');
      y = 30;
    };

    for (const line of textLines) {
      await ensureSpace(lineH);
      doc.text(String(line), margin, y);
      y += lineH;
    }

    // Signature section
    y += 4;
    await ensureSpace(55);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Signature', margin, y);
    y += 6;

    doc.setDrawColor(border.r, border.g, border.b);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 2, 2, 'FD');

    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Investor Signature:', margin + 4, y + 8);

    try {
      doc.addImage(signedAgreement.signature_data_url, 'PNG', margin + 4, y + 12, 70, 24);
    } catch {
      doc.setTextColor(148, 163, 184);
      doc.text('(Signature image not available)', margin + 4, y + 20);
      doc.setTextColor(51, 65, 85);
    }

    doc.text(`Signed at: ${signedAt}`, margin + 80, y + 18);

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`SJA_Investment_Agreement_${user.id.substring(0, 8)}.pdf`);
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Investment Bond & Agreement</h1>
          <p className="text-muted-foreground">Please read the terms carefully and sign below to proceed.</p>
        </div>
        {signedAgreement && (
          <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download as PDF
          </Button>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  Digital Investment Agreement
                </CardTitle>
                <CardDescription>This agreement is legally binding upon signature.</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Default highlights section (like the Welcome Letter header/points) */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold">Key highlights</h3>
            <p className="text-sm text-muted-foreground">Quick summary before you sign.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {highlights.map((h) => {
                const Icon = h.icon;
                return (
                  <div key={h.title} className="flex gap-3 rounded-md border bg-background p-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium leading-none">{h.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{h.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {signedAgreement ? (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
                {signedAgreement.agreement_text}
              </div>
              <div>
                <h3 className="font-semibold">Your Signature:</h3>
                <div className="mt-2 rounded-md border p-4">
                  <img src={signedAgreement.signature_data_url} alt="Your signature" className="h-auto max-h-40" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Signed on: {format(new Date(signedAgreement.signed_at), 'PPP p')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
                {agreementText}
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