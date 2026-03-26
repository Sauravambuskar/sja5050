import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, FileCheck2, AlertCircle, CheckCircle, Clock } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { generateAgreementPdf } from "@/lib/agreementPdfTemplate";
import { uploadAgreementPdf, createAgreementPdfSignedUrl } from "@/lib/agreementPdfStorage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

function renderAgreementBody(params: {
  doc: jsPDF;
  text: string;
  startY: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  addHeader: () => void;
}) {
  const { doc, text, startY, margin, pageWidth, pageHeight, addHeader } = params;
  let y = startY;
  const maxWidth = pageWidth - margin * 2;
  const lineH = 5;

  const ensureSpace = (required: number) => {
    if (y + required <= pageHeight - 18) return;
    doc.addPage();
    addHeader();
    y = 30;
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const paragraphs = String(text || "").split(/\n\s*\n/);
  for (const paraRaw of paragraphs) {
    const trimmed = paraRaw.trim();
    if (!trimmed) continue;

    const listMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (listMatch) {
      const num = `${listMatch[1]}.`;
      const content = listMatch[2].replace(/\s+/g, " ").trim();

      const numW = doc.getTextWidth(num + " ");
      const indentX = margin + Math.min(10, Math.max(6, numW));
      const available = pageWidth - margin - indentX;

      const lines = doc.splitTextToSize(content, available);
      ensureSpace(lineH);
      doc.text(num, margin, y);
      doc.text(String(lines[0] ?? ""), indentX, y);
      y += lineH;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(lineH);
        doc.text(String(lines[i]), indentX, y);
        y += lineH;
      }
      y += 1.5;
      continue;
    }

    const cleaned = trimmed.replace(/\n/g, " ").replace(/\s+/g, " ");
    const lines = doc.splitTextToSize(cleaned, maxWidth);
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(String(line), margin, y);
      y += lineH;
    }
    y += 3;
  }

  return y;
}

