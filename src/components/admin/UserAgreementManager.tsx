import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, FileCheck2 } from "lucide-react";
import jsPDF from "jspdf";
import SignatureCanvas from "react-signature-canvas";

import SignaturePad from "@/components/profile/SignaturePad";
import { InvestmentAgreement } from "@/types/database";
import {
  AGREEMENT_ASSETS_BUCKET,
  SIGNED_AGREEMENTS_BUCKET,
  createSignedUrl,
  fetchAgreementAssets,
  uploadSignedAgreementPdf,
} from "@/lib/agreements";

async function fetchUserAgreement(userId: string): Promise<InvestmentAgreement | null> {
  const { data, error } = await supabase
    .from("investment_agreements")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as InvestmentAgreement) ?? null;
}

async function blobFromUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch image");
  return res.blob();
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

export function UserAgreementManager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const adminSigCanvas = useRef<SignatureCanvas>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { data: assets } = useQuery({
    queryKey: ["agreementAssets"],
    queryFn: fetchAgreementAssets,
  });

  const { data: agreement, isLoading } = useQuery({
    queryKey: ["userAgreement", userId],
    queryFn: () => fetchUserAgreement(userId),
  });

  const stampUrlQuery = useQuery({
    queryKey: ["agreementAssetSignedUrl", "stamp", assets?.stamp_path],
    enabled: !!assets?.stamp_path,
    queryFn: async () => createSignedUrl(AGREEMENT_ASSETS_BUCKET, assets!.stamp_path!, 60 * 30),
  });

  const companySigUrlQuery = useQuery({
    queryKey: ["agreementAssetSignedUrl", "companySig", assets?.company_signature_path],
    enabled: !!assets?.company_signature_path,
    queryFn: async () => createSignedUrl(AGREEMENT_ASSETS_BUCKET, assets!.company_signature_path!, 60 * 30),
  });

  const pdfUrlQuery = useQuery({
    queryKey: ["agreementPdfSignedUrl", agreement?.pdf_path],
    enabled: !!agreement?.pdf_path,
    queryFn: async () => createSignedUrl(SIGNED_AGREEMENTS_BUCKET, agreement!.pdf_path!, 60 * 30),
  });

  const statusBadge = useMemo(() => {
    if (!agreement) return <Badge variant="outline">Not signed</Badge>;
    if (agreement.status === "finalized") return <Badge>Finalized</Badge>;
    return <Badge variant="secondary">User signed</Badge>;
  }, [agreement]);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!agreement) throw new Error("User has not signed yet.");
      if (agreement.status === "finalized") throw new Error("Already finalized.");
      if (!assets?.stamp_path || !assets?.company_signature_path) {
        throw new Error("Please upload stamp and company signature in System Management first.");
      }

      if (adminSigCanvas.current?.isEmpty()) {
        throw new Error("Please add admin signature.");
      }

      setIsFinalizing(true);

      // Fetch assets as data URLs for embedding
      const stampBlob = await blobFromUrl(stampUrlQuery.data!);
      const stampDataUrl = await blobToDataUrl(stampBlob);

      const compSigBlob = await blobFromUrl(companySigUrlQuery.data!);
      const compSigDataUrl = await blobToDataUrl(compSigBlob);

      const adminSigDataUrl = adminSigCanvas.current?.toDataURL("image/png") ?? "";

      // Generate a final PDF (simple and stable)
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      doc.setFontSize(16);
      doc.text("Investment Agreement (Final)", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(10);
      doc.text(`First Party: ${agreement.first_party_name || assets.first_party_name || ""}`,
        margin,
        28
      );
      doc.text(`Second Party: ${agreement.second_party_name || ""}`, margin, 34);
      doc.text(
        `Invested Amount: INR ${(agreement.invested_amount ?? 0).toLocaleString("en-IN")}`,
        margin,
        40
      );

      doc.setFontSize(10);
      const textLines = doc.splitTextToSize(agreement.agreement_text, pageWidth - margin * 2);
      doc.text(textLines, margin, 50);

      // Footer signatures area (page 1)
      const yBase = 250;
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, yBase - 12, pageWidth - margin * 2, 48);

      doc.setFontSize(10);
      doc.text("Investor Signature", margin + 4, yBase - 4);
      try {
        doc.addImage(agreement.signature_data_url, "PNG", margin + 4, yBase, 55, 18);
      } catch {
        // ignore
      }

      doc.text("Company Signature", margin + 70, yBase - 4);
      doc.addImage(compSigDataUrl, "PNG", margin + 70, yBase, 55, 18);

      doc.text("Admin Signature", margin + 136, yBase - 4);
      doc.addImage(adminSigDataUrl, "PNG", margin + 136, yBase, 55, 18);

      // Stamp
      doc.text("Stamp", margin + 4, yBase + 28);
      doc.addImage(stampDataUrl, "PNG", margin + 4, yBase + 30, 30, 18);

      const pdfBlob = doc.output("blob");

      // Upload to signed_agreements
      const pdfPath = await uploadSignedAgreementPdf({
        userId,
        agreementId: agreement.id,
        pdfBlob,
      });

      // Update agreement metadata (server-side validated)
      const { error } = await supabase.rpc("admin_finalize_investment_agreement", {
        p_user_id: userId,
        p_company_signature_path: assets.company_signature_path,
        p_stamp_path: assets.stamp_path,
        p_pdf_path: pdfPath,
      });

      if (error) throw error;

      return pdfPath;
    },
    onSuccess: () => {
      toast.success("Agreement finalized and PDF stored.");
      queryClient.invalidateQueries({ queryKey: ["userAgreement", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setIsFinalizing(false),
  });

  const downloadFinalPdf = async () => {
    if (!pdfUrlQuery.data) {
      toast.error("Final PDF not available yet.");
      return;
    }
    window.open(pdfUrlQuery.data, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>User Agreement</CardTitle>
            <CardDescription>Finalize the user's agreement with admin signature, stamp, and secure PDF storage.</CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !agreement ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            User has not signed the agreement yet.
          </div>
        ) : (
          <>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">First Party</span><span className="font-medium">{agreement.first_party_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Second Party</span><span className="font-medium">{agreement.second_party_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Investment Date</span><span className="font-medium">{agreement.investment_date ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invested Amount</span><span className="font-medium">INR {(agreement.invested_amount ?? 0).toLocaleString('en-IN')}</span></div>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Investor signature</div>
              <div className="rounded-md border bg-background p-3">
                <img src={agreement.signature_data_url} alt="Investor signature" className="max-h-24" />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Admin signature (draw)</div>
              <SignaturePad ref={adminSigCanvas} />
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={() => adminSigCanvas.current?.clear()}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => finalizeMutation.mutate()}
                disabled={finalizeMutation.isPending || isFinalizing}
              >
                {finalizeMutation.isPending || isFinalizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck2 className="mr-2 h-4 w-4" />
                )}
                Finalize & Store PDF
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={downloadFinalPdf}
                disabled={!agreement.pdf_path || pdfUrlQuery.isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Final PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
