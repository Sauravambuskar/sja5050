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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { generateAgreementPdf } from "@/lib/agreementPdfTemplate";
import { uploadAgreementPdf, createAgreementPdfSignedUrl } from "@/lib/agreementPdfStorage";

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

      if (!agreement.filled_fields) {
        throw new Error("Missing filled fields snapshot. Ask the user to re-sign the agreement.");
      }

      setIsFinalizing(true);

      // Fetch assets as data URLs for embedding
      const stampBlob = await blobFromUrl(stampUrlQuery.data!);
      const stampDataUrl = await blobToDataUrl(stampBlob);

      const compSigBlob = await blobFromUrl(companySigUrlQuery.data!);
      const compSigDataUrl = await blobToDataUrl(compSigBlob);

      const adminSigDataUrl = adminSigCanvas.current?.toDataURL("image/png") ?? "";

      // Generate final PDF based on the SAME original template and same filled fields
      const { pdfBytes, hash } = await generateAgreementPdf({
        templateUrl: pdfTemplateUrl,
        fieldMap: pdfFieldMap,
        textValues: agreement.filled_fields as any,
        images: {
          user_signature: { dataUrl: agreement.signature_data_url },
          company_signature: { dataUrl: compSigDataUrl },
          admin_signature: { dataUrl: adminSigDataUrl },
          stamp: { dataUrl: stampDataUrl },
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
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !agreement ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            User has not signed the agreement yet.
          </div>
        ) : (
          <>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-medium">{agreement.reference_number || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">First Party</span><span className="font-medium">{agreement.first_party_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Second Party</span><span className="font-medium">{agreement.second_party_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Investment Date</span><span className="font-medium">{agreement.investment_date ?? 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invested Amount</span><span className="font-medium">INR {(agreement.invested_amount ?? 0).toLocaleString('en-IN')}</span></div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={downloadUserPdf} disabled={!agreement.user_pdf_path || userPdfUrlQuery.isLoading}>
                <Download className="mr-2 h-4 w-4" />
                Download User PDF
              </Button>
              <Button type="button" variant="outline" onClick={downloadFinalPdf} disabled={!agreement.pdf_path}>
                <Download className="mr-2 h-4 w-4" />
                Download Final PDF
              </Button>
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium mb-2">Agreement text (stored snapshot)</div>
              <div className="rounded-md border bg-background">
                <ScrollArea className="h-64 p-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                    {agreement.agreement_text}
                  </div>
                </ScrollArea>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The PDF template is the official legal document; this text snapshot is kept for audit/history.
              </p>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}