export function UserAgreementManager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const adminSigCanvas = useRef<SignatureCanvas>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { settings } = useSystemSettings();
  const pdfTemplateUrl = (settings?.agreement_pdf_template_url || "/agreement-templates/PGS_2.pdf").trim();
  const pdfFieldMap = (settings?.agreement_pdf_field_map || {}) as any;

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

  const userPdfUrlQuery = useQuery({
    queryKey: ["agreementPdfSignedUrl", agreement?.user_pdf_path],
    enabled: !!agreement?.user_pdf_path,
    queryFn: async () => createAgreementPdfSignedUrl(agreement!.user_pdf_path!, 60 * 30),
  });

  const statusBadge = useMemo(() => {
    if (!agreement) return <Badge variant="outline">Not signed</Badge>;
    if (agreement.status === "finalized") return (
      <Badge className="bg-green-500 hover:bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Finalized
      </Badge>
    );
    return (
      <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
        <Clock className="mr-1 h-3 w-3" />
        User signed
      </Badge>
    );
  }, [agreement]);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!agreement) throw new Error("User has not signed yet.");
      if (agreement.status === "finalized") throw new Error("Already finalized.");

      if (!assets?.company_signature_path) {
        throw new Error("Please upload company signature in System Management first.");
      }

      if (adminSigCanvas.current?.isEmpty()) {
        throw new Error("Please add admin signature.");
      }

      if (!agreement.filled_fields) {
        throw new Error("Missing filled fields snapshot. Ask the user to re-sign the agreement.");
      }

      setIsFinalizing(true);

      // Fetch assets as data URLs for embedding
      const compSigBlob = await blobFromUrl(companySigUrlQuery.data!);
      const compSigDataUrl = await blobToDataUrl(compSigBlob);

      const adminSigDataUrl = adminSigCanvas.current?.toDataURL("image/png") ?? "";

      let stampDataUrl: string | null = null;
      if (assets?.stamp_path && stampUrlQuery.data) {
        const stampBlob = await blobFromUrl(stampUrlQuery.data);
        stampDataUrl = await blobToDataUrl(stampBlob);
      }

      // Generate final PDF based on the SAME original template and same filled fields
      const { pdfBytes, hash } = await generateAgreementPdf({
        templateUrl: pdfTemplateUrl,
        fieldMap: pdfFieldMap,
        textValues: agreement.filled_fields as any,
        images: {
          user_signature: { dataUrl: agreement.signature_data_url },
          company_signature: { dataUrl: compSigDataUrl },
          admin_signature: { dataUrl: adminSigDataUrl },
          ...(stampDataUrl ? { stamp: { dataUrl: stampDataUrl } } : {}),
        },
      });

      const finalPdfPath = await uploadAgreementPdf({
        userId,
        agreementId: agreement.id,
        kind: "final",
        pdfBytes,
      });

      // Update agreement metadata (server-side validated)
      const { error } = await supabase
        .from("investment_agreements")
        .update({
          status: "finalized",
          admin_signed_at: new Date().toISOString(),
          pdf_path: finalPdfPath,
          company_signature_path: assets.company_signature_path,
          stamp_path: assets.stamp_path,
          document_hash: hash,
        })
        .eq("id", agreement.id);

      if (error) throw error;

      return finalPdfPath;
    },
    onSuccess: () => {
      toast.success("Agreement finalized and PDF stored.");
      queryClient.invalidateQueries({ queryKey: ["userAgreement", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setIsFinalizing(false),
  });

  const downloadFinalPdf = async () => {
    if (!agreement?.pdf_path) {
      toast.error("Final PDF not available yet.");
      return;
    }
    const url = await createAgreementPdfSignedUrl(agreement.pdf_path, 60 * 30);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadUserPdf = async () => {
    if (!agreement?.user_pdf_path) {
      toast.error("User PDF not available yet.");
      return;
    }
    const url = await createAgreementPdfSignedUrl(agreement.user_pdf_path, 60 * 30);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadLegacyPdf = async () => {
    if (!agreement?.pdf_path) {
      toast.error("Stored PDF not available.");
      return;
    }
    const url = await createSignedUrl(SIGNED_AGREEMENTS_BUCKET, agreement.pdf_path, 60 * 30);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isBusy = isLoading || isFinalizing || finalizeMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5" />
          Agreement
        </CardTitle>
        <CardDescription>Finalize the user's agreement with admin signature, company signature, and optional stamp.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge}
          {agreement?.user_pdf_path && (
            <Button variant="outline" size="sm" onClick={() => void downloadUserPdf()}>
              <Download className="mr-2 h-4 w-4" />
              User PDF
            </Button>
          )}
          {agreement?.pdf_path && (
            <Button variant="outline" size="sm" onClick={() => void downloadFinalPdf()}>
              <Download className="mr-2 h-4 w-4" />
              Final PDF
            </Button>
          )}
          {agreement?.pdf_path && (
            <Button variant="ghost" size="sm" onClick={() => void downloadLegacyPdf()}>
              Download (storage)
            </Button>
          )}
        </div>

        <Separator />

        {!agreement ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>User has not signed yet</AlertTitle>
            <AlertDescription>
              The user needs to sign the agreement first before you can finalize it.
            </AlertDescription>
          </Alert>
        ) : agreement.status === "finalized" ? (
          <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Agreement Finalized</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              This agreement has been finalized with admin signature, company signature, and stamp. The final PDF is available for download.
              {agreement.admin_signed_at && (
                <span className="block mt-1 text-sm">Admin signed on: {new Date(agreement.admin_signed_at).toLocaleString()}</span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">Ready for Finalization</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                The user has signed this agreement. Please add your admin signature and finalize it to complete the process.
              </AlertDescription>
            </Alert>

            {!assets?.company_signature_path && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing Company Signature</AlertTitle>
                <AlertDescription>
                                  Please upload the company signature in System Management &gt; Agreement Assets before finalizing agreements.
                                </AlertDescription>
              </Alert>
            )}

            <div>
              <div className="text-sm font-medium">Admin signature</div>
              <div className="mt-2">
                <SignaturePad ref={adminSigCanvas} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => void finalizeMutation.mutateAsync()} disabled={isBusy || !assets?.company_signature_path}>
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalize & Store PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}