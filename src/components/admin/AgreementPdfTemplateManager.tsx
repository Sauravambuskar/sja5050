import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/lib/supabase";
import { SystemSettings } from "@/types/database";
import { inspectPdfFormFields } from "@/lib/agreementPdfTemplate";

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from("system_settings").select("*").single();
  if (error) throw error;
  return data;
};

const updateSettings = async (params: { agreement_pdf_template_url: string; agreement_pdf_field_map: any }) => {
  const { agreement_pdf_template_url, agreement_pdf_field_map } = params;
  const { error } = await supabase
    .from("system_settings")
    .update({ agreement_pdf_template_url, agreement_pdf_field_map })
    .eq("id", 1);
  if (error) throw error;
};

export function AgreementPdfTemplateManager() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ["systemSettings"], queryFn: fetchSettings });

  const [templateUrl, setTemplateUrl] = useState<string>(settings?.agreement_pdf_template_url || "/agreement-templates/PGS_2.pdf");
  const [fieldMapText, setFieldMapText] = useState<string>(
    JSON.stringify(settings?.agreement_pdf_field_map || {}, null, 2)
  );

  const effectiveTemplateUrl = useMemo(
    () => (templateUrl || settings?.agreement_pdf_template_url || "/agreement-templates/PGS_2.pdf").trim(),
    [templateUrl, settings?.agreement_pdf_template_url]
  );

  const fieldsQuery = useQuery({
    queryKey: ["agreementPdfTemplateFields", effectiveTemplateUrl],
    enabled: !!effectiveTemplateUrl,
    queryFn: () => inspectPdfFormFields(effectiveTemplateUrl),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let map: any;
      try {
        map = JSON.parse(fieldMapText || "{}");
      } catch {
        throw new Error("Field map must be valid JSON.");
      }
      await updateSettings({ agreement_pdf_template_url: effectiveTemplateUrl, agreement_pdf_field_map: map });
    },
    onSuccess: () => {
      toast.success("PDF template settings saved.");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Keep inputs in sync after initial load
  useMemo(() => {
    if (!settings) return;
    setTemplateUrl(settings.agreement_pdf_template_url || "/agreement-templates/PGS_2.pdf");
    setFieldMapText(JSON.stringify(settings.agreement_pdf_field_map || {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.agreement_pdf_template_url]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agreement PDF Template</CardTitle>
        <CardDescription>
          Uses the uploaded PDF as the canonical legal document. Only blank placeholders (PDF form fields) are filled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Template URL</Label>
              <Input value={templateUrl} onChange={(e) => setTemplateUrl(e.target.value)} placeholder="/agreement-templates/PGS_2.pdf" />
              <p className="text-xs text-muted-foreground">
                Default: <code>/agreement-templates/PGS_2.pdf</code>
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Field map (JSON)</Label>
              <textarea
                value={fieldMapText}
                onChange={(e) => setFieldMapText(e.target.value)}
                className="min-h-[220px] w-full rounded-md border bg-background p-2 font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Map your keys to the PDF’s form field names. Example:
                <code className="ml-2">{"{\n  \"full_name\": \"FULL_NAME\",\n  \"user_signature\": \"SIGNATURE\"\n}"}</code>
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Save PDF Template Settings
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Detected PDF form fields</div>
              {fieldsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Scanning template…</div>
              ) : fieldsQuery.isError ? (
                <div className="text-sm text-destructive">Failed to scan fields.</div>
              ) : (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  {(fieldsQuery.data || []).length === 0 ? (
                    <div>No form fields found in this PDF (it may be a scanned/static PDF).</div>
                  ) : (
                    <ul className="list-disc pl-5">
                      {fieldsQuery.data!.map((f) => (
                        <li key={f.name}>
                          <span className="font-mono">{f.name}</span> <span className="text-muted-foreground">({f.type})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Template preview</div>
              <div className="aspect-[3/4] w-full overflow-hidden rounded-md border bg-background">
                <iframe title="Agreement template" src={effectiveTemplateUrl} className="h-full w-full" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
