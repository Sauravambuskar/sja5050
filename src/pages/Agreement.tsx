import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignaturePad from '@/components/profile/SignaturePad';
import SignatureCanvas from 'react-signature-canvas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

const AGREEMENT_TEXT = `
This Investment Agreement ("Agreement") is made and entered into on this day by and between SJA Foundation ("the Company") and the undersigned user ("the Investor").

1.  **Investment:** The Investor agrees to invest funds into the plans offered by the Company. The Company agrees to manage these funds according to the terms of the selected investment plan.
2.  **Returns:** The Company will pay returns to the Investor as per the rates and schedule specified in the chosen investment plan. Returns are not guaranteed and are subject to market risks.
3.  **Term:** The investment term shall be as specified in the selected plan. Early withdrawal may be subject to penalties as outlined in the plan details.
4.  **Risks:** The Investor acknowledges that all investments carry risk, and the value of investments can go down as well as up. The Investor has read and understood the risks associated with the investment.
5.  **Confidentiality:** Both parties agree to keep all non-public information confidential.
6.  **Governing Law:** This Agreement shall be governed by the laws of the jurisdiction in which the Company is registered.

By signing below, the Investor acknowledges that they have read, understood, and agree to be bound by the terms and conditions of this Agreement.
`;

const fetchAgreement = async (userId: string) => {
  const { data, error } = await supabase
    .from('investment_agreements')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const saveAgreement = async ({ userId, signatureDataUrl }: { userId: string; signatureDataUrl: string }) => {
  const { error } = await supabase.from('investment_agreements').upsert({
    user_id: userId,
    signature_data_url: signatureDataUrl,
    agreement_text: AGREEMENT_TEXT,
  });
  if (error) throw error;
};

const Agreement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const { data: signedAgreement, isLoading } = useQuery({
    queryKey: ['investmentAgreement', user?.id],
    queryFn: () => fetchAgreement(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: saveAgreement,
    onSuccess: () => {
      toast.success("Agreement signed and saved successfully!");
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
      toast.error("Please provide your signature.");
      return;
    }
    const signatureDataUrl = sigCanvas.current?.toDataURL('image/png') ?? '';
    mutation.mutate({ userId: user.id, signatureDataUrl });
  };

  const handleDownloadPdf = () => {
    if (!signedAgreement || !user) {
      toast.error("Agreement data not available.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.setFontSize(20);
    doc.text("Investment Bond & Agreement", pageWidth / 2, 20, { align: 'center' });
    
    // User Info
    doc.setFontSize(10);
    doc.text(`Client: ${user.user_metadata.full_name || user.email}`, margin, 35);
    doc.text(`Date Signed: ${format(new Date(signedAgreement.signed_at), "PPP p")}`, margin, 40);

    // Agreement Text
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(signedAgreement.agreement_text, pageWidth - margin * 2);
    doc.text(splitText, margin, 50);

    // Signature
    const textHeight = doc.getTextDimensions(splitText).h;
    const signatureY = 50 + textHeight + 10;
    doc.setFontSize(12);
    doc.text("Investor Signature:", margin, signatureY);
    doc.addImage(signedAgreement.signature_data_url, 'PNG', margin, signatureY + 2, 80, 40);

    doc.save(`SJA_Investment_Agreement_${user.id.substring(0, 8)}.pdf`);
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
          <CardTitle>Digital Investment Agreement</CardTitle>
          <CardDescription>This agreement is legally binding upon signature.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  Signed on: {format(new Date(signedAgreement.signed_at), "PPP p")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border p-4">
                {AGREEMENT_TEXT}
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
                <Button variant="outline" onClick={clearSignature}>Clear</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default Agreement;